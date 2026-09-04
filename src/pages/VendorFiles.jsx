import { Search, Building2, Loader2, ArrowLeft } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getVendors, getBills } from '../lib/api'
import { PageHeader, EmptyState } from '../components/ui'
import { invoiceTotal, fmtSAR, normalizeVendor } from '../lib/amounts'

/* ملفات الموردين — شبكة بطاقات، كل بطاقة لمحة عن مورد.
   المصدر بيانات رصد المحلية: ما رُفع من فواتير وما صدر من سندات. المستحق
   يأتي من فواتير قيود غير المدفوعة، وهي مخبَّأة أصلاً فلا تكلّف طلباً جديداً. */

export default function VendorFiles() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let alive = true

    Promise.all([
      supabase.from('processed_invoices').select('vendor_name, total_amount, vat_amount, status, created_at'),
      supabase.from('sent_vouchers').select('vendor_name, amount, payment_date'),
      getVendors().catch(() => ({ vendors: [] })),
      getBills().catch(() => ({ bills: [] })),
    ]).then(([inv, vou, ven, bills]) => {
      if (!alive) return

      // نجمع كل شيء تحت اسم المورد المطبَّع، فالأسماء هي مفتاح الربط في بياناتنا
      const map = new Map()
      const slot = (name) => {
        const key = normalizeVendor(name)
        if (!key) return null
        if (!map.has(key)) {
          map.set(key, { key, name, invoices: 0, purchased: 0, vouchers: 0, paid: 0, outstanding: 0, last: null })
        }
        return map.get(key)
      }

      for (const r of inv.data || []) {
        const s = slot(r.vendor_name); if (!s) continue
        s.invoices++
        s.purchased += invoiceTotal(r)
        if (!s.last || r.created_at > s.last) s.last = r.created_at
      }
      for (const r of vou.data || []) {
        const s = slot(r.vendor_name); if (!s) continue
        s.vouchers++
        s.paid += Number(r.amount) || 0
      }
      // المستحق: فواتير قيود غير المدفوعة لهذا المورد
      for (const b of bills.bills || []) {
        const name = b.contact?.name || b.contact?.organization
        const s = slot(name); if (!s) continue
        s.outstanding += Number(b.total ?? b.grand_total ?? 0)
      }
      // نفضّل الاسم كما هو مسجَّل في قيود حين نجده
      for (const v of ven.vendors || []) {
        const s = map.get(normalizeVendor(v.name))
        if (s) { s.name = v.name; s.qoyodId = v.id }
      }

      setRows([...map.values()].sort((a, b) => b.purchased - a.purchased))
      setLoading(false)
    })

    return () => { alive = false }
  }, [])

  const filtered = useMemo(() => {
    const q = normalizeVendor(search)
    if (!q) return rows
    return rows.filter(r => normalizeVendor(r.name).includes(q))
  }, [rows, search])

  const totals = useMemo(() => ({
    vendors: rows.length,
    invoices: rows.reduce((s, r) => s + r.invoices, 0),
    vouchers: rows.reduce((s, r) => s + r.vouchers, 0),
  }), [rows])

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full animate-page">
      <PageHeader
        kicker="البيانات"
        title="ملفات الموردين"
        description={`${totals.vendors} مورد · ${totals.invoices} فاتورة · ${totals.vouchers} سند — كل ما سجّله رصد، مجموعاً لكل شركة.`}
      >
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن مورد..."
            className="w-full bg-surface border border-border rounded-full py-2.5 pr-10 pl-4 text-[13px] text-text placeholder-text-muted focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
      </PageHeader>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded-2xl overflow-hidden">
          {filtered.map((v) => (
            <Link
              key={v.key}
              to={`/vendor-files/${encodeURIComponent(v.name)}`}
              className="group bg-surface hover:bg-surface-light p-5 transition-colors block"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary-dark" strokeWidth={1.8} />
                </div>
                <ArrowLeft className="w-4 h-4 text-text-muted/40 group-hover:text-primary-dark group-hover:-translate-x-0.5 transition-all mt-1" />
              </div>

              <p className="text-[14px] font-bold text-text leading-snug mb-3 line-clamp-2">{v.name}</p>

              <div className="flex items-center gap-3 text-[11px] text-text-muted mb-3">
                <span>{v.invoices} فاتورة</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>{v.vouchers} سند</span>
              </div>

              <div className="pt-3 border-t border-border-light space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-muted">المدفوع</span>
                  <span className="text-[12.5px] font-semibold text-text">{fmtSAR(v.paid)}</span>
                </div>
                {v.outstanding > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-amber-700">المستحق</span>
                    <span className="text-[12.5px] font-bold text-amber-700">{fmtSAR(v.outstanding)}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title={search ? 'لا يوجد مورد بهذا الاسم' : 'لا توجد ملفات بعد'}
          hint={search ? 'جرّب كلمة بحث أخرى' : 'ارفع فاتورة أو أصدر سنداً وسيظهر ملف المورد هنا'}
        />
      )}
    </div>
  )
}
