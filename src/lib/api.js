import { callGeminiWithRetry } from './gemini'
import { prepareForUpload } from './imagePrep'

const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api'

async function request(method, path, body = null) {
  const opts = { method, headers: {} }

  if (body instanceof FormData) {
    opts.body = body
  } else if (body) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  const res = await fetch(`${API_URL}${path}`, opts)
  let data
  try { data = await res.json() } catch { data = {} }

  if (!res.ok) {
    const err = new Error(data.error || 'حدث خطأ')
    err.status = res.status
    // Preserve status code in message so retry wrapper can detect
    if (res.status === 429 && !err.message.includes('429')) err.message = `429: ${err.message}`
    if (res.status === 503 && !err.message.includes('503')) err.message = `503: ${err.message}`
    throw err
  }
  return data
}

// Scan (Gemini-backed) — wrapped with retry.
// Oversized photos are shrunk first so the request fits the serverless payload cap.
export async function scanInvoice(file, retryOpts = {}) {
  const upload = await prepareForUpload(file)
  return callGeminiWithRetry(() => {
    const formData = new FormData()
    formData.append('image', upload)
    return request('POST', '/scan', formData)
  }, retryOpts)
}

// Match (Gemini-backed for AI fallback) — wrapped with retry
export function matchItems(items, vendor_name, retryOpts = {}) {
  return callGeminiWithRetry(() => request('POST', '/match', { items, vendor_name }), retryOpts)
}

// Reconcile two account statements
export async function reconcileStatements(ours, theirs) {
  const [a, b] = await Promise.all([prepareForUpload(ours), prepareForUpload(theirs)])
  const fd = new FormData()
  fd.append('ours', a)
  fd.append('theirs', b)
  return request('POST', '/reconcile', fd)
}

// Push to Qoyod
export function pushToQoyod(invoiceData) {
  return request('POST', '/qoyod/push', invoiceData)
}

// Qoyod data
export function getProducts() { return request('GET', '/qoyod/products') }
export function getVendors() { return request('GET', '/qoyod/vendors') }
export function getInventories() { return request('GET', '/qoyod/inventories') }
export function testQoyodConnection() { return request('GET', '/qoyod/test') }
export function updateQoyodKey(api_key) { return request('POST', '/qoyod/update-key', { api_key }) }
export function getNextBillNumber(prefix = 'BILL') { return request('GET', `/qoyod/next-bill-number?prefix=${encodeURIComponent(prefix)}`) }

// Accounts & Bill Payments
export function getAccounts() { return request('GET', '/qoyod/accounts') }
export function getBills({ refresh = false } = {}) {
  return request('GET', `/qoyod/bills${refresh ? '?refresh=1' : ''}`)
}
export function getBillPayments() { return request('GET', '/qoyod/bill-payments') }
export function createBillPayment(data) { return request('POST', '/qoyod/bill-payments', data) }
export function updateBillPayment(id, data) { return request('PUT', `/qoyod/bill-payments/${id}`, data) }
export function deleteBillPayment(id) { return request('DELETE', `/qoyod/bill-payments/${id}`) }

// Vendors CRUD
export function createVendor(data) { return request('POST', '/qoyod/vendors', data) }
export function updateVendor(id, data) { return request('PUT', `/qoyod/vendors/${id}`, data) }
export function deleteVendor(id) { return request('DELETE', `/qoyod/vendors/${id}`) }

// Mappings (items)
export function getMappings() { return request('GET', '/mappings') }
export function createMapping(data) { return request('POST', '/mappings', data) }
export function updateMapping(id, data) { return request('PUT', `/mappings/${id}`, data) }
export function deleteMapping(id) { return request('DELETE', `/mappings/${id}`) }

// Vendor Mappings
export function getVendorMappings() { return request('GET', '/vendor-mappings') }
export function createVendorMapping(data) { return request('POST', '/vendor-mappings', data) }
export function updateVendorMapping(id, data) { return request('PUT', `/vendor-mappings/${id}`, data) }
export function deleteVendorMapping(id) { return request('DELETE', `/vendor-mappings/${id}`) }

// Admin: users
export function adminListUsers() { return request('GET', '/admin/users') }
export function adminCreateUser(data) { return request('POST', '/admin/users', data) }
export function adminUpdateUser(id, data) { return request('PUT', `/admin/users/${id}`, data) }
export function adminDeleteUser(id) { return request('DELETE', `/admin/users/${id}`) }

// Admin: roles + permissions
export function adminListRoles() { return request('GET', '/admin/roles') }
export function adminCreateRole(data) { return request('POST', '/admin/roles', data) }
export function adminUpdateRole(key, data) { return request('PUT', `/admin/roles/${key}`, data) }
export function adminDeleteRole(key) { return request('DELETE', `/admin/roles/${key}`) }
