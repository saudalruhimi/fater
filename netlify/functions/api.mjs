import express from 'express'
import serverless from 'serverless-http'
import cors from 'cors'
import multer from 'multer'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '20mb' }))

// ============ Supabase ============
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// ============ Qoyod Helpers ============
const QOYOD_URL = 'https://api.qoyod.com/2.0'

async function getQoyodKey() {
  const { data } = await supabase.from('user_settings').select('qoyod_api_key').limit(1).single()
  return data?.qoyod_api_key || null
}

async function qoyodRequest(method, path, body = null) {
  const key = await getQoyodKey()
  if (!key) throw new Error('مفتاح API غير مُعد — أضفه من الإعدادات')
  const opts = { method, headers: { 'API-KEY': key, 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${QOYOD_URL}${path}`, opts)
  const data = await res.json()
  if (!res.ok) throw new Error(`Qoyod API ${res.status}: ${data?.message || data?.error || JSON.stringify(data)}`)
  return data
}

async function getProducts() {
  const data = await qoyodRequest('GET', '/products')
  return (data.products || []).map(p => ({ ...p, name: p.name_ar || p.name_en || '' }))
}

async function getVendors() {
  const data = await qoyodRequest('GET', '/vendors')
  return data.contacts || data.vendors || []
}

// ============ Gemini ============
const SCAN_PROMPT = `أنت نظام متخصص في قراءة الفواتير العربية. حلل صورة الفاتورة هذه واستخرج البيانات التالية بصيغة JSON فقط بدون أي نص إضافي:

{
  "vendor_name": "اسم المورد/الشركة",
  "invoice_number": "رقم الفاتورة",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD أو null",
  "items": [
    {
      "description": "وصف البند كما هو مكتوب بالفاتورة",
      "quantity": 0,
      "unit_price": 0.00,
      "total": 0.00
    }
  ],
  "subtotal": 0.00,
  "vat_rate": 15,
  "vat_amount": 0.00,
  "total_amount": 0.00,
  "is_inclusive": false,
  "notes": ""
}

مهم:
- اكتب أسماء البنود كما هي مكتوبة بالفاتورة بالضبط
- المبالغ بالريال السعودي، التاريخ بصيغة YYYY-MM-DD
- ابحث عن الإجمالي النهائي شامل الضريبة = total_amount
- ابحث عن مبلغ الضريبة = vat_amount
- subtotal = total_amount - vat_amount
- لكل بند: total = إجمالي البند كما بالفاتورة, unit_price = total / quantity
- تجاهل أعمدة الخصم ونسبة الضريبة
- is_inclusive: لو مجموع البنود = total_amount فـ true، لو = subtotal فـ false`

// ============ Matcher ============
function normalize(text) {
  return text.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim().toLowerCase()
}

function levenshtein(a, b) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = a[i-1] === b[j-1] ? m[i-1][j-1] : 1 + Math.min(m[i-1][j], m[i][j-1], m[i-1][j-1])
  return m[a.length][b.length]
}

// ============ Routes ============

// POST /api/scan
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
app.post('/api/scan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'لم يتم رفع صورة' })
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent([SCAN_PROMPT, { inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } }])
    const text = result.response.text()
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('لم يتمكن من استخراج بيانات الفاتورة')
    const data = JSON.parse(jsonMatch[1] || jsonMatch[0])

    await supabase.from('processed_invoices').insert({
      vendor_name: data.vendor_name, invoice_number: data.invoice_number, invoice_date: data.invoice_date,
      total_amount: data.total_amount, vat_amount: data.vat_amount, extracted_data: data, status: 'scanned',
    })

    res.json({ success: true, data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/match
app.post('/api/match', async (req, res) => {
  try {
    const { items, vendor_name } = req.body
    if (!items?.length) return res.status(400).json({ error: 'البنود مطلوبة' })

    const products = await getProducts()
    const { data: mappings } = await supabase.from('item_mappings').select('*')
    const results = []

    for (const item of items) {
      const desc = normalize(item.description)

      // 1. Exact mapping
      const exact = (mappings || []).find(m => normalize(m.vendor_item_name) === desc)
      if (exact) { results.push({ ...item, match_type: 'exact', matched_product_id: exact.qoyod_product_id, matched_product_name: exact.qoyod_product_name, confidence: 1 }); continue }

      // 2. Fuzzy mapping
      const fuzzyM = (mappings || []).find(m => levenshtein(normalize(m.vendor_item_name), desc) < 5)
      if (fuzzyM) { results.push({ ...item, match_type: 'fuzzy_mapping', matched_product_id: fuzzyM.qoyod_product_id, matched_product_name: fuzzyM.qoyod_product_name, confidence: 0.85 }); continue }

      // 3. Fuzzy product
      let best = null, bestD = Infinity
      for (const p of products) { const d = levenshtein(normalize(p.name), desc); if (d < bestD) { bestD = d; best = p } }
      if (best && bestD < 8) { results.push({ ...item, match_type: 'fuzzy_product', matched_product_id: best.id, matched_product_name: best.name, confidence: Math.max(0.5, 1 - bestD/20) }); continue }

      // 4. AI match
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
        const prompt = `عندي بند "${item.description}" من مورد "${vendor_name}". وعندي هالبنود:\n${products.map(p=>`${p.id}: ${p.name}`).join('\n')}\nوش أقرب بند؟ رجع JSON فقط: {"product_id": 0, "product_name": "", "confidence": 0.0}`
        const r = await model.generateContent(prompt)
        const t = r.response.text()
        const jm = t.match(/```json\s*([\s\S]*?)```/) || t.match(/\{[\s\S]*\}/)
        if (jm) {
          const ai = JSON.parse(jm[1] || jm[0])
          if (ai.product_id) { results.push({ ...item, match_type: 'ai', matched_product_id: ai.product_id, matched_product_name: ai.product_name, confidence: ai.confidence || 0.6 }); continue }
        }
      } catch {}

      results.push({ ...item, match_type: 'unmatched', matched_product_id: null, matched_product_name: null, confidence: 0 })
    }

    res.json({ success: true, items: results, products })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/qoyod/push
app.post('/api/qoyod/push', async (req, res) => {
  try {
    const { vendor_id, vendor_name, invoice_number, invoice_date, due_date, inventory_id, items, is_inclusive } = req.body
    if (!vendor_id) return res.status(400).json({ error: 'المورد مطلوب' })
    if (!items?.length) return res.status(400).json({ error: 'بيانات الفاتورة ناقصة' })

    const line_items = items.map(i => ({ product_id: i.product_id, description: i.description || '', quantity: i.quantity, unit_price: i.unit_price, tax_percent: i.tax_percent ?? 15, is_inclusive: is_inclusive ?? false }))
    const bill = await qoyodRequest('POST', '/bills', { bill: { contact_id: vendor_id, status: 'Approved', issue_date: invoice_date, due_date: due_date || invoice_date, reference: invoice_number, inventory_id, line_items } })

    const billId = bill?.bill?.id || null
    await supabase.from('processed_invoices').insert({
      vendor_name, invoice_number, invoice_date,
      total_amount: items.reduce((s, i) => s + (i.quantity * i.unit_price), 0),
      matched_data: { items }, qoyod_bill_id: billId, status: billId ? 'pushed' : 'error',
    })

    res.json({ success: true, bill })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/qoyod/products
app.get('/api/qoyod/products', async (req, res) => {
  try { res.json({ success: true, products: await getProducts() }) } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/qoyod/vendors
app.get('/api/qoyod/vendors', async (req, res) => {
  try { res.json({ success: true, vendors: await getVendors() }) } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/qoyod/vendors
app.post('/api/qoyod/vendors', async (req, res) => {
  try { const r = await qoyodRequest('POST', '/vendors', { contact: req.body }); res.json({ success: true, vendor: r.contact || r }) } catch (e) { res.status(500).json({ error: e.message }) }
})

// PUT /api/qoyod/vendors/:id
app.put('/api/qoyod/vendors/:id', async (req, res) => {
  try { const r = await qoyodRequest('PUT', `/vendors/${req.params.id}`, { contact: req.body }); res.json({ success: true, vendor: r.contact || r }) } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/qoyod/vendors/:id
app.delete('/api/qoyod/vendors/:id', async (req, res) => {
  try { await qoyodRequest('DELETE', `/vendors/${req.params.id}`); res.json({ success: true }) } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/qoyod/inventories
app.get('/api/qoyod/inventories', async (req, res) => {
  try { const d = await qoyodRequest('GET', '/inventories'); res.json({ success: true, inventories: d.inventories || d }) } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/qoyod/accounts
app.get('/api/qoyod/accounts', async (req, res) => {
  try { const d = await qoyodRequest('GET', '/accounts'); res.json({ success: true, accounts: (d.accounts || []).map(a => ({ ...a, name: a.name_ar || a.name_en || '' })) }) } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/qoyod/bill-payments
app.get('/api/qoyod/bill-payments', async (req, res) => {
  try { const d = await qoyodRequest('GET', '/bill_payments'); res.json({ success: true, payments: d.receipts || d.bill_payments || d }) } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/qoyod/bill-payments
app.post('/api/qoyod/bill-payments', async (req, res) => {
  try { const r = await qoyodRequest('POST', '/bill_payments', { bill_payment: req.body }); res.json({ success: true, payment: r }) } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/qoyod/test
app.get('/api/qoyod/test', async (req, res) => {
  try {
    const key = await getQoyodKey()
    if (!key) return res.json({ connected: false, error: 'مفتاح API غير مُعد' })
    const testRes = await fetch(`${QOYOD_URL}/products`, { headers: { 'API-KEY': key } })
    if (!testRes.ok) return res.json({ connected: false, error: `Qoyod API ${testRes.status}` })
    const [products, vendors, inventories] = await Promise.all([getProducts(), getVendors(), qoyodRequest('GET', '/inventories')])
    res.json({ connected: true, products_count: products.length, vendors_count: vendors.length, inventories_count: (inventories.inventories || []).length, api_key_masked: '•••' + key.slice(-6), api_key_full: key })
  } catch (e) { res.json({ connected: false, error: e.message }) }
})

// POST /api/qoyod/update-key
app.post('/api/qoyod/update-key', async (req, res) => {
  try {
    const { api_key } = req.body
    const { data: existing } = await supabase.from('user_settings').select('id').limit(1).single()
    if (existing) await supabase.from('user_settings').update({ qoyod_api_key: api_key?.trim() || null, updated_at: new Date().toISOString() }).eq('id', existing.id)
    else await supabase.from('user_settings').insert({ qoyod_api_key: api_key?.trim() || null })
    if (!api_key?.trim()) return res.json({ success: true, connected: false })
    const testRes = await fetch(`${QOYOD_URL}/products`, { headers: { 'API-KEY': api_key.trim() } })
    res.json({ success: true, connected: testRes.ok })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// CRUD /api/mappings
app.get('/api/mappings', async (req, res) => {
  try { const { data } = await supabase.from('item_mappings').select('*').order('times_used', { ascending: false }); res.json({ success: true, mappings: data || [] }) } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/mappings', async (req, res) => {
  try {
    const { vendor_item_name, qoyod_product_id, qoyod_product_name, vendor_name } = req.body
    if (!vendor_item_name || !qoyod_product_id) return res.status(400).json({ error: 'بيانات ناقصة' })
    const { data: existing } = await supabase.from('item_mappings').select('*').eq('vendor_item_name', vendor_item_name).eq('qoyod_product_id', qoyod_product_id).single()
    if (existing) {
      const { data } = await supabase.from('item_mappings').update({ times_used: (existing.times_used || 1) + 1, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single()
      return res.json({ success: true, mapping: data, updated: true })
    }
    const { data } = await supabase.from('item_mappings').insert({ vendor_item_name, qoyod_product_id, qoyod_product_name, vendor_name: vendor_name || '' }).select().single()
    res.json({ success: true, mapping: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/mappings/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() }
    const { data } = await supabase.from('item_mappings').update(updates).eq('id', req.params.id).select().single()
    res.json({ success: true, mapping: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/mappings/:id', async (req, res) => {
  try { await supabase.from('item_mappings').delete().eq('id', req.params.id); res.json({ success: true }) } catch (e) { res.status(500).json({ error: e.message }) }
})

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

export const handler = serverless(app)
