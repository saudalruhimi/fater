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
  const data = await res.json()

  if (!res.ok) throw new Error(data.error || 'حدث خطأ')
  return data
}

// Scan
export function scanInvoice(file) {
  const formData = new FormData()
  formData.append('image', file)
  return request('POST', '/scan', formData)
}

// Match
export function matchItems(items, vendor_name) {
  return request('POST', '/match', { items, vendor_name })
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

// Accounts & Bill Payments
export function getAccounts() { return request('GET', '/qoyod/accounts') }
export function getBillPayments() { return request('GET', '/qoyod/bill-payments') }
export function createBillPayment(data) { return request('POST', '/qoyod/bill-payments', data) }

// Vendors CRUD
export function createVendor(data) { return request('POST', '/qoyod/vendors', data) }
export function updateVendor(id, data) { return request('PUT', `/qoyod/vendors/${id}`, data) }
export function deleteVendor(id) { return request('DELETE', `/qoyod/vendors/${id}`) }

// Mappings
export function getMappings() { return request('GET', '/mappings') }
export function createMapping(data) { return request('POST', '/mappings', data) }
export function updateMapping(id, data) { return request('PUT', `/mappings/${id}`, data) }
export function deleteMapping(id) { return request('DELETE', `/mappings/${id}`) }
