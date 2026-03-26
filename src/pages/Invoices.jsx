import { Search, FileText, Loader2, CheckCircle2, Clock, CreditCard, AlertCircle } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const STATUS = {
  pushed: { label: 'معتمدة', color: 'bg-primary-50 text-primary-dark', icon: CheckCircle2 },
  scanned: { label: 'مقروءة', color: 'bg-blue-50 text-blue-700', icon: Clock },
  matched: { label: 'مطابقة', color: 'bg-amber-50 text-amber-700', icon: Clock },
  paid: { label: 'مدفوعة', color: 'bg-emerald-50 text-emerald-700', icon: CreditCard },
  error: { label: 'خطأ', color: 'bg-red-50 text-red-600', icon: AlertCircle },
}

const TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'pushed', label: 'معتمدة' },
  { key: 'paid', label: 'مدفوعة' },
  { key: 'scanned', label: 'مقروءة' },
  { key: 'error', label: 'خطأ' },
]

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')

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
    return result
  }, [invoices, tab, search])

  const tabCount = (key) => {
    if (key === 'all') return invoices.length
    return invoices.filter(i => i.status === key).length
  }

  const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-CA')
  }

  const totalAmount = filtered.reduce((s, i) => s + (Number(i.total_amount) || 0), 0)

  return (
    <div className="max-w-5xl animate-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-text">الفواتير</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">الفواتير المرفوعة من النظام</p>
        </div>
        {filtered.length > 0 && (
          <div className="bg-white border border-border-light rounded-xl px-4 py-2 self-start sm:self-auto">
            <p className="text-[11px] text-text-muted">إجمالي المعروض</p>
            <p className="text-base font-bold text-text">{totalAmount.toLocaleString('en-US')} <span className="text-xs text-text-muted">ر.س</span></p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border-light p-4 mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالمورد أو رقم الفاتورة..."
            className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 pr-10 pl-3.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-0.5">
          {TABS.map(t => {
            const count = tabCount(t.key)
            if (t.key !== 'all' && count === 0) return null
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors ${
                  tab === t.key ? 'bg-primary-50 text-primary-dark' : 'text-text-muted hover:bg-surface-lighter'
                }`}
              >
                {t.label}
                <span className={`text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                  tab === t.key ? 'bg-primary/10 text-primary' : 'bg-surface-lighter text-text-muted'
                }`}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-2xl border border-border-light overflow-hidden">
          {/* Desktop */}
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light text-[12px] text-text-muted">
                  <th className="text-right font-medium px-5 py-3">المورد</th>
                  <th className="text-right font-medium px-5 py-3">رقم الفاتورة</th>
                  <th className="text-right font-medium px-5 py-3">التاريخ</th>
                  <th className="text-right font-medium px-5 py-3">المبلغ</th>
                  <th className="text-right font-medium px-5 py-3">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, i) => {
                  const s = STATUS[inv.status] || STATUS.scanned
                  return (
                    <tr key={inv.id} className={`hover:bg-primary-50/20 transition-colors ${i !== filtered.length - 1 ? 'border-b border-border-light/60' : ''}`}>
                      <td className="px-5 py-3 text-[13px] font-medium text-text">{inv.vendor_name || '—'}</td>
                      <td className="px-5 py-3 text-[13px] text-text-muted font-mono">{inv.invoice_number || '—'}</td>
                      <td className="px-5 py-3 text-[13px] text-text-secondary">{formatDate(inv.invoice_date)}</td>
                      <td className="px-5 py-3 text-[13px] font-semibold text-text">
                        {Number(inv.total_amount || 0).toLocaleString('en-US')} <span className="text-text-muted text-[10px]">ر.س</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden divide-y divide-border-light/60">
            {filtered.map((inv) => {
              const s = STATUS[inv.status] || STATUS.scanned
              return (
                <div key={inv.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-text truncate">{inv.vendor_name || '—'}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">{inv.invoice_number || '—'} · {formatDate(inv.invoice_date)}</p>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${s.color}`}>
                      {s.label}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-text">
                    {Number(inv.total_amount || 0).toLocaleString('en-US')} ر.س
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-light py-16 flex flex-col items-center">
          <FileText className="w-8 h-8 text-text-muted/30 mb-3" />
          <p className="text-sm text-text-muted">{search || tab !== 'all' ? 'لا توجد نتائج' : 'لا توجد فواتير بعد'}</p>
          <p className="text-xs text-text-muted mt-1">ارفع فاتورة من صفحة "رفع الفواتير"</p>
        </div>
      )}
    </div>
  )
}
