import { supabase } from './supabase.js'

const BASE_URL = 'https://api.qoyod.com/2.0'

/* ─────────────── In-memory caches ───────────────
   Every Qoyod call used to start with a Supabase round-trip just to read the API
   key, and reference data (products, vendors, accounts, inventories) was refetched
   from Qoyod on every page visit. Both are cached here with a TTL and invalidated
   explicitly on write, so a stale list can never outlive an edit.
   Caches are per-process: a serverless cold start simply repopulates them.        */

const KEY_TTL = 60 * 1000
const REF_TTL = 5 * 60 * 1000
// Bills move whenever anything is paid, so they get a much shorter leash than
// reference data — plus explicit invalidation on every write that touches them.
const TTL = { bills: 45 * 1000 }

let keyCache = { value: null, at: 0 }
const refCache = new Map()

function cacheGet(name) {
  const hit = refCache.get(name)
  if (hit && Date.now() - hit.at < (TTL[name] ?? REF_TTL)) return hit.value
  return undefined
}

function cacheSet(name, value) {
  refCache.set(name, { value, at: Date.now() })
  return value
}

export function invalidateCache(...names) {
  if (!names.length) refCache.clear()
  else names.forEach((n) => refCache.delete(n))
}

// Get API key from Supabase user_settings (cached — it changes only from settings)
async function getApiKey() {
  if (keyCache.value && Date.now() - keyCache.at < KEY_TTL) return keyCache.value
  const { data } = await supabase
    .from('user_settings')
    .select('qoyod_api_key')
    .limit(1)
    .single()
  keyCache = { value: data?.qoyod_api_key || null, at: Date.now() }
  return keyCache.value
}

// Save API key to Supabase
export async function saveApiKey(key) {
  keyCache = { value: null, at: 0 }
  invalidateCache()
  // Check if settings row exists
  const { data: existing } = await supabase
    .from('user_settings')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    await supabase
      .from('user_settings')
      .update({ qoyod_api_key: key, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('user_settings')
      .insert({ qoyod_api_key: key })
  }
}

async function request(method, path, body = null) {
  const apiKey = await getApiKey()
  if (!apiKey) throw new Error('مفتاح API غير مُعد — أضفه من الإعدادات')

  const opts = {
    method,
    headers: { 'API-KEY': apiKey, 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE_URL}${path}`, opts)
  const data = await res.json()

  if (!res.ok) {
    console.error('Qoyod API Error:', res.status, JSON.stringify(data, null, 2))
    const msg = data?.message || data?.error || data?.errors || JSON.stringify(data)
    throw new Error(`Qoyod API ${res.status}: ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`)
  }

  return data
}

// Products
export async function getProducts() {
  const cached = cacheGet('products')
  if (cached) return cached
  const data = await request('GET', '/products')
  const products = data.products || data
  return cacheSet('products', products.map((p) => ({ ...p, name: p.name_ar || p.name_en || p.name || '' })))
}

// Vendors
export async function getVendors() {
  const cached = cacheGet('vendors')
  if (cached) return cached
  const data = await request('GET', '/vendors')
  return cacheSet('vendors', data.contacts || data.vendors || data)
}

export async function createVendor({ name, organization, email, phone_number, tax_number }) {
  invalidateCache('vendors')
  return request('POST', '/vendors', {
    contact: { name, organization, email, phone_number, tax_number },
  })
}

export async function updateVendor(id, { name, organization, email, phone_number, tax_number, status }) {
  invalidateCache('vendors')
  const contact = {}
  if (name !== undefined) contact.name = name
  if (organization !== undefined) contact.organization = organization
  if (email !== undefined) contact.email = email
  if (phone_number !== undefined) contact.phone_number = phone_number
  if (tax_number !== undefined) contact.tax_number = tax_number
  if (status !== undefined) contact.status = status
  return request('PUT', `/vendors/${id}`, { contact })
}

export async function deleteVendor(id) {
  invalidateCache('vendors')
  return request('DELETE', `/vendors/${id}`)
}

// Find next available BILL-N reference by scanning Qoyod bills.
// Filtering by reference prefix server-side turns a full 1,300-bill sweep into a
// couple of pages. Sorting can't help: `reference desc` is a string sort, so
// BILL99 would outrank BILL348 and hand back an already-used number — the numeric
// max below is what keeps the result correct.
export async function getNextBillNumber({ prefix = 'BILL', maxPages = 15 } = {}) {
  let max = 0
  const re = new RegExp(`^${prefix}(\\d+)$`, 'i')
  const bills = await fetchAllPages(
    `/bills?q[reference_start]=${encodeURIComponent(prefix)}`, 'bills', maxPages
  )
  for (const b of bills) {
    const m = String(b.reference || '').match(re)
    if (m) {
      const n = parseInt(m[1], 10)
      if (!isNaN(n) && n > max) max = n
    }
  }
  return { prefix, last: max, next: max + 1, suggested: `${prefix}${max + 1}` }
}

// Bills
export async function createBill({ contact_id, status, issue_date, due_date, reference, inventory_id, line_items }) {
  invalidateCache('bills')
  const result = await request('POST', '/bills', {
    bill: { contact_id, status: status || 'Draft', issue_date, due_date, reference, inventory_id, line_items },
  })
  console.log('Bill created:', result?.bill?.contact?.name, '| ID:', result?.bill?.id)
  return result
}

// Accounts
export async function getAccounts() {
  const cached = cacheGet('accounts')
  if (cached) return cached
  const data = await request('GET', '/accounts')
  const accounts = data.accounts || data
  return cacheSet('accounts', accounts.map((a) => ({ ...a, name: a.name_ar || a.name_en || '' })))
}

const PAGE_SIZE = 100
// Measured: Qoyod serves concurrent page requests fine (3 in parallel returned in
// the time of the slowest), so pages go out in waves rather than one at a time.
const PAGE_BATCH = 6

// Fetch every page of a paginated Qoyod collection. Pages were previously walked
// one at a time — up to 30 sequential round-trips before the page could render.
// Now they go out in batches, stopping as soon as a short page proves the end.
async function fetchAllPages(path, key, maxPages) {
  const sep = path.includes('?') ? '&' : '?'
  const page = async (p) => {
    try {
      const data = await request('GET', `${path}${sep}page=${p}`)
      return data[key] || []
    } catch {
      return null   // a failed/empty page marks the end of the collection
    }
  }

  // Probe page 1 alone: most accounts fit on one page, and that case should cost
  // exactly one request rather than waiting on a whole speculative batch.
  const first = await page(1)
  if (!first) return []
  const all = [...first]
  if (first.length < PAGE_SIZE) return all

  for (let start = 2; start <= maxPages; start += PAGE_BATCH) {
    const batch = []
    for (let p = start; p < start + PAGE_BATCH && p <= maxPages; p++) batch.push(p)
    const results = await Promise.all(batch.map(page))

    let done = false
    for (const rows of results) {
      if (rows === null) { done = true; break }
      all.push(...rows)
      if (rows.length < PAGE_SIZE) { done = true; break }
    }
    if (done) break
  }
  return all
}

// Statuses that still owe money. Qoyod filters server-side with Ransack params,
// which matters enormously here: this account holds ~1,300 bills of which ~1,200
// are already Paid. Fetching every page just to discard 92% of it cost a dozen
// round-trips; asking for the unpaid ones costs one or two.
const UNPAID_STATUSES = ['Approved', 'Partially Paid', 'Overdue']

// Bills — unpaid only (Approved / Partially Paid / Overdue)
export async function getBills() {
  const cached = cacheGet('bills')
  if (cached) return cached

  const query = UNPAID_STATUSES.map((s) => `q[status_in][]=${encodeURIComponent(s)}`).join('&')
  const all = await fetchAllPages(`/bills?${query}`, 'bills', 30)

  // Safety net: if the server-side filter is ever ignored, drop settled bills here
  // rather than showing them as payable.
  const EXCLUDE = new Set(['Paid', 'Returned', 'Refunded', 'Draft', 'Cancelled', 'paid', 'returned', 'refunded', 'draft', 'cancelled'])
  return cacheSet('bills', all.filter(b => !EXCLUDE.has(b.status)))
}

// Bill Payments
export async function getBillPayments() {
  const data = await request('GET', '/bill_payments')
  return data.bill_payments || data
}

export async function createBillPayment({ bill_id, amount, date, account_id, reference, description }) {
  invalidateCache('bills')
  return request('POST', '/bill_payments', {
    bill_payment: { bill_id, account_id, amount, date, reference, description },
  })
}

export async function updateBillPayment(id, { amount, date, account_id, reference, description }) {
  invalidateCache('bills')
  const bill_payment = {}
  if (amount !== undefined) bill_payment.amount = amount
  if (date !== undefined) bill_payment.date = date
  if (account_id !== undefined) bill_payment.account_id = account_id
  if (reference !== undefined) bill_payment.reference = reference
  if (description !== undefined) bill_payment.description = description
  return request('PUT', `/bill_payments/${id}`, { bill_payment })
}

export async function deleteBillPayment(id) {
  invalidateCache('bills')
  return request('DELETE', `/bill_payments/${id}`)
}

// Inventories
export async function getInventories() {
  const cached = cacheGet('inventories')
  if (cached) return cached
  const data = await request('GET', '/inventories')
  return cacheSet('inventories', data.inventories || data)
}

// Test connection
export async function testConnection() {
  const apiKey = await getApiKey()
  if (!apiKey) return { connected: false, error: 'مفتاح API غير مُعد' }

  try {
    const res = await fetch(`${BASE_URL}/products`, {
      headers: { 'API-KEY': apiKey, 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`Qoyod API ${res.status}`)
    return { connected: true, api_key_masked: '•••' + apiKey.slice(-6), api_key_full: apiKey }
  } catch (e) {
    return { connected: false, error: e.message }
  }
}
