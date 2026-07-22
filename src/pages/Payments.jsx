import {
  Receipt, Search, Loader2, Check, CreditCard, RefreshCw, X, Square, CheckSquare, Minus,
  History, Wallet, ChevronLeft, Pencil, Trash2, FileText, Building2, ArrowRight, ChevronDown,
} from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { getBills, getAccounts, createBillPayment, updateBillPayment, deleteBillPayment } from '../lib/api'
import { supabase } from '../lib/supabase'

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
}
function billTotal(bill) {
  return Number(bill.total ?? bill.grand_total ?? bill.total_price ?? bill.amount ?? 0)
}
function vendorName(bill) {
  return bill.contact?.name || bill.contact?.organization || bill.vendor_name || '—'
}

const PAYMENT_KEYWORDS = ['صيانة', 'راجحي', 'نقدية', 'خزينة']

function Checkbox({ checked, indeterminate, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center justify-center w-5 h-5">
      {indeterminate
        ? <div className="w-4 h-4 rounded bg-primary flex items-center justify-center"><Minus className="w-2.5 h-2.5 text-white" strokeWidth={3} /></div>
        : checked ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-text-muted/40" />}
    </button>
  )
}

// Multi-select dropdown with search — stays open while checking, shows a count badge.
function VendorMultiSelect({ options, selected, onToggle, onClear, placeholder }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = query.trim() ? options.filter(o => o.includes(query.trim())) : options
  const count = selected.size

  return (
    <div ref={ref} className="relative w-64">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between border rounded-xl py-2 px-3 text-[13px] transition-colors ${
          open ? 'bg-white border-primary/50 ring-1 ring-primary/10'
            : count > 0 ? 'bg-primary-50 border-primary/30 text-primary-dark' : 'bg-surface-light border-border-light text-text-muted'
        }`}>
        <span className="flex items-center gap-1.5 truncate">
          {placeholder}
          {count > 0 && <span className="bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shrink-0">{count}</span>}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-border-light rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border-light">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث..." autoFocus
                className="w-full bg-surface-light rounded-lg py-1.5 pr-8 pl-2.5 text-[12px] text-text placeholder-text-muted focus:outline-none" />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length > 0 ? filtered.map(o => {
              const isSel = selected.has(o)
              return (
                <button key={o} type="button" onClick={() => onToggle(o)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-right hover:bg-surface-light/60 transition-colors">
                  {isSel ? <CheckSquare className="w-4 h-4 text-primary shrink-0" /> : <Square className="w-4 h-4 text-text-muted/40 shrink-0" />}
                  <span className={`truncate ${isSel ? 'text-text font-medium' : 'text-text-secondary'}`}>{o}</span>
                </button>
              )
            }) : <p className="px-3 py-4 text-center text-[12px] text-text-muted">لا توجد نتائج</p>}
          </div>
          {count > 0 && (
            <div className="border-t border-border-light px-3 py-2 flex items-center justify-between">
              <span className="text-[11px] text-text-muted">{count} محدد</span>
              <button onClick={onClear} className="text-[11px] text-red-400 hover:text-red-600">مسح الكل</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── PAGE ─────────────────────────── */
export default function Payments() {
  const [tab, setTab] = useState('pay')
  const [accounts, setAccounts] = useState([])

  useEffect(() => {
    getAccounts().then(r => setAccounts(r.accounts || [])).catch(() => {})
  }, [])

  const paymentAccounts = useMemo(() => {
    const matched = accounts.filter(a => PAYMENT_KEYWORDS.some(kw => a.name?.includes(kw)))
    return matched.length ? matched : accounts
  }, [accounts])

  return (
    <div className="w-full animate-page">
      <div className="mb-5">
        <h1 className="text-lg sm:text-xl font-bold text-text">سندات الصرف</h1>
        <p className="text-xs sm:text-sm text-text-muted mt-1">دفع الفواتير غير المدفوعة وإدارة السندات المرسلة</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-light border border-border-light rounded-2xl w-full sm:w-fit mb-5">
        {[
          { key: 'pay', label: 'دفع الفواتير', icon: Wallet },
          { key: 'history', label: 'سجل السندات', icon: History },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
              tab === t.key ? 'bg-white text-primary-dark shadow-sm' : 'text-text-muted hover:text-text'
            }`}>
            <t.icon className="w-4 h-4" strokeWidth={2} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pay'
        ? <PaySection paymentAccounts={paymentAccounts} />
        : <HistorySection paymentAccounts={paymentAccounts} />}
    </div>
  )
}

/* ─────────────────────── SECTION 1: PAY ─────────────────────── */
function PaySection({ paymentAccounts }) {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState(null)

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [vendorMode, setVendorMode] = useState('exclude')   // 'exclude' | 'only'
  const [filterVendors, setFilterVendors] = useState(new Set())

  const [selected, setSelected] = useState(new Set())
  const [paying, setPaying] = useState({})
  const [errors, setErrors] = useState({})

  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkPaying, setBulkPaying] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })

  const load = async () => {
    setLoading(true); setSelected(new Set())
    try { setBills((await getBills()).bills || []) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const allVendors = useMemo(() => {
    const seen = new Set()
    bills.forEach(b => { const v = vendorName(b); if (v !== '—') seen.add(v) })
    return [...seen].sort()
  }, [bills])

  const accountName = (id) => paymentAccounts.find(a => a.id === id)?.name || ''

  const filtered = useMemo(() => bills.filter(b => {
    const vname = vendorName(b)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!vname.toLowerCase().includes(q) && !String(b.reference || '').toLowerCase().includes(q)) return false
    }
    if (dateFrom && b.issue_date && b.issue_date < dateFrom) return false
    if (dateTo && b.issue_date && b.issue_date > dateTo) return false
    if (filterVendors.size > 0) {
      if (vendorMode === 'exclude' && filterVendors.has(vname)) return false
      if (vendorMode === 'only' && !filterVendors.has(vname)) return false
    }
    return true
  }), [bills, search, dateFrom, dateTo, filterVendors, vendorMode])

  const totalFiltered = useMemo(() => filtered.reduce((s, b) => s + billTotal(b), 0), [filtered])
  const selectedInFiltered = useMemo(() => filtered.filter(b => selected.has(b.id)), [filtered, selected])
  const allSelected = filtered.length > 0 && selectedInFiltered.length === filtered.length
  const someSelected = selectedInFiltered.length > 0 && !allSelected
  const selectedTotal = useMemo(() => selectedInFiltered.reduce((s, b) => s + billTotal(b), 0), [selectedInFiltered])

  const toggleAll = () => setSelected(prev => {
    const n = new Set(prev)
    allSelected ? filtered.forEach(b => n.delete(b.id)) : filtered.forEach(b => n.add(b.id))
    return n
  })
  const toggleOne = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleVendor = (v) => setFilterVendors(prev => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n })
  const clearVendors = () => setFilterVendors(new Set())

  const payloadFor = (bill) => ({
    bill_id: bill.id,
    account_id: accountId,
    amount: billTotal(bill),
    date: bill.issue_date || new Date().toISOString().split('T')[0],
    reference: bill.reference || `PYT-${bill.id}`,
    vendor_name: vendorName(bill),
    invoice_number: bill.reference || '',
    account_name: accountName(accountId),
  })

  const pay = async (bill) => {
    const id = bill.id
    if (paying[id] !== 'confirm') { setPaying(p => ({ ...p, [id]: 'confirm' })); return }
    setPaying(p => ({ ...p, [id]: 'loading' }))
    setErrors(e => { const n = { ...e }; delete n[id]; return n })
    try {
      await createBillPayment(payloadFor(bill))
      setPaying(p => ({ ...p, [id]: 'done' }))
      setTimeout(() => {
        setBills(prev => prev.filter(b => b.id !== id))
        setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
        setPaying(p => { const n = { ...p }; delete n[id]; return n })
      }, 1200)
    } catch (e) {
      setErrors(err => ({ ...err, [id]: e.message }))
      setPaying(p => { const n = { ...p }; delete n[id]; return n })
    }
  }
  const cancelConfirm = (id) => setPaying(p => { const n = { ...p }; delete n[id]; return n })

  const bulkPay = async () => {
    const toBePaid = selectedInFiltered
    if (!toBePaid.length) return
    setBulkPaying(true); setBulkConfirm(false)
    setBulkProgress({ done: 0, total: toBePaid.length })
    const paidIds = []
    for (const bill of toBePaid) {
      try { await createBillPayment(payloadFor(bill)); paidIds.push(bill.id) } catch {}
      setBulkProgress(p => ({ ...p, done: p.done + 1 }))
    }
    setBills(prev => prev.filter(b => !paidIds.includes(b.id)))
    setSelected(new Set())
    setBulkPaying(false)
  }

  const hasFilters = search || dateFrom || dateTo || filterVendors.size > 0

  return (
    <>
      {/* Summary + refresh */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-xs sm:text-sm text-text-muted">
          {loading ? 'جارِ جلب الفواتير من قيود...'
            : filtered.length > 0 ? `${filtered.length} فاتورة غير مدفوعة · إجمالي ${fmt(totalFiltered)} ر.س`
            : 'لا توجد فواتير غير مدفوعة'}
        </p>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-[13px] text-text-secondary hover:text-text border border-border rounded-xl px-4 py-2 transition-colors shrink-0 disabled:opacity-40">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.8} /> تحديث
        </button>
      </div>

      {/* Account selector */}
      <div className={`rounded-xl px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-3 border ${accountId ? 'bg-surface-light border-border-light' : 'bg-amber-50 border-amber-200'}`}>
        <div className={`flex items-center gap-2 text-[13px] font-medium shrink-0 ${accountId ? 'text-text-secondary' : 'text-amber-800'}`}>
          <CreditCard className="w-4 h-4" /> حساب الدفع:
        </div>
        <select value={accountId || ''} onChange={e => setAccountId(Number(e.target.value) || null)}
          className={`flex-1 bg-white border rounded-lg py-1.5 px-3 text-[13px] text-text focus:outline-none ${accountId ? 'border-border-light' : 'border-amber-200'}`}>
          <option value="">اختر حساب الدفع...</option>
          {paymentAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {!accountId && <p className="text-[11px] text-amber-700 shrink-0">اختر الحساب أولاً لتفعيل الدفع</p>}
      </div>

      {/* Filters */}
      <div className="relative z-30 bg-white border border-border-light rounded-2xl p-4 mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالمورد أو رقم الفاتورة..."
              className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 pr-10 pl-3.5 text-[13px] text-text placeholder-text-muted focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-text-muted">من</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} dir="ltr"
              className="bg-surface-light border border-border-light rounded-xl py-2 px-3 text-[13px] text-text focus:outline-none focus:border-primary/40" />
            <span className="text-[12px] text-text-muted">إلى</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} dir="ltr"
              className="bg-surface-light border border-border-light rounded-xl py-2 px-3 text-[13px] text-text focus:outline-none focus:border-primary/40" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }} className="p-1.5 rounded-lg hover:bg-surface-lighter text-text-muted hover:text-text"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </div>

        {/* Vendor filter — mode toggle + multi-select */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-text-muted shrink-0">تصفية بالمورد:</span>
          <div className="flex bg-surface-light border border-border-light rounded-lg p-0.5">
            <button onClick={() => setVendorMode('exclude')}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${vendorMode === 'exclude' ? 'bg-white text-primary-dark shadow-sm' : 'text-text-muted hover:text-text'}`}>استثناء</button>
            <button onClick={() => setVendorMode('only')}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${vendorMode === 'only' ? 'bg-white text-primary-dark shadow-sm' : 'text-text-muted hover:text-text'}`}>فقط هؤلاء</button>
          </div>
          <VendorMultiSelect
            options={allVendors}
            selected={filterVendors}
            onToggle={toggleVendor}
            onClear={clearVendors}
            placeholder={vendorMode === 'exclude' ? 'اختر موردين للاستثناء' : 'اختر موردين محددين'}
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedInFiltered.length > 0 && (
        <div className="bg-primary-50 border border-primary/20 rounded-2xl px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[13px] text-primary-dark font-medium">
            تم تحديد <span className="font-bold">{selectedInFiltered.length}</span> فاتورة · إجمالي <span className="font-bold">{fmt(selectedTotal)} ر.س</span>
          </p>
          <div className="flex items-center gap-2">
            {bulkConfirm ? (
              <>
                <span className="text-[12px] text-text-muted">تأكيد الدفع الجماعي؟</span>
                <button onClick={bulkPay} disabled={!accountId || bulkPaying}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-40">
                  {bulkPaying ? <><Loader2 className="w-4 h-4 animate-spin" /> جارِ الدفع... ({bulkProgress.done}/{bulkProgress.total})</> : <><Check className="w-4 h-4" /> نعم، دفع الكل</>}
                </button>
                <button onClick={() => setBulkConfirm(false)} className="text-[13px] text-text-muted border border-border rounded-xl px-4 py-2 hover:bg-surface-lighter">إلغاء</button>
              </>
            ) : (
              <>
                <button onClick={() => setBulkConfirm(true)} disabled={!accountId}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-40">
                  <CreditCard className="w-4 h-4" strokeWidth={2} /> دفع المحدد ({selectedInFiltered.length})
                </button>
                <button onClick={() => setSelected(new Set())} className="text-[13px] text-text-muted border border-border rounded-xl px-4 py-2 hover:bg-surface-lighter">إلغاء التحديد</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bills */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-[13px] text-text-muted">جارِ جلب الفواتير من قيود...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-2xl border border-border-light overflow-hidden">
          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light text-[12px] text-text-muted">
                  <th className="px-4 py-3 w-10"><Checkbox checked={allSelected} indeterminate={someSelected} onClick={toggleAll} /></th>
                  <th className="text-right font-medium px-4 py-3">المورد</th>
                  <th className="text-right font-medium px-4 py-3">رقم الفاتورة</th>
                  <th className="text-right font-medium px-4 py-3">التاريخ</th>
                  <th className="text-left font-medium px-4 py-3">المبلغ شامل الضريبة</th>
                  <th className="px-4 py-3 w-40"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bill, i) => {
                  const state = paying[bill.id]; const err = errors[bill.id]; const isSelected = selected.has(bill.id)
                  return (
                    <tr key={bill.id} className={`transition-colors ${state === 'done' ? 'bg-emerald-50' : isSelected ? 'bg-primary-50/40' : 'hover:bg-surface-light/50'} ${i !== filtered.length - 1 ? 'border-b border-border-light/60' : ''}`}>
                      <td className="px-4 py-3"><Checkbox checked={isSelected} indeterminate={false} onClick={() => toggleOne(bill.id)} /></td>
                      <td className="px-4 py-3 text-[13px] font-medium text-text">{vendorName(bill)}</td>
                      <td className="px-4 py-3 text-[13px] text-text-muted font-mono">{bill.reference || `#${bill.id}`}</td>
                      <td className="px-4 py-3 text-[13px] text-text-secondary">{fmtDate(bill.issue_date)}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-text text-left" dir="ltr">{fmt(billTotal(bill))} <span className="text-[10px] font-normal text-text-muted">ر.س</span></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-end gap-1">
                          {state === 'done' ? <span className="flex items-center gap-1 text-[12px] text-emerald-600 font-medium"><Check className="w-3.5 h-3.5" /> تم الدفع</span>
                            : state === 'loading' ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            : state === 'confirm' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-text-muted">تأكيد؟</span>
                                <button onClick={() => pay(bill)} className="text-[12px] bg-primary text-white px-3 py-1 rounded-lg hover:bg-primary-dark">نعم</button>
                                <button onClick={() => cancelConfirm(bill.id)} className="text-[12px] text-text-muted hover:text-text px-1">لا</button>
                              </div>
                            ) : (
                              <button onClick={() => pay(bill)} disabled={!accountId}
                                className="text-[12px] font-medium text-primary hover:text-primary-dark border border-primary/30 hover:border-primary/60 hover:bg-primary-50 rounded-lg px-4 py-1.5 transition-all disabled:opacity-25 disabled:cursor-not-allowed">دفع</button>
                            )}
                          {err && <p className="text-[10px] text-red-500 max-w-36 text-right leading-tight">{err}</p>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border-light">
              <Checkbox checked={allSelected} indeterminate={someSelected} onClick={toggleAll} />
              <span className="text-[12px] text-text-muted">{allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}</span>
            </div>
            <div className="divide-y divide-border-light/60">
              {filtered.map((bill) => {
                const state = paying[bill.id]; const err = errors[bill.id]; const isSelected = selected.has(bill.id)
                return (
                  <div key={bill.id} className={`p-4 ${state === 'done' ? 'bg-emerald-50' : isSelected ? 'bg-primary-50/30' : ''}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox checked={isSelected} indeterminate={false} onClick={() => toggleOne(bill.id)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-text truncate">{vendorName(bill)}</p>
                            <p className="text-[11px] text-text-muted mt-0.5">{bill.reference || `#${bill.id}`} · {fmtDate(bill.issue_date)}</p>
                            <p className="text-[13px] font-semibold text-text mt-1.5" dir="ltr">{fmt(billTotal(bill))} ر.س</p>
                          </div>
                          <div className="shrink-0">
                            {state === 'done' ? <span className="flex items-center gap-1 text-[12px] text-emerald-600"><Check className="w-3.5 h-3.5" /> تم</span>
                              : state === 'loading' ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
                              : state === 'confirm' ? (
                                <div className="flex gap-1.5">
                                  <button onClick={() => pay(bill)} className="text-[12px] bg-primary text-white px-3 py-1.5 rounded-lg">نعم</button>
                                  <button onClick={() => cancelConfirm(bill.id)} className="text-[12px] text-text-muted border border-border rounded-lg px-2.5 py-1.5">لا</button>
                                </div>
                              ) : (
                                <button onClick={() => pay(bill)} disabled={!accountId} className="text-[12px] font-medium text-primary border border-primary/30 rounded-lg px-4 py-1.5 disabled:opacity-25">دفع</button>
                              )}
                          </div>
                        </div>
                        {err && <p className="text-[10px] text-red-500 mt-1">{err}</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-light py-16 flex flex-col items-center gap-2">
          <Receipt className="w-8 h-8 text-text-muted/25 mb-1" />
          <p className="text-sm text-text-muted">{hasFilters ? 'لا توجد نتائج للفلتر الحالي' : 'كل الفواتير مدفوعة 🎉'}</p>
          {hasFilters && <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setFilterVendors(new Set()) }} className="text-[12px] text-primary hover:underline mt-1">مسح الفلاتر</button>}
        </div>
      )}
    </>
  )
}

/* ────────────────────── SECTION 2: HISTORY ────────────────────── */
function HistorySection({ paymentAccounts }) {
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading] = useState(true)
  const [openVendor, setOpenVendor] = useState(null)     // vendor name whose detail is open
  const [vendorSearch, setVendorSearch] = useState('')

  const load = () => {
    setLoading(true)
    supabase.from('sent_vouchers').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setVouchers(data || []))
      .then(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // Group by vendor
  const groups = useMemo(() => {
    const map = new Map()
    for (const v of vouchers) {
      const name = v.vendor_name || 'بدون مورد'
      if (!map.has(name)) map.set(name, { name, count: 0, total: 0, items: [] })
      const g = map.get(name)
      g.count++; g.total += Number(v.amount || 0); g.items.push(v)
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [vouchers])

  const visibleGroups = useMemo(() => {
    if (!vendorSearch.trim()) return groups
    const q = vendorSearch.trim().toLowerCase()
    return groups.filter(g => g.name.toLowerCase().includes(q))
  }, [groups, vendorSearch])

  const activeGroup = openVendor ? groups.find(g => g.name === openVendor) : null

  if (loading) {
    return <div className="flex flex-col items-center justify-center py-20 gap-3"><Loader2 className="w-6 h-6 text-primary animate-spin" /><p className="text-[13px] text-text-muted">جارِ تحميل السجل...</p></div>
  }

  if (activeGroup) {
    return <VendorDetail group={activeGroup} paymentAccounts={paymentAccounts} onBack={() => setOpenVendor(null)} onChanged={load} />
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-xs sm:text-sm text-text-muted">
          {vouchers.length > 0 ? `${groups.length} مورد · ${vouchers.length} سند مرسل` : 'لا توجد سندات مرسلة بعد'}
        </p>
        <button onClick={load} className="flex items-center gap-2 text-[13px] text-text-secondary hover:text-text border border-border rounded-xl px-4 py-2 transition-colors shrink-0">
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} /> تحديث
        </button>
      </div>

      {vouchers.length > 0 && (
        <div className="relative mb-4 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
          <input value={vendorSearch} onChange={e => setVendorSearch(e.target.value)} placeholder="ابحث عن مورد..."
            className="w-full bg-white border border-border-light rounded-xl py-2.5 pr-10 pl-3.5 text-[13px] text-text placeholder-text-muted focus:outline-none focus:border-primary/40" />
        </div>
      )}

      {visibleGroups.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleGroups.map(g => (
            <button key={g.name} onClick={() => { setOpenVendor(g.name); setVendorSearch('') }}
              className="group text-right bg-white border border-border-light rounded-2xl p-4 hover:border-primary/40 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" strokeWidth={1.8} />
                </div>
                <ArrowRight className="w-4 h-4 text-text-muted/40 group-hover:text-primary group-hover:-translate-x-0.5 transition-all mt-1" />
              </div>
              <p className="text-[14px] font-semibold text-text truncate">{g.name}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-text-muted">{g.count} سند</span>
                <span className="text-[13px] font-bold text-primary-dark" dir="ltr">{fmt(g.total)} <span className="text-[10px] font-normal text-text-muted">ر.س</span></span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-light py-16 flex flex-col items-center gap-2">
          <History className="w-8 h-8 text-text-muted/25 mb-1" />
          <p className="text-sm text-text-muted">{vendorSearch ? 'لا يوجد مورد بهذا الاسم' : 'لم تُرسل أي سندات من رصد بعد'}</p>
          {!vendorSearch && <p className="text-[12px] text-text-muted/70">ادفع فاتورة من قسم «دفع الفواتير» وستظهر هنا</p>}
        </div>
      )}
    </>
  )
}

/* ─────────── Vendor detail: vouchers list + edit/delete ─────────── */
function VendorDetail({ group, paymentAccounts, onBack, onChanged }) {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)     // voucher object
  const [deleting, setDeleting] = useState(null)   // voucher id being deleted
  const [busyErr, setBusyErr] = useState({})

  const filtered = useMemo(() => {
    if (!search.trim()) return group.items
    const q = search.trim().toLowerCase()
    return group.items.filter(v =>
      String(v.reference || '').toLowerCase().includes(q) ||
      String(v.invoice_number || '').toLowerCase().includes(q) ||
      String(v.amount || '').includes(q)
    )
  }, [group.items, search])

  const doDelete = async (v) => {
    if (deleting !== v.id) { setDeleting(v.id); return }
    setBusyErr(e => { const n = { ...e }; delete n[v.id]; return n })
    try {
      await deleteBillPayment(v.qoyod_receipt_id)
      onChanged()
    } catch (e) {
      setBusyErr(err => ({ ...err, [v.id]: e.message }))
      setDeleting(null)
    }
  }

  return (
    <>
      <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text mb-4">
        <ChevronLeft className="w-4 h-4" /> رجوع لكل الموردين
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5 text-primary" strokeWidth={1.8} /></div>
          <div>
            <h2 className="text-[15px] font-bold text-text">{group.name}</h2>
            <p className="text-[12px] text-text-muted">{group.count} سند · إجمالي {fmt(group.total)} ر.س</p>
          </div>
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث برقم السند أو الفاتورة..."
            className="w-full bg-white border border-border-light rounded-xl py-2.5 pr-10 pl-3.5 text-[13px] text-text placeholder-text-muted focus:outline-none focus:border-primary/40" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border-light overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-light text-[12px] text-text-muted">
                <th className="text-right font-medium px-4 py-3">رقم السند</th>
                <th className="text-right font-medium px-4 py-3">رقم الفاتورة</th>
                <th className="text-right font-medium px-4 py-3">التاريخ</th>
                <th className="text-right font-medium px-4 py-3">الحساب</th>
                <th className="text-left font-medium px-4 py-3">المبلغ</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => (
                <tr key={v.id} className={`transition-colors hover:bg-surface-light/50 ${i !== filtered.length - 1 ? 'border-b border-border-light/60' : ''}`}>
                  <td className="px-4 py-3 text-[13px] font-mono text-text-muted">{v.reference || `#${v.qoyod_receipt_id}`}</td>
                  <td className="px-4 py-3 text-[13px] text-text-secondary font-mono">{v.invoice_number || '—'}</td>
                  <td className="px-4 py-3 text-[13px] text-text-secondary">{fmtDate(v.payment_date)}</td>
                  <td className="px-4 py-3 text-[13px] text-text-secondary">{v.account_name || '—'}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-text text-left" dir="ltr">{fmt(v.amount)} <span className="text-[10px] font-normal text-text-muted">ر.س</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {deleting === v.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-red-500">حذف؟</span>
                          <button onClick={() => doDelete(v)} className="text-[11px] bg-red-500 text-white px-2.5 py-1 rounded-lg hover:bg-red-600">نعم</button>
                          <button onClick={() => setDeleting(null)} className="text-[11px] text-text-muted px-1">لا</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setEditing(v)} title="تعديل" className="p-1.5 rounded-lg hover:bg-surface-lighter text-text-muted hover:text-primary transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => doDelete(v)} title="حذف" className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </div>
                    {busyErr[v.id] && <p className="text-[10px] text-red-500 text-left mt-1">{busyErr[v.id]}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-12 text-center text-[13px] text-text-muted">لا توجد نتائج</div>}
      </div>

      {editing && (
        <EditVoucherModal voucher={editing} paymentAccounts={paymentAccounts}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChanged() }} />
      )}
    </>
  )
}

/* ─────────────────── Edit voucher modal ─────────────────── */
function EditVoucherModal({ voucher, paymentAccounts, onClose, onSaved }) {
  const [amount, setAmount] = useState(voucher.amount ?? '')
  const [date, setDate] = useState(voucher.payment_date || '')
  const [accountId, setAccountId] = useState(voucher.account_id || null)
  const [reference, setReference] = useState(voucher.reference || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    if (!amount || Number(amount) <= 0) return setError('أدخل مبلغاً صحيحاً')
    setSaving(true); setError(null)
    try {
      await updateBillPayment(voucher.qoyod_receipt_id, {
        amount: Number(amount),
        date,
        account_id: accountId,
        account_name: paymentAccounts.find(a => a.id === accountId)?.name || voucher.account_name,
        reference,
      })
      onSaved()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <h3 className="text-sm font-semibold text-text">تعديل السند</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-lighter"><X className="w-4 h-4 text-text-muted" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-surface-light rounded-xl px-3 py-2 text-[12px] text-text-muted">
            <span className="text-text-secondary">{voucher.vendor_name}</span>
            {voucher.invoice_number && <> · فاتورة {voucher.invoice_number}</>}
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text mb-1.5">المبلغ *</label>
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} dir="ltr"
              className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text mb-1.5">تاريخ الدفع</label>
            <input type="date" value={date || ''} onChange={e => setDate(e.target.value)} dir="ltr"
              className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text mb-1.5">حساب الدفع</label>
            <select value={accountId || ''} onChange={e => setAccountId(Number(e.target.value) || null)}
              className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text focus:outline-none focus:border-primary/50">
              <option value="">— اختر —</option>
              {paymentAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text mb-1.5">رقم السند / المرجع</label>
            <input value={reference} onChange={e => setReference(e.target.value)}
              className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text focus:outline-none focus:border-primary/50" />
          </div>
          {error && <p className="text-[11px] text-red-500">{error}</p>}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-[13px] py-2.5 rounded-xl transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'جارِ الحفظ...' : 'حفظ التعديلات'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-border text-text-secondary text-[13px] font-medium hover:bg-surface-lighter">إلغاء</button>
        </div>
      </div>
    </div>
  )
}
