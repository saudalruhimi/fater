import { GoogleGenerativeAI } from '@google/generative-ai'

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
  "notes": "أي ملاحظات إضافية"
}

مهم:
- اكتب أسماء البنود كما هي مكتوبة بالفاتورة بالضبط
- لو فيه بند مش واضح اكتب "غير واضح" بوصفه
- المبالغ بالريال السعودي
- التاريخ بصيغة YYYY-MM-DD
- ابحث في الفاتورة عن السطر الأخير اللي فيه الإجمالي النهائي شامل الضريبة — هذا هو total_amount
- ابحث عن سطر مبلغ الضريبة (VAT) — هذا هو vat_amount
- subtotal = total_amount - vat_amount (المجموع قبل الضريبة)
- لكل بند: total = إجمالي البند كما هو مكتوب بعمود الإجمالي بالفاتورة
- unit_price = total / quantity
- تجاهل أعمدة الخصم (Discount) ونسبة الضريبة (Tax%) — لا تدخلها بالحسبة

لتحديد is_inclusive:
- لو مجموع total لكل البنود = total_amount (الإجمالي شامل الضريبة) → is_inclusive = true (الأسعار شاملة الضريبة)
- لو مجموع total لكل البنود = subtotal (المجموع قبل الضريبة) → is_inclusive = false (الأسعار قبل الضريبة)
- هذا مهم جداً لتحديد طريقة احتساب الضريبة`

export async function scanInvoice(imageBuffer, mimeType) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType,
    },
  }

  const result = await model.generateContent([SCAN_PROMPT, imagePart])
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const productList = qoyodProducts.map((p) => `${p.id}: ${p.name}`).join('\n')

  const prompt = `عندي بند في فاتورة اسمه "${vendorItem}" من مورد "${vendorName}".
وعندي هالبنود في النظام المحاسبي:
${productList}

وش أقرب بند يطابقه؟ رجع JSON فقط بدون أي نص:
{"product_id": 0, "product_name": "", "confidence": 0.0}

لو ما فيه تطابق معقول رجع:
{"product_id": null, "product_name": null, "confidence": 0}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { product_id: null, product_name: null, confidence: 0 }

  const jsonStr = jsonMatch[1] || jsonMatch[0]
  return JSON.parse(jsonStr)
}
