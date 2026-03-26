import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

// Qoyod request helper (reused from qoyod service)
async function getQoyodKey() {
  const { data } = await supabase.from('user_settings').select('qoyod_api_key').limit(1).single()
  return data?.qoyod_api_key || null
}

async function qoyodReq(method, path, body = null) {
  const key = await getQoyodKey()
  if (!key) throw new Error('مفتاح قيود غير مُعد')
  const opts = { method, headers: { 'API-KEY': key, 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`https://api.qoyod.com/2.0${path}`, opts)
  const data = await res.json()
  if (!res.ok) throw new Error(`Qoyod ${res.status}: ${data?.message || JSON.stringify(data)}`)
  return data
}

// ============ Tool definitions for Gemini ============
const tools = [
  {
    functionDeclarations: [
      {
        name: 'search_invoices',
        description: 'ابحث عن فواتير مشتريات في قيود بمعايير مختلفة: اسم مورد، رقم فاتورة، شهر، أو مبلغ',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            vendor_name: { type: SchemaType.STRING, description: 'اسم المورد (جزئي أو كامل)' },
            invoice_number: { type: SchemaType.STRING, description: 'رقم الفاتورة' },
            month: { type: SchemaType.STRING, description: 'الشهر بصيغة YYYY-MM' },
            min_amount: { type: SchemaType.NUMBER, description: 'الحد الأدنى للمبلغ' },
            max_amount: { type: SchemaType.NUMBER, description: 'الحد الأعلى للمبلغ' },
          },
        },
      },
      {
        name: 'get_vendor_info',
        description: 'جلب معلومات مورد معين من قيود: رصيد، فواتير معلقة، آخر دفعة',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            vendor_name: { type: SchemaType.STRING, description: 'اسم المورد' },
          },
          required: ['vendor_name'],
        },
      },
      {
        name: 'get_monthly_summary',
        description: 'ملخص المشتريات لشهر معين: عدد الفواتير، الإجمالي، أكثر مورد',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            month: { type: SchemaType.STRING, description: 'الشهر بصيغة YYYY-MM' },
          },
          required: ['month'],
        },
      },
      {
        name: 'create_bill',
        description: 'إنشاء فاتورة مشتريات جديدة في قيود — يحتاج تأكيد المستخدم أولاً',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            vendor_name: { type: SchemaType.STRING, description: 'اسم المورد' },
            invoice_number: { type: SchemaType.STRING, description: 'رقم الفاتورة' },
            invoice_date: { type: SchemaType.STRING, description: 'تاريخ الفاتورة YYYY-MM-DD' },
            total_amount: { type: SchemaType.NUMBER, description: 'المبلغ الإجمالي' },
            items: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  description: { type: SchemaType.STRING },
                  quantity: { type: SchemaType.NUMBER },
                  unit_price: { type: SchemaType.NUMBER },
                },
              },
            },
          },
          required: ['vendor_name', 'items'],
        },
      },
      {
        name: 'create_payment',
        description: 'إنشاء سند صرف على فاتورة — يحتاج تأكيد المستخدم أولاً',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            vendor_name: { type: SchemaType.STRING, description: 'اسم المورد' },
            amount: { type: SchemaType.NUMBER, description: 'المبلغ' },
            account_name: { type: SchemaType.STRING, description: 'اسم حساب الدفع (بنك/كاش)' },
            date: { type: SchemaType.STRING, description: 'التاريخ YYYY-MM-DD' },
          },
          required: ['vendor_name', 'amount'],
        },
      },
      {
        name: 'scan_invoice_image',
        description: 'قراءة صورة فاتورة واستخراج بياناتها — يُستدعى تلقائياً عند إرسال صورة مع طلب تسجيل',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            action: { type: SchemaType.STRING, description: 'الإجراء المطلوب: scan_only أو scan_and_register' },
          },
        },
      },
    ],
  },
]

// ============ Tool execution ============
async function executeTool(name, args) {
  switch (name) {
    case 'search_invoices':
      return await searchInvoices(args)
    case 'get_vendor_info':
      return await getVendorInfo(args)
    case 'get_monthly_summary':
      return await getMonthlySummary(args)
    case 'create_bill':
      return { needs_confirmation: true, action: 'create_bill', data: args }
    case 'create_payment':
      return { needs_confirmation: true, action: 'create_payment', data: args }
    case 'scan_invoice_image':
      return { needs_image: true, action: args.action || 'scan_only' }
    default:
      return { error: 'دالة غير معروفة' }
  }
}

// ============ Tool implementations ============

async function searchInvoices({ vendor_name, invoice_number, month, min_amount, max_amount }) {
  const { data: invoices } = await supabase
    .from('processed_invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  let filtered = invoices || []

  if (vendor_name) {
    const search = vendor_name.toLowerCase()
    filtered = filtered.filter((i) => (i.vendor_name || '').toLowerCase().includes(search))
  }
  if (invoice_number) {
    filtered = filtered.filter((i) => (i.invoice_number || '').includes(invoice_number))
  }
  if (month) {
    filtered = filtered.filter((i) => (i.invoice_date || '').startsWith(month))
  }
  if (min_amount) {
    filtered = filtered.filter((i) => Number(i.total_amount || 0) >= min_amount)
  }
  if (max_amount) {
    filtered = filtered.filter((i) => Number(i.total_amount || 0) <= max_amount)
  }

  return {
    count: filtered.length,
    total: filtered.reduce((s, i) => s + Number(i.total_amount || 0), 0),
    invoices: filtered.slice(0, 10).map((i) => ({
      invoice_number: i.invoice_number,
      vendor_name: i.vendor_name,
      date: i.invoice_date,
      amount: i.total_amount,
      status: i.status,
    })),
  }
}

async function getVendorInfo({ vendor_name }) {
  // Get vendor from Qoyod
  const vendorData = await qoyodReq('GET', '/vendors')
  const vendors = vendorData.contacts || vendorData.vendors || []
  const search = vendor_name.toLowerCase()
  const vendor = vendors.find(
    (v) => (v.name || '').toLowerCase().includes(search) || (v.organization || '').toLowerCase().includes(search)
  )

  if (!vendor) return { found: false, message: `ما لقيت مورد باسم "${vendor_name}"` }

  // Get invoices for this vendor from Supabase
  const { data: invoices } = await supabase
    .from('processed_invoices')
    .select('*')
    .ilike('vendor_name', `%${vendor_name}%`)
    .order('created_at', { ascending: false })

  const totalOwed = (invoices || [])
    .filter((i) => i.status === 'pushed' || i.status === 'approved')
    .reduce((s, i) => s + Number(i.total_amount || 0), 0)

  return {
    found: true,
    vendor: { id: vendor.id, name: vendor.name, organization: vendor.organization, phone: vendor.phone_number, tax_number: vendor.tax_number },
    stats: {
      total_invoices: (invoices || []).length,
      total_amount: (invoices || []).reduce((s, i) => s + Number(i.total_amount || 0), 0),
      pending_amount: totalOwed,
      last_invoice: invoices?.[0]
        ? { number: invoices[0].invoice_number, date: invoices[0].invoice_date, amount: invoices[0].total_amount }
        : null,
    },
  }
}

async function getMonthlySummary({ month }) {
  const { data: invoices } = await supabase
    .from('processed_invoices')
    .select('*')
    .gte('invoice_date', `${month}-01`)
    .lte('invoice_date', `${month}-31`)

  if (!invoices?.length) return { month, count: 0, total: 0, message: 'ما فيه فواتير لهالشهر' }

  // Group by vendor
  const byVendor = {}
  for (const inv of invoices) {
    const v = inv.vendor_name || 'غير محدد'
    if (!byVendor[v]) byVendor[v] = { count: 0, total: 0 }
    byVendor[v].count++
    byVendor[v].total += Number(inv.total_amount || 0)
  }

  const topVendor = Object.entries(byVendor).sort((a, b) => b[1].total - a[1].total)[0]

  return {
    month,
    count: invoices.length,
    total: invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0),
    top_vendor: topVendor ? { name: topVendor[0], ...topVendor[1] } : null,
    by_status: {
      pushed: invoices.filter((i) => i.status === 'pushed').length,
      scanned: invoices.filter((i) => i.status === 'scanned').length,
      error: invoices.filter((i) => i.status === 'error').length,
    },
  }
}

// ============ Confirmed actions ============
export async function executeConfirmedAction(action, data) {
  switch (action) {
    case 'create_bill':
      return await executeCreateBill(data)
    case 'create_payment':
      return await executeCreatePayment(data)
    default:
      return { error: 'إجراء غير معروف' }
  }
}

async function executeCreateBill(data) {
  // Find vendor
  const vendorData = await qoyodReq('GET', '/vendors')
  const vendors = vendorData.contacts || vendorData.vendors || []
  const search = (data.vendor_name || '').toLowerCase()
  const vendor = vendors.find((v) => (v.name || '').toLowerCase().includes(search))
  if (!vendor) throw new Error(`ما لقيت مورد باسم "${data.vendor_name}"`)

  // Get first inventory
  const invData = await qoyodReq('GET', '/inventories')
  const inventory = (invData.inventories || [])[0]
  if (!inventory) throw new Error('ما فيه مخزن مُعد بقيود')

  // Match items with products
  const products = await qoyodReq('GET', '/products')
  const productList = (products.products || []).map((p) => ({ ...p, name: p.name_ar || p.name_en || '' }))

  const line_items = []
  for (const item of data.items || []) {
    // Simple name matching
    const pSearch = (item.description || '').toLowerCase()
    const matched = productList.find((p) => p.name.toLowerCase().includes(pSearch) || pSearch.includes(p.name.toLowerCase()))
    if (!matched) throw new Error(`ما لقيت بند بقيود يطابق "${item.description}"`)

    line_items.push({
      product_id: matched.id,
      description: item.description,
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      tax_percent: 15,
      is_inclusive: true,
    })
  }

  const bill = await qoyodReq('POST', '/bills', {
    bill: {
      contact_id: vendor.id,
      status: 'Approved',
      issue_date: data.invoice_date || new Date().toISOString().split('T')[0],
      due_date: data.invoice_date || new Date().toISOString().split('T')[0],
      reference: data.invoice_number || '',
      inventory_id: inventory.id,
      line_items,
    },
  })

  // Save to Supabase
  await supabase.from('processed_invoices').insert({
    vendor_name: vendor.name,
    invoice_number: data.invoice_number,
    invoice_date: data.invoice_date,
    total_amount: data.total_amount,
    qoyod_bill_id: bill?.bill?.id,
    status: 'pushed',
  })

  return { success: true, bill_id: bill?.bill?.id, vendor: vendor.name, total: bill?.bill?.total }
}

async function executeCreatePayment(data) {
  // Find vendor
  const vendorData = await qoyodReq('GET', '/vendors')
  const vendors = vendorData.contacts || vendorData.vendors || []
  const search = (data.vendor_name || '').toLowerCase()
  const vendor = vendors.find((v) => (v.name || '').toLowerCase().includes(search))
  if (!vendor) throw new Error(`ما لقيت مورد باسم "${data.vendor_name}"`)

  // Find account (bank/cash)
  const accData = await qoyodReq('GET', '/accounts')
  const accounts = (accData.accounts || []).map((a) => ({ ...a, name: a.name_ar || a.name_en || '' }))
  const accSearch = (data.account_name || 'بنك').toLowerCase()
  const account = accounts.find(
    (a) => a.name.toLowerCase().includes(accSearch) || accSearch.includes(a.name.toLowerCase())
  )
  if (!account) throw new Error('ما لقيت حساب دفع مناسب')

  const payment = await qoyodReq('POST', '/bill_payments', {
    bill_payment: {
      contact_id: vendor.id,
      account_id: account.id,
      amount: data.amount,
      date: data.date || new Date().toISOString().split('T')[0],
      description: `سند صرف لـ ${vendor.name}`,
    },
  })

  return { success: true, payment, vendor: vendor.name, amount: data.amount, account: account.name }
}

// ============ Main agent chat ============
const chatSessions = new Map()

export async function processMessage(userId, text, imageBuffer = null, mimeType = null) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: `أنت "فاتِر" — مساعد محاسبة ذكي لمؤسسة سعودية. تتكلم بالعربي العامي السعودي البسيط.

مهامك:
- تبحث عن فواتير مشتريات ومعلومات موردين
- تقرأ صور الفواتير وتستخرج بياناتها
- تسجل فواتير مشتريات بقيود
- تسوي سندات صرف
- تعطي ملخصات وتقارير

قواعد:
- العمليات الحساسة (تسجيل فاتورة / سند صرف) لازم تطلب تأكيد المستخدم أولاً
- رد بشكل مختصر ومفيد
- استخدم الأرقام العربية عند عرض المبالغ
- المبالغ بالريال السعودي
- لو المستخدم أرسل صورة فاتورة، استخدم scan_invoice_image
- لو المستخدم أرسل "نعم" أو "أكيد" بعد طلب تأكيد، نفّذ العملية`,
    tools,
  })

  // Get or create chat session
  if (!chatSessions.has(userId)) {
    chatSessions.set(userId, model.startChat({ history: [] }))
  }
  const chat = chatSessions.get(userId)

  // Build message parts
  const parts = []
  if (imageBuffer) {
    parts.push({ inlineData: { data: imageBuffer.toString('base64'), mimeType } })
    parts.push({ text: text || 'اقرأ هالفاتورة واستخرج بياناتها' })
  } else {
    parts.push({ text })
  }

  let response = await chat.sendMessage(parts)
  let result = response.response

  // Handle function calls in a loop
  let maxIterations = 5
  while (result.candidates?.[0]?.content?.parts?.some((p) => p.functionCall) && maxIterations-- > 0) {
    const functionCalls = result.candidates[0].content.parts.filter((p) => p.functionCall)
    const functionResponses = []

    for (const fc of functionCalls) {
      const { name, args } = fc.functionCall
      console.log(`[Agent] Calling: ${name}`, JSON.stringify(args))

      try {
        const toolResult = await executeTool(name, args)
        functionResponses.push({
          functionResponse: { name, response: toolResult },
        })
      } catch (e) {
        functionResponses.push({
          functionResponse: { name, response: { error: e.message } },
        })
      }
    }

    response = await chat.sendMessage(functionResponses)
    result = response.response
  }

  const textResponse = result.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n') || 'ما قدرت أفهم طلبك، جرب مرة ثانية'

  // Save to chat history
  await supabase.from('telegram_chats').insert({
    user_id: String(userId),
    role: 'user',
    content: text || '[صورة]',
  })
  await supabase.from('telegram_chats').insert({
    user_id: String(userId),
    role: 'assistant',
    content: textResponse,
  })

  return textResponse
}

// Clear chat session
export function clearSession(userId) {
  chatSessions.delete(userId)
}
