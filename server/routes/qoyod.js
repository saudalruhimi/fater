import { Router } from 'express'
import * as qoyod from '../services/qoyod.js'
import { supabase } from '../services/supabase.js'

const router = Router()

// POST /api/qoyod/push — send matched invoice to Qoyod as a bill
router.post('/push', async (req, res) => {
  try {
    const { vendor_id, vendor_name, invoice_number, invoice_date, due_date, inventory_id, items } = req.body

    if (!vendor_id) {
      return res.status(400).json({ error: 'المورد مطلوب — اختره من القائمة' })
    }
    if (!items?.length) {
      return res.status(400).json({ error: 'بيانات الفاتورة ناقصة' })
    }

    const contactId = vendor_id
    console.log('Pushing bill — vendor_id:', contactId, 'vendor_name:', vendor_name, 'items:', items.length)

    // 2. Create bill
    const isInclusive = req.body.is_inclusive ?? false
    console.log('is_inclusive:', isInclusive)

    const line_items = items.map((item) => ({
      product_id: item.product_id,
      description: item.description || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_percent: item.tax_percent ?? 15,
      is_inclusive: isInclusive,
    }))

    const bill = await qoyod.createBill({
      contact_id: contactId,
      status: 'Approved',
      issue_date: invoice_date,
      due_date: due_date || invoice_date,
      reference: invoice_number,
      inventory_id,
      line_items,
    })

    // 3. Save to Supabase
    const billId = bill?.bill?.id || bill?.id || null
    await supabase.from('processed_invoices').insert({
      vendor_name,
      invoice_number,
      invoice_date,
      total_amount: items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0),
      vat_amount: items.reduce((sum, i) => sum + (i.quantity * i.unit_price * (i.tax_percent || 15) / 100), 0),
      matched_data: { items },
      qoyod_bill_id: billId,
      status: billId ? 'pushed' : 'error',
    })

    res.json({ success: true, bill })
  } catch (e) {
    console.error('Push error:', e)
    res.status(500).json({ error: e.message || 'فشل في الإرسال لقيود' })
  }
})

// GET /api/qoyod/products
router.get('/products', async (req, res) => {
  try {
    const products = await qoyod.getProducts()
    res.json({ success: true, products })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/qoyod/vendors
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await qoyod.getVendors()
    res.json({ success: true, vendors })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/qoyod/vendors — create vendor
router.post('/vendors', async (req, res) => {
  try {
    const result = await qoyod.createVendor(req.body)
    res.json({ success: true, vendor: result.contact || result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/qoyod/vendors/:id — update vendor
router.put('/vendors/:id', async (req, res) => {
  try {
    const { updateVendor } = qoyod
    const result = await updateVendor(req.params.id, req.body)
    res.json({ success: true, vendor: result.contact || result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/qoyod/vendors/:id — delete vendor
router.delete('/vendors/:id', async (req, res) => {
  try {
    const { deleteVendor } = qoyod
    await deleteVendor(req.params.id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/qoyod/accounts
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await qoyod.getAccounts()
    res.json({ success: true, accounts })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/qoyod/bill-payments
router.get('/bill-payments', async (req, res) => {
  try {
    const payments = await qoyod.getBillPayments()
    res.json({ success: true, payments })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/qoyod/bill-payments
router.post('/bill-payments', async (req, res) => {
  try {
    const result = await qoyod.createBillPayment(req.body)
    res.json({ success: true, payment: result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/qoyod/inventories
router.get('/inventories', async (req, res) => {
  try {
    const inventories = await qoyod.getInventories()
    res.json({ success: true, inventories })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/qoyod/test — test connection with full info
router.get('/test', async (req, res) => {
  try {
    const testResult = await qoyod.testConnection()
    if (!testResult.connected) {
      return res.json(testResult)
    }

    const [products, vendors, inventories] = await Promise.all([
      qoyod.getProducts(),
      qoyod.getVendors(),
      qoyod.getInventories(),
    ])
    res.json({
      ...testResult,
      products_count: products.length,
      vendors_count: Array.isArray(vendors) ? vendors.length : 0,
      inventories_count: Array.isArray(inventories) ? inventories.length : 0,
    })
  } catch (e) {
    res.json({ connected: false, error: e.message })
  }
})

// POST /api/qoyod/update-key — save API key to Supabase
router.post('/update-key', async (req, res) => {
  try {
    const { api_key } = req.body

    // Save to Supabase (empty string = remove key)
    await qoyod.saveApiKey(api_key?.trim() || null)

    if (!api_key?.trim()) {
      return res.json({ success: true, connected: false })
    }

    // Test the new key
    const testRes = await fetch('https://api.qoyod.com/2.0/products', {
      headers: { 'API-KEY': api_key.trim() }
    })

    res.json({ success: true, connected: testRes.ok })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
