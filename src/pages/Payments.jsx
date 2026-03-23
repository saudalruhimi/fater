import {
  Receipt, Plus, Search, Loader2, X, Check, CreditCard, Calendar,
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { getBillPayments, createBillPayment, getAccounts } from '../lib/api'
import { supabase } from '../lib/supabase'
import SearchableSelect from '../components/SearchableSelect'

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-lighter"><X className="w-4 h-4 text-text-muted" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-CA')
}

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Create form
  const [addOpen, setAddOpen] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [form, setForm] = useState({ bill_id: null, account_id: null, amount: '', payment_date: new Date().toISOString().split('T')[0], reference: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true)
    getBillPayments()
      .then((res) => setPayments(res.payments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return payments
    const q = search.trim().toLowerCase()
    return payments.filter(p =>
      p.reference?.toLowerCase().includes(q) ||
      String(p.bill_id)?.includes(q) ||
      String(p.amount)?.includes(q)
    )
  }, [payments, search])

  const openAdd = async () => {
    setError(null)
    setForm({ bill_id: null, account_id: null, amount: '', payment_date: new Date().toISOString().split('T')[0], reference: '' })
    setAddOpen(true)

    // Load accounts that accept payments + invoices from supabase
    try {
      const [accRes, invRes] = await Promise.all([
        getAccounts(),
        supabase.from('processed_invoices').select('qoyod_bill_id, vendor_name, invoice_number, total_amount').eq('status', 'pushed').order('created_at', { ascending: false }),
      ])
      // Filter accounts that can receive payments (Asset accounts with bank/cash/نقد keywords)
      // Only show actual payment accounts (cash + bank)
      const payableAccounts = (accRes.accounts || []).filter(a => [7, 8, 88].includes(a.id))
      setAccounts(payableAccounts)
      setInvoices(invRes.data || [])
    } catch {}
  }

  const handleAdd = async () => {
    if (!form.bill_id) return setError('اختر الفاتورة')
    if (!form.account_id) return setError('اختر حساب الدفع')
    if (!form.amount || Number(form.amount) <= 0) return setError('أدخل المبلغ')
    if (!form.payment_date) return setError('اختر التاريخ')
    if (!form.reference.trim()) form.reference = `PYT-${Date.now()}`

    setSaving(true); setError(null)
    try {
      await createBillPayment({
        bill_id: form.bill_id,
        account_id: form.account_id,
        amount: Number(form.amount),
        date: form.payment_date,
        reference: form.reference,
      })
      setAddOpen(false)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const selectedInvoice = invoices.find(i => i.qoyod_bill_id === form.bill_id)

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-text">سندات الصرف</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">إنشاء وعرض سندات الصرف</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-[13px] font-semibold py-2.5 px-5 rounded-xl transition-colors self-start sm:self-auto">
          <Plus className="w-4 h-4" strokeWidth={2.2} />
          إنشاء سند صرف
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالمرجع أو المبلغ..."
          className="w-full bg-white border border-border-light rounded-xl py-2.5 pr-10 pl-3.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/40 transition-colors" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-2xl border border-border-light overflow-hidden">
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light text-[12px] text-text-muted">
                  <th className="text-right font-medium px-5 py-3">رقم الفاتورة</th>
                  <th className="text-right font-medium px-5 py-3">المبلغ</th>
                  <th className="text-right font-medium px-5 py-3">الحساب</th>
                  <th className="text-right font-medium px-5 py-3">التاريخ</th>
                  <th className="text-right font-medium px-5 py-3">المرجع</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id || i} className={`hover:bg-primary-50/20 transition-colors ${i !== filtered.length - 1 ? 'border-b border-border-light/60' : ''}`}>
                    <td className="px-5 py-3 text-[13px] font-mono text-text-muted">{p.bill_id || '—'}</td>
                    <td className="px-5 py-3 text-[13px] font-semibold text-text">{Number(p.amount || 0).toLocaleString('en-US')} <span className="text-[10px] text-text-muted">ر.س</span></td>
                    <td className="px-5 py-3 text-[13px] text-text-secondary">{p.account_name || p.account_id || '—'}</td>
                    <td className="px-5 py-3 text-[13px] text-text-secondary">{formatDate(p.payment_date)}</td>
                    <td className="px-5 py-3 text-[13px] text-text-muted">{p.reference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-border-light/60">
            {filtered.map((p, i) => (
              <div key={p.id || i} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold text-text">{Number(p.amount || 0).toLocaleString('en-US')} ر.س</span>
                  <span className="text-[11px] text-text-muted">{formatDate(p.payment_date)}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-text-muted">
                  <span>فاتورة #{p.bill_id}</span>
                  {p.reference && <><span className="w-1 h-1 rounded-full bg-border" /><span>{p.reference}</span></>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-light py-16 flex flex-col items-center">
          <Receipt className="w-8 h-8 text-text-muted/30 mb-3" />
          <p className="text-sm text-text-muted">{search ? 'لا توجد نتائج' : 'لا توجد سندات صرف'}</p>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إنشاء سند صرف">
        <div className="space-y-4">
          {/* Invoice select */}
          <div>
            <label className="block text-[13px] font-medium text-text mb-1.5">الفاتورة *</label>
            <SearchableSelect
              options={invoices.map(inv => ({
                id: inv.qoyod_bill_id,
                label: `${inv.vendor_name || 'فاتورة'} — ${inv.invoice_number || ''} — ${Number(inv.total_amount || 0).toLocaleString('en-US')} ر.س`,
              }))}
              value={form.bill_id}
              onChange={(id) => {
                const inv = invoices.find(i => i.qoyod_bill_id === id)
                setForm({ ...form, bill_id: id, amount: inv?.total_amount || form.amount })
              }}
              placeholder="اختر الفاتورة"
              error={!form.bill_id}
            />
          </div>

          {/* Account select */}
          <div>
            <label className="block text-[13px] font-medium text-text mb-1.5">حساب الدفع *</label>
            <SearchableSelect
              options={accounts.map(a => ({ id: a.id, label: `${a.name} (${a.type})` }))}
              value={form.account_id}
              onChange={(id) => setForm({ ...form, account_id: id })}
              placeholder="اختر الحساب"
              error={!form.account_id}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[13px] font-medium text-text mb-1.5">المبلغ *</label>
            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text focus:outline-none focus:border-primary/50" dir="ltr" />
          </div>

          {/* Date */}
          <div>
            <label className="block text-[13px] font-medium text-text mb-1.5">تاريخ الدفع *</label>
            <input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
              className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text focus:outline-none focus:border-primary/50" dir="ltr" />
          </div>

          {/* Reference */}
          <div>
            <label className="block text-[13px] font-medium text-text mb-1.5">المرجع</label>
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="رقم الحوالة أو الشيك"
              className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/50" />
          </div>
        </div>

        {error && <p className="text-[11px] text-red-500 mt-3">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button onClick={handleAdd} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-[13px] py-2.5 rounded-xl transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'جارِ الإنشاء...' : 'إنشاء سند الصرف'}
          </button>
          <button onClick={() => setAddOpen(false)}
            className="px-5 py-2.5 rounded-xl border border-border text-text-secondary text-[13px] font-medium hover:bg-surface-lighter">إلغاء</button>
        </div>
      </Modal>
    </div>
  )
}
