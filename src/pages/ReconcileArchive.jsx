import { Archive, Loader2, CheckCircle2, AlertTriangle, FileText, Building2, Database } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, EmptyState, ledger } from '../components/ui'
import { listReconciliations } from '../lib/reconciliations'
import { fmtSAR } from '../lib/amounts'

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-CA') : '—')

export default function ReconcileArchive() {
  const [rows, setRows] = useState([])
  const [missing, setMissing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    listReconciliations()
      .then(({ rows, missing }) => { if (alive) { setRows(rows); setMissing(missing) } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const byVendor = useMemo(() => {
    const m = new Map()
    for (const r of rows) {
      if (!m.has(r.vendor_name)) m.set(r.vendor_name, [])
      m.get(r.vendor_name).push(r)
    }
    return [...m.entries()]
  }, [rows])

  if (loading) {
    return <div className="w-full flex items-center justify-center py-32"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>
  }

  return (
    <div className="w-full animate-page">
      <PageHeader
        kicker="المحاسبة"
        title="أرشيف المطابقات"
        description="كل فحص محفوظ بملفيه الأصليين — كشفك من قيود وكشف المورد كما وصلك."
      />

      {missing ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" strokeWidth={1.8} />
            <div>
              <h3 className="text-[14px] font-bold text-amber-800 mb-1">الأرشيف غير مُفعّل بعد</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed mb-2">
                جدول الأرشيف يحتاج إنشاءً لمرة واحدة في Supabase. شغّل محتوى الملف
                <code className="mx-1 px-1.5 py-0.5 rounded bg-surface border border-border-light text-[12px]" dir="ltr">supabase/006_reconciliations.sql</code>
                في محرر SQL هناك.
              </p>
              <p className="text-[12px] text-text-muted">
                والمطابقة تعمل الآن بدونه — تعرض النتيجة ولا تحفظها فقط.
              </p>
            </div>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="لم تُفحص أي كشوفات بعد"
          hint="أول مطابقة تجريها تُحفظ هنا بملفيها"
        />
      ) : (
        <div className="space-y-8">
          {byVendor.map(([vendor, checks]) => (
            <section key={vendor}>
              <div className="flex items-center gap-3 mb-3">
                <Building2 className="w-4 h-4 text-primary-dark flex-shrink-0" strokeWidth={1.8} />
                <Link to={`/vendor-files/${encodeURIComponent(vendor)}`} className="text-[14px] font-bold text-text hover:text-primary-dark transition-colors whitespace-nowrap">
                  {vendor}
                </Link>
                <span className="text-[11px] text-text-muted whitespace-nowrap">{checks.length} فحص</span>
                <div className="flex-1 border-b border-border" />
              </div>

              <div className={ledger.wrap}>
                <table className={ledger.table}>
                  <thead>
                    <tr className={ledger.headRow}>
                      <th className={ledger.th}>الفترة</th>
                      <th className={ledger.th}>فُحص</th>
                      <th className={ledger.th}>النتيجة</th>
                      <th className={`${ledger.th} text-left`}>رصيدك</th>
                      <th className={`${ledger.th} text-left`}>رصيده</th>
                      <th className={ledger.th}>الملفات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map((c) => (
                      <tr key={c.id} className={ledger.row}>
                        <td className={`${ledger.td} text-text-secondary whitespace-nowrap`}>
                          {c.period_from ? `${fmtDate(c.period_from)} ← ${fmtDate(c.period_to)}` : '—'}
                        </td>
                        <td className={`${ledger.td} text-text-muted whitespace-nowrap`}>{fmtDate(c.created_at)}</td>
                        <td className={ledger.td}>
                          {c.clean ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary-50 text-primary-dark">
                              <CheckCircle2 className="w-3 h-3" strokeWidth={2.4} /> مطابق
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                              <AlertTriangle className="w-3 h-3" strokeWidth={2.4} /> فرق {fmtSAR(Math.abs(c.closing_gap || 0))}
                            </span>
                          )}
                        </td>
                        <td className={`${ledger.td} text-left whitespace-nowrap`}>{fmtSAR(Math.abs(c.our_closing || 0))}</td>
                        <td className={`${ledger.td} text-left whitespace-nowrap`}>{fmtSAR(Math.abs(c.their_closing || 0))}</td>
                        <td className={ledger.td}>
                          <div className="flex items-center gap-1">
                            {c.ours_url && (
                              <a href={c.ours_url} target="_blank" rel="noreferrer" title="كشف قيود"
                                className="p-1.5 rounded-full hover:bg-surface-lighter text-text-muted hover:text-primary transition-colors">
                                <FileText className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {c.theirs_url && (
                              <a href={c.theirs_url} target="_blank" rel="noreferrer" title="كشف المورد"
                                className="p-1.5 rounded-full hover:bg-surface-lighter text-text-muted hover:text-primary transition-colors">
                                <FileText className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {!c.ours_url && !c.theirs_url && <span className="text-[11px] text-text-muted">—</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
