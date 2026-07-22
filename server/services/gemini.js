import { GoogleGenerativeAI } from '@google/generative-ai'

// ============ Retry helper ============
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function callWithRetry(fn, { retries = 3, baseDelay = 2000 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const msg = String(e?.message || '')
      const isRateLimit = msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('Resource exhausted')
      const isOverloaded = msg.includes('503') || msg.includes('overloaded') || msg.includes('UNAVAILABLE')
      if (!isRateLimit && !isOverloaded) throw e
      if (attempt === retries) break
      const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 500)
      console.log(`[Gemini retry] attempt ${attempt + 1}/${retries + 1} failed (${isRateLimit ? '429' : '503'}). retrying in ${delay}ms`)
      await sleep(delay)
    }
  }
  // Re-throw with friendlier message
  const msg = String(lastErr?.message || '')
  if (msg.includes('429') || msg.includes('Resource exhausted')) {
    throw new Error('الذكاء الاصطناعي مشغول حالياً (تجاوز حد الطلبات). انتظر دقيقة وحاول مرة ثانية.')
  }
  if (msg.includes('503') || msg.includes('overloaded')) {
    throw new Error('الذكاء الاصطناعي يواجه حمل عالي حالياً. حاول بعد دقيقة.')
  }
  throw lastErr
}

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
      "discount": 0.00,
      "discount_type": "amount",
      "line_subtotal_incl_vat": 0.00,
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
- لو فيه بند مش واضح اكتب "غير واضح" بوصفه
- المبالغ بالريال السعودي، التاريخ بصيغة YYYY-MM-DD
- total_amount = الإجمالي النهائي شامل الضريبة كما بالفاتورة
- vat_amount = مبلغ الضريبة كما بالفاتورة
- subtotal = المجموع قبل الضريبة (لو موجود بالفاتورة، وإلا = total_amount - vat_amount)

لكل بند، انسخ الأرقام كما هي معروضة بالفاتورة:
- unit_price = الرقم بعمود "السعر" / "price" حرفياً (لا تحسبه من total/quantity)
- quantity = الرقم بعمود "الكمية" / "Quantity" فقط (انتبه لقاعدة الكراتين أدناه)
- discount = الرقم بعمود "الخصم" / "Discount" (مبلغ بالريال)، 0 لو فاضي
- discount_type = "amount" دائماً (إلا لو الفاتورة تذكر صراحة أنه نسبة %)
- line_subtotal_incl_vat = الرقم بعمود "الإجمالي شامل الضريبة" / "Item Subtotal (Including VAT)"، 0 لو ما فيه عمود
- total = نفس قيمة line_subtotal_incl_vat لو موجودة، وإلا quantity × unit_price

⚠️ قاعدة الكراتين (مهمة جداً — تجنب الالتباس):
بعض الفواتير فيها عمودين قريبين من بعض: "عدد الكراتين" / "Box Qty" / "Carton" / "Cartons" بجانب "الكمية" / "Quantity".
- استخدم دائماً عمود "الكمية" (وحدته تظهر في عمود "الوحدة" مثل: متر مربع، متر، حبة، كجم، لتر، علبة... إلخ).
- لا تأخذ "عدد الكراتين" أبداً كـ quantity حتى لو جاء أول.
- طريقة التحقق: لازم (quantity × unit_price − discount) ≈ إجمالي البند قبل الضريبة. لو الناتج ما طابق فمعناها أخذت العمود الغلط — جرّب العمود الثاني.
- مثال: الكراتين=17، الكمية=30.6 متر مربع، السعر=14، الإجمالي شامل=492.66
  → 30.6 × 14 = 428.40 → +15% = 492.66 ✓ → quantity = 30.6 (وليس 17)

تجاهل سطر "مجموع الخصم" تحت الفاتورة (هو مجموع خصومات البنود وليس خصماً إضافياً).

is_inclusive: لو مجموع البنود = total_amount فـ true، وإلا false.`

export async function scanInvoice(imageBuffer, mimeType) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType,
    },
  }

  const result = await callWithRetry(
    () => model.generateContent([SCAN_PROMPT, imagePart]),
    { retries: 3, baseDelay: 2000 }
  )
  const text = result.response.text()

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('لم يتمكن من استخراج بيانات الفاتورة')
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0]
  return JSON.parse(jsonStr)
}

export async function aiMatch(vendorItem, vendorName, qoyodProducts) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  const productList = qoyodProducts.map((p) => `${p.id}: ${p.name}`).join('\n')

  const prompt = `عندي بند في فاتورة اسمه "${vendorItem}" من مورد "${vendorName}".
وعندي هالبنود في النظام المحاسبي:
${productList}

وش أقرب بند يطابقه؟ رجع JSON فقط بدون أي نص:
{"product_id": 0, "product_name": "", "confidence": 0.0}

لو ما فيه تطابق معقول رجع:
{"product_id": null, "product_name": null, "confidence": 0}`

  const result = await callWithRetry(
    () => model.generateContent(prompt),
    { retries: 2, baseDelay: 1000 }
  )
  const text = result.response.text()

  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { product_id: null, product_name: null, confidence: 0 }

  const jsonStr = jsonMatch[1] || jsonMatch[0]
  return JSON.parse(jsonStr)
}