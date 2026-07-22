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

    // Qoyod's `discount` on line_items is a PERCENTAGE (0-100). When the UI sends
    // a money discount (`discount_type: 'amount'`), convert it; otherwise pass-through.
    const line_items = items.map((item) => {
      const qty = Number(item.quantity) || 0
      const unit = Number(item.unit_price) || 0
      const disc = Number(item.discount) || 0
      const dtype = item.discount_type === 'percent' ? 'percent' : 'amount'
      let discountPct = 0
      if (disc > 0) {
        if (dtype === 'percent') {
          discountPct = disc
        } else {
          const gross = qty * unit
          discountPct = gross > 0 ? Math.round((disc / gross) * 1000000) / 10000 : 0
        }
      }
      return {
        product_id: item.product_id,
        description: item.description || '',
        quantity: qty,
        unit_price: unit,
        tax_percent: item.tax_percent ?? 15,
        is_inclusive: isInclusive,
        discount: Math.min(Math.max(discountPct, 0), 100),
      }
    })

    const bill = await qoyod.createBill({
      contact_id: contactId,
      status: 'Approved',
      issue_date: invoice_date,
      due_date: due_date || invoice_date,
      reference: invoice_number,
      inventory_id,
      line_items,
    })

    // 3. Save to Supabase — use the original money-amount discount from request items
    const billId = bill?.bill?.id || bill?.id || null
    const subtotal = items.reduce((sum, i) => {
      const qty = Number(i.quantity) || 0
      const unit = Number(i.unit_price) || 0
      const disc = Number(i.discount) || 0
      const dtype = i.discount_type === 'percent' ? 'percent' : 'amount'
      const gross = qty * unit
      const lineExcl = dtype === 'percent' ? gross * (1 - disc / 100) : gross - disc
      return sum + lineExcl
    }, 0)
    await supabase.from('processed_invoices').insert({
      vendor_name,
      invoice_number,
      invoice_date,
      total_amount: subtotal,
      vat_amount: subtotal * 0.15,
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

// GET /api/qoyod/bills — unpaid (Approved) bills from Qoyod
router.get('/bills', async (req, res) => {
  try {
    const bills = await qoyod.getBills()
    res.json({ success: true, bills })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/qoyod/products
// GET /api/qoyod/next-bill-number — find next available BILL-N reference from Qoyod
router.get('/next-bill-number', async (req, res) => {
  try {
    const prefix = req.query.prefix || 'BILL'
    const result = await qoyod.getNextBillNumber({ prefix })
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

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

// POST /api/qoyod/bill-payments — create in Qoyod, then log to sent_vouchers
router.post('/bill-payments', async (req, res) => {
  try {
    const { bill_id, account_id, amount, date, reference, description, vendor_name, invoice_number, account_name } = req.body
    const result = await qoyod.createBillPayment({ bill_id, account_id, amount, date, reference, description })
    const receiptId = result?.receipt?.id || result?.id || null

    // Log to Supabase — best-effort, never fail the payment over a logging error
    try {
      await supabase.from('sent_vouchers').insert({
        qoyod_receipt_id: receiptId,
        bill_id, vendor_name, invoice_number,
        amount, payment_date: date, account_id, account_name, reference,
      })
    } catch (logErr) {
      console.error('sent_vouchers log failed:', logErr.message)
    }

    res.json({ success: true, payment: result, receipt_id: receiptId })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/qoyod/bill-payments/:id — update in Qoyod, then sync sent_vouchers
router.put('/bill-payments/:id', async (req, res) => {
  try {
    const { amount, date, account_id, reference, description, account_name } = req.body
    const result = await qoyod.updateBillPayment(req.params.id, { amount, date, account_id, reference, description })

    try {
      const patch = {}
      if (amount !== undefined) patch.amount = amount
      if (date !== undefined) patch.payment_date = date
      if (account_id !== undefined) patch.account_id = account_id
      if (account_name !== undefined) patch.account_name = account_name
      if (reference !== undefined) patch.reference = reference
      await supabase.from('sent_vouchers').update(patch).eq('qoyod_receipt_id', req.params.id)
    } catch (syncErr) {
      console.error('sent_vouchers sync failed:', syncErr.message)
    }

    res.json({ success: true, payment: result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/qoyod/bill-payments/:id — delete from Qoyod, then remove from sent_vouchers
router.delete('/bill-payments/:id', async (req, res) => {
  try {
    await qoyod.deleteBillPayment(req.params.id)
    try {
      await supabase.from('sent_vouchers').delete().eq('qoyod_receipt_id', req.params.id)
    } catch (syncErr) {
      console.error('sent_vouchers delete-sync failed:', syncErr.message)
    }
    res.json({ success: true })
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
