import { supabase } from './supabase.js'

const BASE_URL = 'https://api.qoyod.com/2.0'

// Get API key from Supabase user_settings
async function getApiKey() {
  const { data } = await supabase
    .from('user_settings')
    .select('qoyod_api_key')
    .limit(1)
    .single()
  return data?.qoyod_api_key || null
}

// Save API key to Supabase
export async function saveApiKey(key) {
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
  const data = await request('GET', '/products')
  const products = data.products || data
  return products.map((p) => ({ ...p, name: p.name_ar || p.name_en || p.name || '' }))
}

// Vendors
export async function getVendors() {
  const data = await request('GET', '/vendors')
  return data.contacts || data.vendors || data
}

export async function createVendor({ name, organization, email, phone_number, tax_number }) {
  return request('POST', '/vendors', {
    contact: { name, organization, email, phone_number, tax_number },
  })
}

export async function updateVendor(id, { name, organization, email, phone_number, tax_number, status }) {
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
  return request('DELETE', `/vendors/${id}`)
}

// Bills
export async function createBill({ contact_id, status, issue_date, due_date, reference, inventory_id, line_items }) {
  const result = await request('POST', '/bills', {
    bill: { contact_id, status: status || 'Draft', issue_date, due_date, reference, inventory_id, line_items },
  })
  console.log('Bill created:', result?.bill?.contact?.name, '| ID:', result?.bill?.id)
  return result
}

// Accounts
export async function getAccounts() {
  const data = await request('GET', '/accounts')
  const accounts = data.accounts || data
  return accounts.map((a) => ({ ...a, name: a.name_ar || a.name_en || '' }))
}

// Bill Payments
export async function getBillPayments() {
  const data = await request('GET', '/bill_payments')
  return data.bill_payments || data
}

export async function createBillPayment({ bill_id, amount, date, account_id, reference, description }) {
  return request('POST', '/bill_payments', {
    bill_payment: { bill_id, account_id, amount, date, reference, description },
  })
}

// Inventories
export async function getInventories() {
  const data = await request('GET', '/inventories')
  return data.inventories || data
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
