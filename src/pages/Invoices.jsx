import { Search, FileText, Loader2, SlidersHorizontal, X } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader, PillTabs, EmptyState, ledger, field } from '../components/ui'

const STATUS = {
  pushed: { label: 'معتمدة', color: 'bg-primary-50 text-primary-dark' },
  scanned: { label: 'مقروءة', color: 'bg-blue-50 text-blue-700' },
  matched: { label: 'مطابقة', color: 'bg-amber-50 text-amber-700' },
  paid: { label: 'مدفوعة', color: 'bg-emerald-50 text-emerald-700' },
  error: { label: 'خطأ', color: 'bg-red-50 text-red-600' },
}

const TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'pushed', label: 'معتمدة' },
  { key: 'paid', label: 'مدفوعة' },
  { key: 'scanned', label: 'مقروءة' },
  { key: 'error', label: 'خطأ' },
]

const PAGE_SIZES = [10, 15, 20, 30]

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [vendorQ, setVendorQ] = useState('')
  const [invoiceNumQ, setInvoiceNumQ] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [pageSize, setPageSize] = useState(15)
  const [page, setPage] = useState(1)

  useEffect(() => {
    supabase
      .from('processed_invoices')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setInvoices(data || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = invoices
    if (tab !== 'all') result = result.filter(i => i.status === tab)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(i =>
        i.vendor_name?.toLowerCase().includes(q) ||
        i.invoice_number?.toLowerCase().includes(q)
      )
    }
    if (vendorQ.trim()) {
      const q = vendorQ.trim().toLowerCase()
      result = result.filter(i => i.vendor_name?.toLowerCase().includes(q))
    }
    if (invoiceNumQ.trim()) {
      const q = invoiceNumQ.trim().toLowerCase()
      result = result.filter(i => i.invoice_number?.toLowerCase().includes(q))
    }
    if (dateFrom) result = result.filter(i => i.invoice_date && i.invoice_date >= dateFrom)
    if (dateTo) result = result.filter(i => i.invoice_date && i.invoice_date <= dateTo)
    if (minAmount) result = result.filter(i => Number(i.total_amount || 0) >= Number(minAmount))
    if (maxAmount) result = result.filter(i => Number(i.total_amount || 0) <= Number(maxAmount))
    return result
  }, [invoices, tab, search, vendorQ, invoiceNumQ, dateFrom, dateTo, minAmount, maxAmount])

  useEffect(() => { setPage(1) }, [tab, search, vendorQ, invoiceNumQ, dateFrom, dateTo, minAmount, maxAmount, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const totalAmount = useMemo(() => filtered.reduce((s, i) => s + Number(i.total_amount || 0), 0), [filtered])

  const tabCount = (key) => {
    if (key === 'all') return invoices.length
    return invoices.filter(i => i.status === key).length
  }

  const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-CA')
  }

  const hasActiveFilters = vendorQ || invoiceNumQ || dateFrom || dateTo || minAmount || maxAmount
  const activeFilterCount = [vendorQ, invoiceNumQ, dateFrom, dateTo, minAmount, maxAmount].filter(Boolean).length

  const resetFilters = () => {
    setVendorQ(''); setInvoiceNumQ(''); setDateFrom(''); setDateTo(''); setMinAmount(''); setMaxAmount('')
  }

  const visibleTabs = TABS.filter(t => t.key === 'all' || tabCount(t.key) > 0)
    .map(t => ({ ...t, count: tabCount(t.key) }))

  return (
    <div className="w-full animate-page">
      <PageHeader
        kicker="المحاسبة"
        title="الفواتير"
        description="كل الفواتير المرفوعة من رصد، بحالتها الحالية في قيود."
      >
        {/* Toolbar: tabs + search + filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالمورد أو رقم الفاتورة..."
                className="w-full bg-surface border border-border rounded-full py-2.5 pr-10 pl-4 text-[13px] text-text placeholder-text-muted focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-[12px] font-semibold transition-colors border ${
                showFilters || hasActiveFilters
                  ? 'bg-text text-bg border-text'
                  : 'bg-surface border-border text-text-secondary hover:text-text hover:bg-surface-lighter'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" strokeWidth={1.8} />
              فلترة
              {activeFilterCount > 0 && (
                <span className={`text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 ${showFilters || hasActiveFilters ? 'bg-bg/20 text-bg' : 'bg-primary text-white'}`}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-2xl border border-border bg-surface">
              <div>
                <label className={field.label}>اسم المورد</label>
                <input value={vendorQ} onChange={(e) => setVendorQ(e.target.value)} placeholder="بحث باسم المورد..." className={field.input} />
              </div>
              <div>
                <label className={field.label}>رقم الفاتورة</label>
                <input value={invoiceNumQ} onChange={(e) => setInvoiceNumQ(e.target.value)} placeholder="بحث برقم الفاتورة..." className={field.input} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={field.label}>من تاريخ</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} dir="ltr" className={field.input} />
                </div>
                <div>
                  <label className={field.label}>إلى تاريخ</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} dir="ltr" className={field.input} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
                <div>
                  <label className={field.label}>الحد الأدنى للمبلغ</label>
                  <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" dir="ltr" className={field.input} />
                </div>
                <div>
                  <label className={field.label}>الحد الأعلى للمبلغ</label>
                  <input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="∞" dir="ltr" className={field.input} />
                </div>
              </div>
              {hasActiveFilters && (
                <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                  <button onClick={resetFilters} className="flex items-center gap-1.5 text-[12px] text-red-500 hover:text-red-600 transition-colors">
                    <X className="w-3.5 h-3.5" strokeWidth={2} />
                    مسح الفلاتر
                  </button>
                </div>
              )}
            </div>
          )}

          <PillTabs tabs={visibleTabs} active={tab} onChange={setTab} />
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <>
          {/* Desktop — ledger table */}
          <div className={`hidden sm:block ${ledger.wrap}`}>
            <table className={ledger.table}>
              <thead>
                <tr className={ledger.headRow}>
                  <th className={`${ledger.th} w-8`}>#</th>
                  <th className={ledger.th}>المورد</th>
                  <th className={ledger.th}>رقم الفاتورة</th>
                  <th className={ledger.th}>التاريخ</th>
                  <th className={`${ledger.th} text-left`}>المبلغ</th>
                  <th className={ledger.th}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((inv, i) => {
                  const s = STATUS[inv.status] || STATUS.scanned
                  return (
                    <tr key={inv.id} className={ledger.row}>
                      <td className={`${ledger.td} text-text-muted text-[11px]`}>{(page - 1) * pageSize + i + 1}</td>
                      <td className={`${ledger.td} font-semibold text-text`}>{inv.vendor_name || '—'}</td>
                      <td className={`${ledger.td} text-text-muted font-mono text-[12px]`}>{inv.invoice_number || '—'}</td>
                      <td className={`${ledger.td} text-text-secondary`}>{formatDate(inv.invoice_date)}</td>
                      <td className={`${ledger.td} text-left font-semibold text-text whitespace-nowrap`}>
                        {Number(inv.total_amount || 0).toLocaleString('en-US')} <span className="text-text-muted text-[10px] font-normal">ر.س</span>
                      </td>
                      <td className={ledger.td}>
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-text">
                  <td colSpan={4} className="px-3 py-3 text-[12px] font-bold text-text">
                    الإجمالي — {filtered.length} فاتورة
                  </td>
                  <td className="px-3 py-3 text-left text-[13px] font-bold text-text whitespace-nowrap">
                    {totalAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} <span className="text-text-muted text-[10px] font-normal">ر.س</span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile — stacked rows */}
          <div className="sm:hidden border-t-2 border-text">
            {paginated.map((inv) => {
              const s = STATUS[inv.status] || STATUS.scanned
              return (
                <div key={inv.id} className="py-3.5 border-b border-border-light">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-text truncate">{inv.vendor_name || '—'}</p>
                      <p className="text-[11px] text-text-muted mt-0.5 font-mono">{inv.invoice_number || '—'} · {formatDate(inv.invoice_date)}</p>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${s.color}`}>
                      {s.label}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-text">
                    {Number(inv.total_amount || 0).toLocaleString('en-US')} <span className="text-[10px] font-normal text-text-muted">ر.س</span>
                  </p>
                </div>
              )
            })}
            <div className="py-3 flex items-center justify-between text-[12px] font-bold text-text border-b-2 border-text">
              <span>الإجمالي — {filtered.length} فاتورة</span>
              <span>{totalAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س</span>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5">
            <div className="flex items-center gap-2 text-[12px] text-text-muted">
              <span>عرض</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-surface border border-border rounded-full py-1.5 px-3 text-[12px] text-text focus:outline-none focus:border-primary/40"
              >
                {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>من {filtered.length}</span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-1.5 rounded-full text-[12px] font-medium border border-border text-text-secondary hover:bg-surface-lighter disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  السابق
                </button>
                <span className="px-3 py-1.5 text-[12px] text-text font-mono" dir="ltr">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-1.5 rounded-full text-[12px] font-medium border border-border text-text-secondary hover:bg-surface-lighter disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  التالي
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState
          icon={FileText}
          title={search || tab !== 'all' || hasActiveFilters ? 'لا توجد نتائج' : 'لا توجد فواتير بعد'}
          hint={search || tab !== 'all' || hasActiveFilters ? 'جرّب تغيير البحث أو الفلاتر' : 'ارفع فاتورة من صفحة «رفع الفواتير»'}
        />
      )}
    </div>
  )
}
