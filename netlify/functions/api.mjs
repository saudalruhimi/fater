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

// ============ Smart Matching ============

// Find best vendor match (exact → fuzzy → partial word)
async function smartFindVendor(name) {
  const vd = await qoyodRequest('GET', '/vendors')
  const vendors = vd.contacts || vd.vendors || []
  if (!vendors.length) throw new Error('ما فيه موردين بقيود')
  const search = normalize(name)

  // 1. Exact match
  const exact = vendors.find(v => normalize(v.name) === search)
  if (exact) return exact

  // 2. Includes match
  const includes = vendors.find(v => normalize(v.name).includes(search) || search.includes(normalize(v.name)))
  if (includes) return includes

  // 3. Word overlap — count matching words
  const searchWords = search.split(/\s+/).filter(w => w.length > 2)
  let bestVendor = null, bestScore = 0
  for (const v of vendors) {
    const vName = normalize(v.name + ' ' + (v.organization || ''))
    let score = 0
    for (const w of searchWords) {
      if (vName.includes(w)) score++
    }
    if (score > bestScore) { bestScore = score; bestVendor = v }
  }
  if (bestVendor && bestScore >= 1) return bestVendor

  // 4. Levenshtein — closest name
  let bestDist = Infinity
  for (const v of vendors) {
    const dist = levenshtein(normalize(v.name), search)
    if (dist < bestDist) { bestDist = dist; bestVendor = v }
  }
  if (bestDist < 15) return bestVendor

  throw new Error(`ما لقيت مورد قريب من "${name}"`)
}

// Find best product match (dictionary → fuzzy → AI)
async function smartFindProduct(itemDesc, vendorName) {
  const pd = await qoyodRequest('GET', '/products')
  const products = (pd.products || []).map(p => ({ ...p, name: p.name_ar || p.name_en || '' }))
  const desc = normalize(itemDesc)

  // 1. Check dictionary (saved mappings)
  const { data: mappings } = await supabase.from('item_mappings').select('*')
  if (mappings?.length) {
    const exactMap = mappings.find(m => normalize(m.vendor_item_name) === desc)
    if (exactMap) {
      const p = products.find(x => x.id === exactMap.qoyod_product_id)
      if (p) return p
    }
    // Fuzzy dictionary
    const fuzzyMap = mappings.find(m => levenshtein(normalize(m.vendor_item_name), desc) < 5)
    if (fuzzyMap) {
      const p = products.find(x => x.id === fuzzyMap.qoyod_product_id)
      if (p) return p
    }
  }

  // 2. Direct product match (includes)
  const direct = products.find(p => normalize(p.name).includes(desc) || desc.includes(normalize(p.name)))
  if (direct) return direct

  // 3. Word overlap
  const words = desc.split(/\s+/).filter(w => w.length > 2)
  let bestProd = null, bestScore = 0
  for (const p of products) {
    const pName = normalize(p.name)
    let score = 0
    for (const w of words) {
      if (pName.includes(w)) score++
    }
    if (score > bestScore) { bestScore = score; bestProd = p }
  }
  if (bestProd && bestScore >= 1) return bestProd

  // 4. Levenshtein
  let bestDist = Infinity
  for (const p of products) {
    const dist = levenshtein(normalize(p.name), desc)
    if (dist < bestDist) { bestDist = dist; bestProd = p }
  }
  if (bestProd && bestDist < 10) return bestProd

  // 5. AI match — ask Gemini
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const productList = products.map(p => `${p.id}: ${p.name}`).join('\n')
    const prompt = `عندي بند في فاتورة اسمه "${itemDesc}" من مورد "${vendorName}". وعندي هالبنود:\n${productList}\nوش أقرب بند؟ رجع JSON فقط: {"product_id": 0, "product_name": ""}`
    const r = await model.generateContent(prompt)
    const text = r.response.text()
    const jm = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
    if (jm) {
      const ai = JSON.parse(jm[1] || jm[0])
      if (ai.product_id) {
        const p = products.find(x => x.id === ai.product_id)
        if (p) return p
      }
    }
  } catch {}

  // 6. Last resort — return closest
  if (bestProd) return bestProd
  throw new Error(`ما لقيت بند بقيود يطابق "${itemDesc}"`)
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
    { name: 'search_invoices', description: 'ابحث عن فواتير مشتريات بمعايير مختلفة', parameters: { type: 'OBJECT', properties: { vendor_name: { type: 'STRING' }, invoice_number: { type: 'STRING' }, month: { type: 'STRING' }, min_amount: { type: 'NUMBER' }, max_amount: { type: 'NUMBER' } } } },
    { name: 'get_vendor_info', description: 'جلب معلومات مورد معين', parameters: { type: 'OBJECT', properties: { vendor_name: { type: 'STRING' } }, required: ['vendor_name'] } },
    { name: 'get_monthly_summary', description: 'ملخص المشتريات لشهر معين', parameters: { type: 'OBJECT', properties: { month: { type: 'STRING' } }, required: ['month'] } },
    { name: 'create_bill', description: 'إنشاء فاتورة مشتريات - يحتاج تأكيد', parameters: { type: 'OBJECT', properties: { vendor_name: { type: 'STRING' }, invoice_number: { type: 'STRING' }, invoice_date: { type: 'STRING' }, total_amount: { type: 'NUMBER' }, items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { description: { type: 'STRING' }, quantity: { type: 'NUMBER' }, unit_price: { type: 'NUMBER' } } } } }, required: ['vendor_name', 'items'] } },
    { name: 'create_payment', description: 'إنشاء سند صرف على فاتورة بقيود - يحتاج تأكيد', parameters: { type: 'OBJECT', properties: { vendor_name: { type: 'STRING', description: 'اسم المورد' }, reference: { type: 'STRING', description: 'رقم مرجع الفاتورة مثل BILL241' }, bill_id: { type: 'NUMBER', description: 'رقم الفاتورة بقيود (id)' }, amount: { type: 'NUMBER', description: 'مبلغ السند' }, account_name: { type: 'STRING', description: 'حساب الدفع. تحويل/بنك/الراجحي = حساب البنك الجاري - الراجحي. كاش/نقد/خزينة = النقدية في الخزينة' }, date: { type: 'STRING' } }, required: ['amount'] } },
    { name: 'scan_invoice_image', description: 'قراءة صورة فاتورة', parameters: { type: 'OBJECT', properties: { action: { type: 'STRING' } } } },
    { name: 'update_bill', description: 'تعديل فاتورة مشتريات موجودة بقيود (لازم تكون موافق عليها مو مدفوعة) - يحتاج تأكيد', parameters: { type: 'OBJECT', properties: { bill_id: { type: 'NUMBER', description: 'رقم الفاتورة بقيود (id)' }, reference: { type: 'STRING', description: 'رقم المرجع للبحث' }, notes: { type: 'STRING' }, issue_date: { type: 'STRING' }, due_date: { type: 'STRING' }, items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { description: { type: 'STRING' }, quantity: { type: 'NUMBER' }, unit_price: { type: 'NUMBER' } } } } } } },
    { name: 'delete_bill', description: 'حذف فاتورة مشتريات من قيود (لازم تكون موافق عليها مو مدفوعة) - يحتاج تأكيد', parameters: { type: 'OBJECT', properties: { bill_id: { type: 'NUMBER', description: 'رقم الفاتورة بقيود' }, reference: { type: 'STRING', description: 'رقم المرجع للبحث' } } } },
  ]
}]

// Fetch all Qoyod bills (handles pagination)
async function getAllQoyodBills() {
  const allBills = []
  let page = 1
  while (page <= 30) {
    const d = await qoyodRequest('GET', `/bills?page=${page}`)
    const bills = d.bills || []
    if (!bills.length) break
    allBills.push(...bills)
    if (bills.length < 100) break
    page++
  }
  return allBills
}

// Find a specific bill by reference (fast — stops at first match)
async function findBillByReference(ref) {
  let page = 1
  while (page <= 30) {
    const d = await qoyodRequest('GET', `/bills?page=${page}`)
    const bills = d.bills || []
    if (!bills.length) break
    const found = bills.find(b => (b.reference || '') === ref || (b.reference || '').includes(ref))
    if (found) return found
    if (bills.length < 100) break
    page++
  }
  return null
}

// Agent tool execution — all tools query Qoyod directly
async function executeAgentTool(name, args) {
  switch (name) {
    case 'search_invoices': {
      const allBills = await getAllQoyodBills()
      let filtered = allBills
      if (args.vendor_name) {
        const s = args.vendor_name.toLowerCase()
        filtered = filtered.filter(b => (b.contact?.name || '').toLowerCase().includes(s) || (b.contact?.organization || '').toLowerCase().includes(s))
      }
      if (args.invoice_number) filtered = filtered.filter(b => (b.reference || '').includes(args.invoice_number))
      if (args.month) filtered = filtered.filter(b => (b.issue_date || '').startsWith(args.month))
      if (args.min_amount) filtered = filtered.filter(b => Number(b.total || 0) >= args.min_amount)
      if (args.max_amount) filtered = filtered.filter(b => Number(b.total || 0) <= args.max_amount)
      return {
        count: filtered.length,
        total: filtered.reduce((s, b) => s + Number(b.total || 0), 0),
        total_paid: filtered.reduce((s, b) => s + Number(b.paid_amount || 0), 0),
        total_due: filtered.reduce((s, b) => s + Number(b.due_amount || 0), 0),
        invoices: filtered.slice(0, 15).map(b => ({
          id: b.id, reference: b.reference, vendor: b.contact?.name,
          date: b.issue_date, due_date: b.due_date,
          total: b.total, paid: b.paid_amount, due: b.due_amount,
          status: b.status,
          items: (b.line_items || []).map(li => li.product_name).join('، ')
        }))
      }
    }
    case 'get_vendor_info': {
      const vd = await qoyodRequest('GET', '/vendors')
      const vendors = vd.contacts || vd.vendors || []
      const s = args.vendor_name.toLowerCase()
      const v = vendors.find(x => (x.name || '').toLowerCase().includes(s) || (x.organization || '').toLowerCase().includes(s))
      if (!v) return { found: false, message: `ما لقيت مورد باسم "${args.vendor_name}"` }

      // Get all bills for this vendor from Qoyod
      const allBills = await getAllQoyodBills()
      const vendorBills = allBills.filter(b => b.contact?.id === v.id)
      const totalAmount = vendorBills.reduce((s2, b) => s2 + Number(b.total || 0), 0)
      const totalPaid = vendorBills.reduce((s2, b) => s2 + Number(b.paid_amount || 0), 0)
      const totalDue = vendorBills.reduce((s2, b) => s2 + Number(b.due_amount || 0), 0)
      const unpaid = vendorBills.filter(b => Number(b.due_amount || 0) > 0)
      const lastBill = vendorBills.sort((a, b) => b.issue_date?.localeCompare(a.issue_date))[0]

      // Get payments
      const pd = await qoyodRequest('GET', '/bill_payments')
      const payments = (pd.receipts || []).filter(p => p.contact_id === v.id)
      const lastPayment = payments.sort((a, b) => b.date?.localeCompare(a.date))[0]

      return {
        found: true,
        vendor: { id: v.id, name: v.name, organization: v.organization, phone: v.phone_number, tax_number: v.tax_number, status: v.status },
        stats: {
          total_bills: vendorBills.length,
          total_amount: totalAmount,
          total_paid: totalPaid,
          total_due: totalDue,
          unpaid_bills: unpaid.length,
          last_bill: lastBill ? { id: lastBill.id, reference: lastBill.reference, date: lastBill.issue_date, total: lastBill.total, due: lastBill.due_amount, status: lastBill.status } : null,
          last_payment: lastPayment ? { date: lastPayment.date, amount: lastPayment.amount } : null,
          unpaid_list: unpaid.slice(0, 5).map(b => ({ id: b.id, reference: b.reference, date: b.issue_date, total: b.total, due: b.due_amount }))
        }
      }
    }
    case 'get_monthly_summary': {
      const allBills = await getAllQoyodBills()
      const monthBills = allBills.filter(b => (b.issue_date || '').startsWith(args.month))
      if (!monthBills.length) return { month: args.month, count: 0, total: 0, message: 'ما فيه فواتير لهالشهر بقيود' }

      const byVendor = {}
      for (const b of monthBills) {
        const vn = b.contact?.name || '?'
        if (!byVendor[vn]) byVendor[vn] = { count: 0, total: 0, paid: 0, due: 0 }
        byVendor[vn].count++
        byVendor[vn].total += Number(b.total || 0)
        byVendor[vn].paid += Number(b.paid_amount || 0)
        byVendor[vn].due += Number(b.due_amount || 0)
      }
      const sorted = Object.entries(byVendor).sort((a, b) => b[1].total - a[1].total)

      return {
        month: args.month,
        count: monthBills.length,
        total: monthBills.reduce((s2, b) => s2 + Number(b.total || 0), 0),
        total_paid: monthBills.reduce((s2, b) => s2 + Number(b.paid_amount || 0), 0),
        total_due: monthBills.reduce((s2, b) => s2 + Number(b.due_amount || 0), 0),
        by_status: {
          approved: monthBills.filter(b => b.status === 'Approved').length,
          paid: monthBills.filter(b => b.status === 'Paid').length,
          draft: monthBills.filter(b => b.status === 'Draft').length,
        },
        top_vendors: sorted.slice(0, 5).map(([name, s2]) => ({ name, ...s2 }))
      }
    }
    case 'create_bill': {
      // Execute directly — no confirmation needed
      try {
        const result = await execConfirmed('create_bill', args)
        return result
      } catch (e) { return { error: e.message } }
    }
    case 'create_payment': {
      try {
        const result = await execConfirmed('create_payment', args)
        return result
      } catch (e) { return { error: e.message } }
    }
    case 'update_bill': {
      // Find the bill first
      let billId = args.bill_id
      if (!billId && args.reference) {
        const allBills = await getAllQoyodBills()
        const found = allBills.find(b => (b.reference || '').includes(args.reference))
        if (!found) return { error: `ما لقيت فاتورة بمرجع "${args.reference}"` }
        billId = found.id
        args.bill_id = billId
        args._bill_info = { id: found.id, reference: found.reference, vendor: found.contact?.name, total: found.total, status: found.status }
      }
      if (!billId) return { error: 'لازم تعطيني رقم الفاتورة أو المرجع' }
      try {
        const result = await execConfirmed('update_bill', args)
        return result
      } catch (e) { return { error: e.message } }
    }
    case 'delete_bill': {
      let billId = args.bill_id
      if (!billId && args.reference) {
        const found = await findBillByReference(args.reference)
        if (!found) return { error: `ما لقيت فاتورة بمرجع "${args.reference}"` }
        args.bill_id = found.id
      }
      try {
        const result = await execConfirmed('delete_bill', args)
        return result
      } catch (e) { return { error: e.message } }
    }
    case 'scan_invoice_image': return { needs_image: true, action: args.action || 'scan_only' }
    default: return { error: 'دالة غير معروفة' }
  }
}

// Execute confirmed action
async function execConfirmed(action, data) {
  if (action === 'create_bill') {
    // Smart vendor matching
    const vendor = await smartFindVendor(data.vendor_name)
    const id = await qoyodRequest('GET', '/inventories')
    const inv = (id.inventories || [])[0]
    if (!inv) throw new Error('ما فيه مخزن بقيود')
    // Smart product matching for each item
    const line_items = []
    for (const item of data.items || []) {
      const product = await smartFindProduct(item.description, data.vendor_name)
      line_items.push({ product_id: product.id, description: item.description, quantity: item.quantity || 1, unit_price: item.unit_price || 0, tax_percent: 15, is_inclusive: true })
      // Save mapping for future
      try { await supabase.from('item_mappings').insert({ vendor_item_name: item.description, qoyod_product_id: product.id, qoyod_product_name: product.name, vendor_name: data.vendor_name }) } catch {}
    }
    const bill = await qoyodRequest('POST', '/bills', { bill: { contact_id: vendor.id, status: 'Approved', issue_date: data.invoice_date || new Date().toISOString().split('T')[0], due_date: data.invoice_date || new Date().toISOString().split('T')[0], reference: data.invoice_number || '', inventory_id: inv.id, line_items } })
    await supabase.from('processed_invoices').insert({ vendor_name: vendor.name, invoice_number: data.invoice_number, invoice_date: data.invoice_date, total_amount: data.total_amount, qoyod_bill_id: bill?.bill?.id, status: 'pushed' })
    return { success: true, bill_id: bill?.bill?.id, vendor: vendor.name, total: bill?.bill?.total }
  }
  if (action === 'create_payment') {
    // Find the bill to pay
    let billId = data.bill_id
    let vendorName = data.vendor_name || ''

    // Search by reference first (fast)
    if (!billId && data.reference) {
      const bill = await findBillByReference(data.reference)
      if (bill) { billId = bill.id; vendorName = bill.contact?.name || vendorName }
      else throw new Error(`ما لقيت فاتورة بمرجع "${data.reference}"`)
    }

    // Search by vendor name (smart match → find unpaid bills)
    if (!billId && vendorName) {
      const vendor = await smartFindVendor(vendorName)
      vendorName = vendor.name
      const allBills = await getAllQoyodBills()
      const vendorBills = allBills.filter(b =>
        b.contact?.id === vendor.id && Number(b.due_amount || 0) > 0
      ).sort((a, b) => a.issue_date?.localeCompare(b.issue_date))
      if (!vendorBills.length) throw new Error(`ما لقيت فواتير غير مدفوعة لـ "${vendor.name}"`)
      billId = vendorBills[0].id
    }
    if (!billId) throw new Error('لازم تعطيني اسم المورد أو رقم الفاتورة')

    // Find payment account — map common words to actual account names
    const ad = await qoyodRequest('GET', '/accounts')
    const accs = (ad.accounts || []).map(a => ({ ...a, name: a.name_ar || a.name_en || '' }))
    let accSearch = (data.account_name || 'بنك').toLowerCase()
    // Map shortcuts to real account names
    if (/تحويل|بنك|راجحي|حوالة|bank/.test(accSearch)) accSearch = 'البنك الجاري'
    else if (/كاش|نقد|خزينة|cash/.test(accSearch)) accSearch = 'النقدية في الخزينة'
    else if (/مختلط|شبكة/.test(accSearch)) accSearch = 'مختلط'
    const acc = accs.find(a => a.name.toLowerCase().includes(accSearch))
    if (!acc) throw new Error('ما لقيت حساب دفع مناسب')

    const ref = 'PYT-' + Date.now().toString().slice(-6)
    const payment = await qoyodRequest('POST', '/bill_payments', {
      bill_payment: {
        reference: ref,
        bill_id: String(billId),
        account_id: String(acc.id),
        amount: String(data.amount),
        date: data.date || new Date().toISOString().split('T')[0],
        description: data.description || `سند صرف لـ ${vendorName}`
      }
    })
    console.log('[PAYMENT] Created:', JSON.stringify(payment).slice(0, 300))
    return { success: true, payment, vendor: vendorName, amount: data.amount, account: acc.name, reference: ref }
  }
  if (action === 'update_bill') {
    const billId = data.bill_id
    if (!billId) throw new Error('رقم الفاتورة مفقود')
    const updates = {}
    if (data.notes) updates.notes = data.notes
    if (data.issue_date) updates.issue_date = data.issue_date
    if (data.due_date) updates.due_date = data.due_date
    if (data.items?.length) {
      const pd = await qoyodRequest('GET', '/products')
      const prods = (pd.products || []).map(p => ({ ...p, name: p.name_ar || p.name_en || '' }))
      const id2 = await qoyodRequest('GET', '/inventories')
      const inv = (id2.inventories || [])[0]
      updates.line_items = []
      for (const item of data.items) {
        const ps = (item.description || '').toLowerCase()
        const m = prods.find(p => p.name.toLowerCase().includes(ps) || ps.includes(p.name.toLowerCase()))
        if (!m) throw new Error(`ما لقيت بند بقيود يطابق "${item.description}"`)
        updates.line_items.push({ product_id: m.id, description: item.description, quantity: item.quantity || 1, unit_price: item.unit_price || 0, tax_percent: 15, is_inclusive: true, inventory_id: inv?.id })
      }
    }
    console.log('[UPDATE BILL]', billId, JSON.stringify(updates).slice(0, 300))
    const result = await qoyodRequest('PUT', `/bills/${billId}`, { bill: updates })
    return { success: true, bill_id: billId, updated: result?.bill || result }
  }
  if (action === 'delete_bill') {
    const billId = data.bill_id
    if (!billId) throw new Error('رقم الفاتورة مفقود')
    console.log('[DELETE BILL]', billId)
    await qoyodRequest('DELETE', `/bills/${billId}`)
    return { success: true, bill_id: billId, message: 'تم حذف الفاتورة من قيود' }
  }
  throw new Error('إجراء غير معروف')
}

// Pending confirmations stored in Supabase (survives serverless cold starts)
async function savePending(userId, action, data) {
  // Delete any existing pending first, then insert new one
  await supabase.from('telegram_chats').delete().eq('user_id', String(userId)).eq('role', 'pending_action')
  const { error } = await supabase.from('telegram_chats').insert({ user_id: String(userId), role: 'pending_action', content: JSON.stringify({ action, data, ts: Date.now() }) })
  console.log('[savePending]', userId, action, error ? 'ERROR: ' + error.message : 'OK')
}
async function getPending(userId) {
  const { data, error } = await supabase.from('telegram_chats').select('content').eq('user_id', String(userId)).eq('role', 'pending_action').order('created_at', { ascending: false }).limit(1)
  console.log('[getPending]', userId, data?.length ? 'FOUND' : 'NONE', error?.message || '')
  if (!data?.length || !data[0]?.content) return null
  try { const p = JSON.parse(data[0].content); if (Date.now() - p.ts > 600000) return null; return p } catch { return null }
}
async function clearPending(userId) {
  await supabase.from('telegram_chats').delete().eq('user_id', String(userId)).eq('role', 'pending_action')
}

// Chat sessions (in-memory — will reset on cold start, but that's OK for stateless chats)
const chatSessions = new Map()

async function agentProcess(userId, text, imageBuffer = null, mimeType = null) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: `أنت "فاتِر" — مساعد محاسبة ذكي لمؤسسة سعودية تستخدم نظام قيود المحاسبي. تتكلم بالعربي العامي السعودي البسيط.

أنت لا تملك قاعدة بيانات خاصة — كل عملياتك المحاسبية تمر عبر نظام قيود.

⛔ قواعد إلزامية — لا تخالفها أبداً:
- أنت ما تقدر تسجل أو تدفع أو تبحث بنفسك. لازم تستدعي function call.
- تسجيل فاتورة = استدعي create_bill
- سند صرف / دفع / تحويل = استدعي create_payment (لازم تمرر reference رقم مرجع الفاتورة)
- بحث فواتير = استدعي search_invoices
- معلومات مورد = استدعي get_vendor_info
- ملخص شهري = استدعي get_monthly_summary
- تعديل فاتورة = استدعي update_bill
- حذف فاتورة = استدعي delete_bill
- ⛔ لا تقل "تم" إلا بعد ما تستدعي الأداة وتجيك نتيجة success
- ⛔ لو ما استدعيت أداة = ما صار شيء بقيود
- ✅ نفّذ مباشرة بدون طلب تأكيد — الأدوات تنفّذ فوري
- ✅ بعد التنفيذ أخبر المستخدم بالنتيجة

التدفق الصحيح لتسجيل فاتورة:
- المستخدم يرسل بيانات فاتورة (نص أو صورة)
- أنت تستخرج: vendor_name, items (description + quantity + unit_price), invoice_date, invoice_number
- تستدعي create_bill مع هالبيانات
- النظام يطلب تأكيد المستخدم
- بعد التأكيد يتسجل بقيود فعلياً

لو أرسل صورة فاتورة: اقرأها بالـ Vision واستخرج البيانات ثم استدعي create_bill.
المبالغ بالريال السعودي. رد مختصر ومفيد.`,
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
  let pendingAction = null
  while (result.candidates?.[0]?.content?.parts?.some(p => p.functionCall) && loops-- > 0) {
    const fcs = result.candidates[0].content.parts.filter(p => p.functionCall)
    const frs = []
    for (const fc of fcs) {
      try {
        const r = await executeAgentTool(fc.functionCall.name, fc.functionCall.args)
        // If tool needs confirmation, save it for later
        if (r.needs_confirmation) {
          pendingAction = { action: r.action, data: r.data }
          frs.push({ functionResponse: { name: fc.functionCall.name, response: { message: 'اعرض البيانات على المستخدم واطلب تأكيده قبل التنفيذ. قله "أسجلها بقيود؟" أو "أنفذ العملية؟"' } } })
        } else {
          frs.push({ functionResponse: { name: fc.functionCall.name, response: r } })
        }
      } catch (e) { frs.push({ functionResponse: { name: fc.functionCall.name, response: { error: e.message } } }) }
    }
    response = await chat.sendMessage(frs)
    result = response.response
  }

  // Save pending confirmation to Supabase if exists
  if (pendingAction) {
    await savePending(userId, pendingAction.action, pendingAction.data)
  }

  const txt = result.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || 'ما قدرت أفهم طلبك'
  try { await supabase.from('telegram_chats').insert([{ user_id: String(userId), role: 'user', content: text || '[صورة]' }, { user_id: String(userId), role: 'assistant', content: txt }]) } catch {}
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

    if (text === '/start') { await tgSend(chatId, `أهلاً ${firstName} 👋\n\nأنا <b>فاتِر</b> — مساعدك المحاسبي.\n\n🆔 رقمك: <code>${userId}</code>\n\nأقدر:\n• 📸 أقرأ فواتير وأسجلها بقيود\n• 🔍 أبحث عن فواتير وموردين بقيود\n• 📊 أعطيك ملخصات من قيود\n• 💳 أسوي سندات صرف بقيود\n\nكلمني بالعربي 😊`); return res.sendStatus(200) }
    if (text === '/clear') { chatSessions.delete(userId); await clearPending(userId); await tgSend(chatId, 'تم مسح المحادثة ✨'); return res.sendStatus(200) }
    if (text === '/id') { await tgSend(chatId, `🆔 رقمك: <code>${userId}</code>`); return res.sendStatus(200) }

    // Pending confirmation (stored in Supabase)
    const pending = await getPending(userId)
    if (pending) {
      const isConfirm = /^(نعم|اي|ايه|اكيد|أكيد|yes|ok|تمام|سجل|سوي|نفذ|سجلها|نعم سجل|نعم سجلها)$/i.test(text.trim())
      const isDeny = /^(لا|لأ|الغ|الغي|cancel|no)$/i.test(text.trim())

      if (isConfirm) {
        console.log('[CONFIRM] Executing:', pending.action, JSON.stringify(pending.data).slice(0, 200))
        await clearPending(userId)
        await tgTyping(chatId)
        try {
          const r = await execConfirmed(pending.action, pending.data)
          console.log('[CONFIRM] Result:', JSON.stringify(r).slice(0, 300))
          if (r.success) {
            if (pending.action === 'create_bill') await tgSend(chatId, `✅ تم تسجيل الفاتورة بقيود\n\n📋 رقم بقيود: ${r.bill_id}\n🏢 المورد: ${r.vendor}\n💰 المبلغ: ${r.total} ر.س`)
            else if (pending.action === 'update_bill') await tgSend(chatId, `✅ تم تعديل الفاتورة بقيود\n\n📋 رقم: ${r.bill_id}`)
            else if (pending.action === 'delete_bill') await tgSend(chatId, `✅ تم حذف الفاتورة من قيود\n\n📋 رقم: ${r.bill_id}`)
            else await tgSend(chatId, `✅ تم سند الصرف بقيود\n\n🏢 ${r.vendor}\n💰 ${r.amount} ر.س\n🏦 ${r.account}`)
          } else {
            await tgSend(chatId, `❌ فشل: ${JSON.stringify(r)}`)
          }
        } catch (e) {
          console.error('[CONFIRM] Error:', e.message)
          await tgSend(chatId, `❌ خطأ بالتسجيل بقيود: ${e.message}`)
        }
        return res.sendStatus(200)
      }
      if (isDeny) { await clearPending(userId); await tgSend(chatId, '⏹ تم الإلغاء.'); return res.sendStatus(200) }
      // Not a confirmation — clear and process as new message
      await clearPending(userId)
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
