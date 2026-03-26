import express from 'express'
import serverless from 'serverless-http'
import cors from 'cors'
import multer from 'multer'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
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

// ============ Telegram Bot ============
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`
const ALLOWED_USERS = (process.env.TELEGRAM_ALLOWED_USERS || '').split(',').map(s => s.trim()).filter(Boolean)

function isAllowed(userId) {
  if (!ALLOWED_USERS.length) return true
  return ALLOWED_USERS.includes(String(userId))
}

async function tgSend(chatId, text, opts = {}) {
  await fetch(`${TG_API}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...opts }) })
}

async function tgTyping(chatId) {
  await fetch(`${TG_API}/sendChatAction`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, action: 'typing' }) })
}

async function tgGetFile(fileId) {
  const r = await fetch(`${TG_API}/getFile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: fileId }) })
  const d = await r.json()
  if (!d.ok) throw new Error('Failed to get file')
  const fr = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${d.result.file_path}`)
  return { buffer: Buffer.from(await fr.arrayBuffer()), path: d.result.file_path }
}

// Agent tools
const agentTools = [{
  functionDeclarations: [
    { name: 'search_invoices', description: 'ابحث عن فواتير مشتريات بمعايير مختلفة', parameters: { type: SchemaType.OBJECT, properties: { vendor_name: { type: SchemaType.STRING }, invoice_number: { type: SchemaType.STRING }, month: { type: SchemaType.STRING }, min_amount: { type: SchemaType.NUMBER }, max_amount: { type: SchemaType.NUMBER } } } },
    { name: 'get_vendor_info', description: 'جلب معلومات مورد معين', parameters: { type: SchemaType.OBJECT, properties: { vendor_name: { type: SchemaType.STRING } }, required: ['vendor_name'] } },
    { name: 'get_monthly_summary', description: 'ملخص المشتريات لشهر معين', parameters: { type: SchemaType.OBJECT, properties: { month: { type: SchemaType.STRING } }, required: ['month'] } },
    { name: 'create_bill', description: 'إنشاء فاتورة مشتريات - يحتاج تأكيد', parameters: { type: SchemaType.OBJECT, properties: { vendor_name: { type: SchemaType.STRING }, invoice_number: { type: SchemaType.STRING }, invoice_date: { type: SchemaType.STRING }, total_amount: { type: SchemaType.NUMBER }, items: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { description: { type: SchemaType.STRING }, quantity: { type: SchemaType.NUMBER }, unit_price: { type: SchemaType.NUMBER } } } } }, required: ['vendor_name', 'items'] } },
    { name: 'create_payment', description: 'إنشاء سند صرف - يحتاج تأكيد', parameters: { type: SchemaType.OBJECT, properties: { vendor_name: { type: SchemaType.STRING }, amount: { type: SchemaType.NUMBER }, account_name: { type: SchemaType.STRING }, date: { type: SchemaType.STRING } }, required: ['vendor_name', 'amount'] } },
    { name: 'scan_invoice_image', description: 'قراءة صورة فاتورة', parameters: { type: SchemaType.OBJECT, properties: { action: { type: SchemaType.STRING } } } },
  ]
}]

// Agent tool execution
async function executeAgentTool(name, args) {
  switch (name) {
    case 'search_invoices': {
      let q = supabase.from('processed_invoices').select('*').order('created_at', { ascending: false }).limit(50)
      const { data: invoices } = await q
      let filtered = invoices || []
      if (args.vendor_name) filtered = filtered.filter(i => (i.vendor_name || '').toLowerCase().includes(args.vendor_name.toLowerCase()))
      if (args.invoice_number) filtered = filtered.filter(i => (i.invoice_number || '').includes(args.invoice_number))
      if (args.month) filtered = filtered.filter(i => (i.invoice_date || '').startsWith(args.month))
      if (args.min_amount) filtered = filtered.filter(i => Number(i.total_amount || 0) >= args.min_amount)
      if (args.max_amount) filtered = filtered.filter(i => Number(i.total_amount || 0) <= args.max_amount)
      return { count: filtered.length, total: filtered.reduce((s, i) => s + Number(i.total_amount || 0), 0), invoices: filtered.slice(0, 10).map(i => ({ invoice_number: i.invoice_number, vendor_name: i.vendor_name, date: i.invoice_date, amount: i.total_amount, status: i.status })) }
    }
    case 'get_vendor_info': {
      const vd = await qoyodRequest('GET', '/vendors')
      const vendors = vd.contacts || vd.vendors || []
      const s = args.vendor_name.toLowerCase()
      const v = vendors.find(x => (x.name || '').toLowerCase().includes(s) || (x.organization || '').toLowerCase().includes(s))
      if (!v) return { found: false, message: `ما لقيت مورد باسم "${args.vendor_name}"` }
      const { data: invs } = await supabase.from('processed_invoices').select('*').ilike('vendor_name', `%${args.vendor_name}%`).order('created_at', { ascending: false })
      return { found: true, vendor: { id: v.id, name: v.name, organization: v.organization, phone: v.phone_number }, stats: { total_invoices: (invs || []).length, total_amount: (invs || []).reduce((s2, i) => s2 + Number(i.total_amount || 0), 0), last_invoice: invs?.[0] ? { number: invs[0].invoice_number, date: invs[0].invoice_date, amount: invs[0].total_amount } : null } }
    }
    case 'get_monthly_summary': {
      const { data: invs } = await supabase.from('processed_invoices').select('*').gte('invoice_date', `${args.month}-01`).lte('invoice_date', `${args.month}-31`)
      if (!invs?.length) return { month: args.month, count: 0, total: 0, message: 'ما فيه فواتير لهالشهر' }
      const byV = {}
      for (const i of invs) { const vn = i.vendor_name || '?'; if (!byV[vn]) byV[vn] = { count: 0, total: 0 }; byV[vn].count++; byV[vn].total += Number(i.total_amount || 0) }
      const top = Object.entries(byV).sort((a, b) => b[1].total - a[1].total)[0]
      return { month: args.month, count: invs.length, total: invs.reduce((s2, i) => s2 + Number(i.total_amount || 0), 0), top_vendor: top ? { name: top[0], ...top[1] } : null }
    }
    case 'create_bill': return { needs_confirmation: true, action: 'create_bill', data: args }
    case 'create_payment': return { needs_confirmation: true, action: 'create_payment', data: args }
    case 'scan_invoice_image': return { needs_image: true, action: args.action || 'scan_only' }
    default: return { error: 'دالة غير معروفة' }
  }
}

// Execute confirmed action
async function execConfirmed(action, data) {
  if (action === 'create_bill') {
    const vd = await qoyodRequest('GET', '/vendors')
    const vendors = vd.contacts || vd.vendors || []
    const vendor = vendors.find(v => (v.name || '').toLowerCase().includes((data.vendor_name || '').toLowerCase()))
    if (!vendor) throw new Error(`ما لقيت مورد باسم "${data.vendor_name}"`)
    const id = await qoyodRequest('GET', '/inventories')
    const inv = (id.inventories || [])[0]
    if (!inv) throw new Error('ما فيه مخزن بقيود')
    const pd = await qoyodRequest('GET', '/products')
    const prods = (pd.products || []).map(p => ({ ...p, name: p.name_ar || p.name_en || '' }))
    const line_items = []
    for (const item of data.items || []) {
      const ps = (item.description || '').toLowerCase()
      const m = prods.find(p => p.name.toLowerCase().includes(ps) || ps.includes(p.name.toLowerCase()))
      if (!m) throw new Error(`ما لقيت بند بقيود يطابق "${item.description}"`)
      line_items.push({ product_id: m.id, description: item.description, quantity: item.quantity || 1, unit_price: item.unit_price || 0, tax_percent: 15, is_inclusive: true })
    }
    const bill = await qoyodRequest('POST', '/bills', { bill: { contact_id: vendor.id, status: 'Approved', issue_date: data.invoice_date || new Date().toISOString().split('T')[0], due_date: data.invoice_date || new Date().toISOString().split('T')[0], reference: data.invoice_number || '', inventory_id: inv.id, line_items } })
    await supabase.from('processed_invoices').insert({ vendor_name: vendor.name, invoice_number: data.invoice_number, invoice_date: data.invoice_date, total_amount: data.total_amount, qoyod_bill_id: bill?.bill?.id, status: 'pushed' })
    return { success: true, bill_id: bill?.bill?.id, vendor: vendor.name, total: bill?.bill?.total }
  }
  if (action === 'create_payment') {
    const vd = await qoyodRequest('GET', '/vendors')
    const vendors = vd.contacts || vd.vendors || []
    const vendor = vendors.find(v => (v.name || '').toLowerCase().includes((data.vendor_name || '').toLowerCase()))
    if (!vendor) throw new Error(`ما لقيت مورد باسم "${data.vendor_name}"`)
    const ad = await qoyodRequest('GET', '/accounts')
    const accs = (ad.accounts || []).map(a => ({ ...a, name: a.name_ar || a.name_en || '' }))
    const as2 = (data.account_name || 'بنك').toLowerCase()
    const acc = accs.find(a => a.name.toLowerCase().includes(as2) || as2.includes(a.name.toLowerCase()))
    if (!acc) throw new Error('ما لقيت حساب دفع مناسب')
    const payment = await qoyodRequest('POST', '/bill_payments', { bill_payment: { contact_id: vendor.id, account_id: acc.id, amount: data.amount, date: data.date || new Date().toISOString().split('T')[0], description: `سند صرف لـ ${vendor.name}` } })
    return { success: true, payment, vendor: vendor.name, amount: data.amount, account: acc.name }
  }
  throw new Error('إجراء غير معروف')
}

// Chat sessions (in-memory — resets on cold start)
const chatSessions = new Map()
const pendingConfirmations = new Map()

async function agentProcess(userId, text, imageBuffer = null, mimeType = null) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: `أنت "فاتِر" — مساعد محاسبة ذكي لمؤسسة سعودية. تتكلم بالعربي العامي السعودي البسيط.
مهامك: بحث فواتير ومعلومات موردين، قراءة صور فواتير، تسجيل فواتير بقيود، سندات صرف، ملخصات وتقارير.
قواعد: العمليات الحساسة تحتاج تأكيد. رد مختصر ومفيد. المبالغ بالريال السعودي. لو أرسل صورة فاتورة استخدم scan_invoice_image.`,
    tools: agentTools,
  })
  if (!chatSessions.has(userId)) chatSessions.set(userId, model.startChat({ history: [] }))
  const chat = chatSessions.get(userId)
  const parts = []
  if (imageBuffer) { parts.push({ inlineData: { data: imageBuffer.toString('base64'), mimeType } }); parts.push({ text: text || 'اقرأ هالفاتورة واستخرج بياناتها' }) }
  else parts.push({ text })

  let response = await chat.sendMessage(parts)
  let result = response.response
  let loops = 5
  while (result.candidates?.[0]?.content?.parts?.some(p => p.functionCall) && loops-- > 0) {
    const fcs = result.candidates[0].content.parts.filter(p => p.functionCall)
    const frs = []
    for (const fc of fcs) {
      try { const r = await executeAgentTool(fc.functionCall.name, fc.functionCall.args); frs.push({ functionResponse: { name: fc.functionCall.name, response: r } }) }
      catch (e) { frs.push({ functionResponse: { name: fc.functionCall.name, response: { error: e.message } } }) }
    }
    response = await chat.sendMessage(frs)
    result = response.response
  }
  const txt = result.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || 'ما قدرت أفهم طلبك'
  await supabase.from('telegram_chats').insert([{ user_id: String(userId), role: 'user', content: text || '[صورة]' }, { user_id: String(userId), role: 'assistant', content: txt }])
  return txt
}

// Telegram webhook
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    const msg = req.body?.message
    if (!msg) return res.sendStatus(200)
    const chatId = msg.chat.id
    const userId = msg.from?.id || chatId
    const text = msg.text || msg.caption || ''
    const firstName = msg.from?.first_name || ''

    if (!isAllowed(userId)) { await tgSend(chatId, `⛔ عذراً ${firstName}، ما عندك صلاحية.\n\n🆔 رقمك: <code>${userId}</code>\nأرسله للمسؤول.`); return res.sendStatus(200) }

    if (text === '/start') { await tgSend(chatId, `أهلاً ${firstName} 👋\n\nأنا <b>فاتِر</b> — مساعدك المحاسبي.\n\n🆔 رقمك: <code>${userId}</code>\n\nأقدر:\n• 📸 أقرأ فواتير وأسجلها\n• 🔍 أبحث عن فواتير وموردين\n• 📊 أعطيك ملخصات\n• 💳 أسوي سندات صرف\n\nكلمني بالعربي 😊`); return res.sendStatus(200) }
    if (text === '/clear') { chatSessions.delete(userId); await tgSend(chatId, 'تم مسح المحادثة ✨'); return res.sendStatus(200) }
    if (text === '/id') { await tgSend(chatId, `🆔 رقمك: <code>${userId}</code>`); return res.sendStatus(200) }

    // Pending confirmation
    if (pendingConfirmations.has(userId)) {
      const pending = pendingConfirmations.get(userId)
      if (/^(نعم|اي|ايه|اكيد|أكيد|yes|ok|تمام|سجل|سوي|نفذ)$/i.test(text.trim())) {
        pendingConfirmations.delete(userId)
        await tgTyping(chatId)
        try {
          const r = await execConfirmed(pending.action, pending.data)
          if (r.success) {
            if (pending.action === 'create_bill') await tgSend(chatId, `✅ تم تسجيل الفاتورة\n\n📋 رقم: ${r.bill_id}\n🏢 ${r.vendor}\n💰 ${r.total} ر.س`)
            else await tgSend(chatId, `✅ تم سند الصرف\n\n🏢 ${r.vendor}\n💰 ${r.amount} ر.س\n🏦 ${r.account}`)
          }
        } catch (e) { await tgSend(chatId, `❌ ${e.message}`) }
        return res.sendStatus(200)
      }
      if (/^(لا|لأ|الغ|الغي|cancel|no)$/i.test(text.trim())) { pendingConfirmations.delete(userId); await tgSend(chatId, '⏹ تم الإلغاء.'); return res.sendStatus(200) }
      pendingConfirmations.delete(userId)
    }

    await tgTyping(chatId)

    let imageBuffer = null, mimeType = null
    if (msg.photo?.length) { const f = await tgGetFile(msg.photo[msg.photo.length - 1].file_id); imageBuffer = f.buffer; mimeType = 'image/jpeg' }
    else if (msg.document?.mime_type?.startsWith('image/')) { const f = await tgGetFile(msg.document.file_id); imageBuffer = f.buffer; mimeType = msg.document.mime_type }

    const reply = await agentProcess(userId, text, imageBuffer, mimeType)
    if (reply.length > 4000) { const chunks = reply.match(/.{1,4000}/gs) || [reply]; for (const c of chunks) await tgSend(chatId, c) }
    else await tgSend(chatId, reply)

    return res.sendStatus(200)
  } catch (e) {
    console.error('[TG]', e.message)
    const cid = req.body?.message?.chat?.id
    if (cid) await tgSend(cid, `❌ ${e.message}`).catch(() => {})
    return res.sendStatus(200)
  }
})

app.post('/api/telegram/set-webhook', async (req, res) => {
  try {
    const { url } = req.body
    const r = await fetch(`${TG_API}/setWebhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: `${url}/api/telegram/webhook`, allowed_updates: ['message'] }) })
    res.json({ success: true, result: await r.json() })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/telegram/status', (req, res) => res.json({ configured: !!BOT_TOKEN }))

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

export const handler = serverless(app)
