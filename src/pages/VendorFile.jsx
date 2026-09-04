import {
  Building2, Loader2, ChevronRight, FileText, CreditCard, Image as ImageIcon, X, Scale,
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getVendors, getBills } from '../lib/api'
import { PillTabs, EmptyState, ledger } from '../components/ui'
import { invoiceTotal, fmtSAR, normalizeVendor } from '../lib/amounts'
import { listReconciliations } from '../lib/reconciliations'

const STATUS = {
  pushed: { label: 'معتمدة', color: 'bg-primary-50 text-primary-dark' },
  scanned: { label: 'مقروءة', color: 'bg-blue-50 text-blue-700' },
  matched: { label: 'مطابقة', color: 'bg-amber-50 text-amber-700' },
  paid: { label: 'مدفوعة', color: 'bg-emerald-50 text-emerald-700' },
  error: { label: 'خطأ', color: 'bg-red-50 text-red-600' },
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-CA') : '—')

export default function VendorFile() {
  const { name: rawName } = useParams()
  const vendorName = decodeURIComponent(rawName || '')
  const key = normalizeVendor(vendorName)

  const [invoices, setInvoices] = useState([])
  const [vouchers, setVouchers] = useState([])
  const [outstanding, setOutstanding] = useState(0)
  const [qoyodName, setQoyodName] = useState(vendorName)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('invoices')
  const [preview, setPreview] = useState(null)
  const [checks, setChecks] = useState([])

  useEffect(() => {
    let alive = true
    setLoading(true)

    Promise.all([
      supabase.from('processed_invoices').select('*').order('invoice_date', { ascending: false }),
      supabase.from('sent_vouchers').select('*').order('payment_date', { ascending: false }),
      getVendors().catch(() => ({ vendors: [] })),
      getBills().catch(() => ({ bills: [] })),
    ]).then(([inv, vou, ven, bills]) => {
      if (!alive) return
      const mine = (r) => normalizeVendor(r.vendor_name) === key

      setInvoices((inv.data || []).filter(mine))
      setVouchers((vou.data || []).filter(mine))

      const v = (ven.vendors || []).find(x => normalizeVendor(x.name) === key)
      if (v) setQoyodName(v.name)

      // المطابقات: سطر يربط للأرشيف، لا نسخة من محتواه
      listReconciliations()
        .then(({ rows }) => {
          if (alive) setChecks(rows.filter(r => normalizeVendor(r.vendor_name) === key))
        })
        .catch(() => {})

      setOutstanding(
        (bills.bills || [])
          .filter(b => normalizeVendor(b.contact?.name || b.contact?.organization) === key)
          .reduce((s, b) => s + (Number(b.total ?? b.grand_total ?? 0)), 0)
      )
      setLoading(false)
    })

    return () => { alive = false }
  }, [key])

  const purchased = useMemo(() => invoices.reduce((s, i) => s + invoiceTotal(i), 0), [invoices])
  const paid = useMemo(() => vouchers.reduce((s, v) => s + (Number(v.amount) || 0), 0), [vouchers])

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    )
  }

  const stats = [
    { label: 'فواتير مرفوعة', value: invoices.length },
    { label: 'سندات صادرة', value: vouchers.length },
    { label: 'إجمالي المشتريات', value: fmtSAR(purchased), money: true },
    { label: 'إجمالي المدفوع', value: fmtSAR(paid), money: true },
  ]

  return (
    <div className="w-full animate-page">
      <Link to="/vendor-files" className="inline-flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text mb-4 transition-colors">
        <ChevronRight className="w-4 h-4" /> كل الموردين
      </Link>

      {/* ترويسة الملف */}
      <header className="mb-6">
        <div className="flex items-start gap-3 pb-4">
          <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-primary-dark" strokeWidth={1.7} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-primary-dark tracking-[0.12em] mb-1.5">ملف مورد</p>
            <h1 className="text-[22px] sm:text-[26px] font-black text-text leading-tight">{qoyodName}</h1>
            {outstanding > 0 && (
              <p className="text-[13px] text-amber-700 font-semibold mt-1.5">
                مستحق عليك الآن: {fmtSAR(outstanding)} ر.س
              </p>
            )}
          </div>
        </div>
        <div className="rule-double" />
      </header>

      {/* شريط الأرقام */}
      <div className="grid grid-cols-2 lg:flex mb-7 border-b border-border">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`flex-1 py-4 px-4 sm:px-5 ${i !== 0 ? 'lg:border-r lg:border-border' : ''} ${i % 2 === 1 ? 'border-r border-border lg:border-r' : ''} ${i >= 2 ? 'border-t border-border lg:border-t-0' : ''}`}
          >
            <p className="text-[11px] text-text-muted mb-2">{s.label}</p>
            <p className={`font-bold text-text leading-none stat-value ${s.money ? 'text-[19px] sm:text-[22px]' : 'text-[26px] sm:text-[32px]'}`}>
              {s.value}
              {s.money && <span className="text-[11px] font-normal text-text-muted mr-1">ر.س</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-5">
        <PillTabs
          tabs={[
            { key: 'invoices', label: 'الفواتير', icon: FileText, count: invoices.length },
            { key: 'vouchers', label: 'السندات', icon: CreditCard, count: vouchers.length },
            { key: 'matching', label: 'المطابقات', icon: Scale, count: checks.length },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {/* الفواتير */}
      {tab === 'invoices' && (
        invoices.length ? (
          <div className={ledger.wrap}>
            <table className={ledger.table}>
              <thead>
                <tr className={ledger.headRow}>
                  <th className={`${ledger.th} w-8`}>#</th>
                  <th className={ledger.th}>رقم الفاتورة</th>
                  <th className={ledger.th}>التاريخ</th>
                  <th className={`${ledger.th} text-left`}>الإجمالي</th>
                  <th className={ledger.th}>الحالة</th>
                  <th className={`${ledger.th} w-12`}></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => {
                  const s = STATUS[inv.status] || STATUS.scanned
                  return (
                    <tr key={inv.id} className={ledger.row}>
                      <td className={`${ledger.td} text-text-muted text-[11px]`}>{i + 1}</td>
                      <td className={`${ledger.td} font-semibold text-text font-mono text-[12.5px]`}>{inv.invoice_number || '—'}</td>
                      <td className={`${ledger.td} text-text-secondary`}>{fmtDate(inv.invoice_date)}</td>
                      <td className={`${ledger.td} text-left font-semibold text-text whitespace-nowrap`}>
                        {fmtSAR(invoiceTotal(inv))} <span className="text-[10px] font-normal text-text-muted">ر.س</span>
                      </td>
                      <td className={ledger.td}>
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                      </td>
                      <td className={ledger.td}>
                        {inv.image_url && (
                          <button
                            onClick={() => setPreview(inv)}
                            title="عرض الأصل"
                            className="p-1.5 rounded-full hover:bg-surface-lighter text-text-muted hover:text-primary transition-colors"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-text">
                  <td colSpan={3} className="px-3 py-3 text-[12px] font-bold text-text">الإجمالي</td>
                  <td className="px-3 py-3 text-left text-[13px] font-bold text-text whitespace-nowrap">
                    {fmtSAR(purchased)} <span className="text-[10px] font-normal text-text-muted">ر.س</span>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : <EmptyState icon={FileText} title="لا توجد فواتير لهذا المورد" hint="الفواتير المرفوعة من رصد تظهر هنا" />
      )}

      {/* السندات */}
      {tab === 'vouchers' && (
        vouchers.length ? (
          <div className={ledger.wrap}>
            <table className={ledger.table}>
              <thead>
                <tr className={ledger.headRow}>
                  <th className={`${ledger.th} w-8`}>#</th>
                  <th className={ledger.th}>رقم السند</th>
                  <th className={ledger.th}>مقابل فاتورة</th>
                  <th className={ledger.th}>التاريخ</th>
                  <th className={ledger.th}>الحساب</th>
                  <th className={`${ledger.th} text-left`}>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v, i) => (
                  <tr key={v.id} className={ledger.row}>
                    <td className={`${ledger.td} text-text-muted text-[11px]`}>{i + 1}</td>
                    <td className={`${ledger.td} font-mono text-[12.5px] text-text-muted`}>{v.reference || `#${v.qoyod_receipt_id}`}</td>
                    <td className={`${ledger.td} font-mono text-[12.5px] text-text-secondary`}>{v.invoice_number || '—'}</td>
                    <td className={`${ledger.td} text-text-secondary`}>{fmtDate(v.payment_date)}</td>
                    <td className={`${ledger.td} text-text-secondary`}>{v.account_name || '—'}</td>
                    <td className={`${ledger.td} text-left font-semibold text-text whitespace-nowrap`}>
                      {fmtSAR(v.amount)} <span className="text-[10px] font-normal text-text-muted">ر.س</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-text">
                  <td colSpan={5} className="px-3 py-3 text-[12px] font-bold text-text">الإجمالي</td>
                  <td className="px-3 py-3 text-left text-[13px] font-bold text-text whitespace-nowrap">
                    {fmtSAR(paid)} <span className="text-[10px] font-normal text-text-muted">ر.س</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : <EmptyState icon={CreditCard} title="لا توجد سندات لهذا المورد" hint="السندات الصادرة من «سندات الصرف» تظهر هنا" />
      )}

      {/* المطابقات — سطر لكل فحص، والتفاصيل في الأرشيف */}
      {tab === 'matching' && (
        checks.length ? (
          <>
            <div className={ledger.wrap}>
              <table className={ledger.table}>
                <thead>
                  <tr className={ledger.headRow}>
                    <th className={ledger.th}>الفترة</th>
                    <th className={ledger.th}>فُحص</th>
                    <th className={ledger.th}>النتيجة</th>
                    <th className={`${ledger.th} text-left`}>رصيدك</th>
                    <th className={`${ledger.th} text-left`}>رصيده</th>
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
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${c.clean ? 'bg-primary-50 text-primary-dark' : 'bg-amber-50 text-amber-700'}`}>
                          {c.clean ? 'مطابق' : `فرق ${fmtSAR(Math.abs(c.closing_gap || 0))}`}
                        </span>
                      </td>
                      <td className={`${ledger.td} text-left whitespace-nowrap`}>{fmtSAR(Math.abs(c.our_closing || 0))}</td>
                      <td className={`${ledger.td} text-left whitespace-nowrap`}>{fmtSAR(Math.abs(c.their_closing || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link to="/reconcile/archive" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary-dark hover:text-primary transition-colors mt-4">
              عرض الأرشيف بالملفات الأصلية ←
            </Link>
          </>
        ) : (
          <EmptyState
            icon={Scale}
            title="لم تُفحص كشوفات هذا المورد بعد"
            hint="افحص كشفه من صفحة المطابقة، وتظهر النتيجة هنا"
            action={
              <Link to="/reconcile" className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-dark text-white text-[13px] font-semibold px-5 py-2.5 transition-colors">
                <Scale className="w-4 h-4" strokeWidth={2} /> افحص كشفاً
              </Link>
            }
          />
        )
      )}

      {/* معاينة أصل الفاتورة */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 modal-overlay" onClick={() => setPreview(null)}>
          <div className="relative bg-surface rounded-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-light">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text truncate">{preview.invoice_number || 'فاتورة'}</p>
                <p className="text-[11px] text-text-muted">{fmtDate(preview.invoice_date)}</p>
              </div>
              <button onClick={() => setPreview(null)} className="p-1.5 rounded-lg hover:bg-surface-lighter">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-surface-light flex items-center justify-center">
              {/\.pdf($|\?)/i.test(preview.image_url)
                ? <iframe src={preview.image_url} className="w-full h-[75vh] border-0 rounded-xl" title="أصل الفاتورة" />
                : <img src={preview.image_url} alt="أصل الفاتورة" className="max-w-full max-h-[75vh] object-contain rounded-xl" />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
