import { supabase } from './supabase'

/* أرشيف المطابقات.
   الجدول يُنشأ بتشغيل supabase/006_reconciliations.sql. وحتى يُنشأ، تبقى
   المطابقة نفسها عاملة — يسقط الحفظ وحده بهدوء بدل أن يُسقط الصفحة معه. */

const MISSING = /relation .* does not exist|Could not find the table|schema cache/i

export function isArchiveMissing(error) {
  return !!error && MISSING.test(error.message || '')
}

export async function listReconciliations(vendorName) {
  let q = supabase.from('reconciliations').select('*').order('created_at', { ascending: false })
  if (vendorName) q = q.eq('vendor_name', vendorName)
  const { data, error } = await q
  if (error) {
    if (isArchiveMissing(error)) return { rows: [], missing: true }
    throw error
  }
  return { rows: data || [], missing: false }
}

// يرفع الملفين الأصليين ثم يحفظ السجل. فشل الرفع لا يمنع حفظ النتيجة.
export async function saveReconciliation({ vendorName, from, to, ours, theirs, result, checkedBy }) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const put = async (file, tag) => {
    if (!file) return { url: null, name: null }
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
      const path = `reconciliations/${stamp}-${tag}.${ext}`
      const { error } = await supabase.storage.from('invoices').upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })
      if (error) return { url: null, name: file.name }
      const { data } = supabase.storage.from('invoices').getPublicUrl(path)
      return { url: data?.publicUrl || null, name: file.name }
    } catch {
      return { url: null, name: file.name }
    }
  }

  const [a, b] = await Promise.all([put(ours, 'qoyod'), put(theirs, 'vendor')])

  const { data, error } = await supabase.from('reconciliations').insert({
    vendor_name: vendorName,
    period_from: from || null,
    period_to: to || null,
    ours_url: a.url, ours_name: a.name,
    theirs_url: b.url, theirs_name: b.name,
    clean: !!result.clean,
    our_closing: result.ourClosing,
    their_closing: result.theirClosing,
    closing_gap: result.closingGap,
    opening_gap: result.openingGap,
    matched_count: result.counts.matched,
    diff_count: result.counts.onlyOurs + result.counts.onlyTheirs + result.counts.amountDiff,
    result,
    checked_by: checkedBy || null,
  }).select().single()

  if (error) {
    if (isArchiveMissing(error)) return { saved: false, missing: true }
    throw error
  }
  return { saved: true, row: data }
}
