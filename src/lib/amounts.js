// المبلغ المخزَّن في processed_invoices.total_amount له معنيان مختلفان حسب
// المسار الذي كتبه — وهذا خلل قائم في قاعدة البيانات لم يُحسم بعد:
//
//   status = 'pushed'  → كُتب من مسار الإرسال لقيود: المجموع *قبل* الضريبة
//   غير ذلك            → كُتب من مسار القراءة: الإجمالي *شامل* الضريبة
//
// تحقّقنا من ذلك على كامل البيانات: ١٨٢ فاتورة pushed نسبة ضريبتها ١٥٪ بالضبط
// من المخزَّن، و١٣ فاتورة scanned ليست كذلك. فالقاعدة حتمية لا تخمينية.
//
// تُجمَع هنا في مكان واحد حتى لا تنتشر في كل صفحة، وحتى يبقى الإصلاح — حين
// يُتخذ القرار — تعديلاً في ملف واحد.
export function invoiceTotal(inv) {
  const amount = Number(inv?.total_amount) || 0
  const vat = Number(inv?.vat_amount) || 0
  return inv?.status === 'pushed' ? amount + vat : amount
}

export function fmtSAR(n, opts = {}) {
  return Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: opts.decimals ?? 2,
    maximumFractionDigits: opts.decimals ?? 2,
  })
}

// توحيد أسماء الموردين للمقارنة — نفس تطبيع المطابقة في الخادم
export function normalizeVendor(name) {
  return String(name || '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}
