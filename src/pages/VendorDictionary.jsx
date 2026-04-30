import {
  Search, Plus, Pencil, Trash2, X, BookOpen, Loader2, Users,
} from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { getVendorMappings, createVendorMapping, updateVendorMapping, deleteVendorMapping, getVendors } from '../lib/api'
import SearchableSelect from '../components/SearchableSelect'
import { useToast, parseError } from '../contexts/ToastContext.jsx'

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-lighter transition-colors">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Form({ form, setForm, vendorOptions }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-text mb-1.5">اسم المورد كما يكتب بالفاتورة</label>
        <input
          value={form.invoice_vendor_name}
          onChange={(e) => setForm({ ...form, invoice_vendor_name: e.target.value })}
          placeholder="مثال: شركة اسمنت المدينة"
          className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:border-primary/40"
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-text mb-1.5">المورد المقابل في قيود</label>
        <SearchableSelect
          options={vendorOptions}
          value={form.qoyod_vendor_id}
          onChange={(id) => {
            const v = vendorOptions.find((v) => v.id === id)
            setForm({ ...form, qoyod_vendor_id: id, qoyod_vendor_name: v?.label || '' })
          }}
          placeholder="-- اختر المورد --"
        />
      </div>
    </div>
  )
}

export default function VendorDictionary() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [vendorOptions, setVendorOptions] = useState([])
  const toast = useToast()

  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const emptyForm = { invoice_vendor_name: '', qoyod_vendor_id: null, qoyod_vendor_name: '' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    fetchMappings()
    fetchVendors()
  }, [])

  async function fetchMappings() {
    setLoading(true)
    try {
      const result = await getVendorMappings()
      setData(result.mappings || [])
    } catch (err) {
      const p = parseError(err)
      toast.error(p.message, { title: p.title || 'فشل تحميل القاموس' })
    } finally {
      setLoading(false)
    }
  }

  async function fetchVendors() {
    try {
      const result = await getVendors()
      const active = (result.vendors || []).filter((v) => (v.status || 'Active') === 'Active')
      setVendorOptions(active.map((v) => ({ id: v.id, label: v.name })))
    } catch (err) {
      console.error('Error fetching vendors:', err)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.trim().toLowerCase()
    return data.filter(
      (d) =>
        (d.invoice_vendor_name || '').toLowerCase().includes(q) ||
        (d.qoyod_vendor_name || '').toLowerCase().includes(q)
    )
  }, [data, search])

  async function handleAdd() {
    if (!form.invoice_vendor_name.trim() || !form.qoyod_vendor_id) {
      toast.warning('املأ كل الحقول', { title: 'بيانات ناقصة' })
      return
    }
    setSaving(true)
    try {
      await createVendorMapping(form)
      toast.success('تمت إضافة المطابقة')
      setAddOpen(false)
      setForm(emptyForm)
      await fetchMappings()
    } catch (err) {
      const p = parseError(err)
      toast.error(p.message, { title: p.title || 'فشل الإضافة' })
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit() {
    if (!editItem) return
    setSaving(true)
    try {
      await updateVendorMapping(editItem.id, form)
      toast.success('تم تحديث المطابقة')
      setEditItem(null)
      setForm(emptyForm)
      await fetchMappings()
    } catch (err) {
      const p = parseError(err)
      toast.error(p.message, { title: p.title || 'فشل التحديث' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteItem) return
    setSaving(true)
    try {
      await deleteVendorMapping(deleteItem.id)
      toast.success('تم الحذف')
      setDeleteItem(null)
      await fetchMappings()
    } catch (err) {
      const p = parseError(err)
      toast.error(p.message, { title: p.title || 'فشل الحذف' })
    } finally {
      setSaving(false)
    }
  }

  function startEdit(item) {
    setForm({
      invoice_vendor_name: item.invoice_vendor_name || '',
      qoyod_vendor_id: item.qoyod_vendor_id,
      qoyod_vendor_name: item.qoyod_vendor_name || '',
    })
    setEditItem(item)
  }

  return (
    <div className="max-w-5xl animate-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" strokeWidth={1.6} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-text">قاموس مطابقة الموردين</h1>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">اربط أسماء الموردين بالفواتير مع مورديهم في قيود</p>
          </div>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setAddOpen(true) }}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> إضافة مطابقة
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-border-light p-4 mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المورد..."
            className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 pr-10 pl-3.5 text-sm focus:outline-none focus:border-primary/40"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-2xl border border-border-light overflow-hidden">
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light text-[12px] text-text-muted">
                  <th className="text-right font-medium px-5 py-3">اسم المورد بالفاتورة</th>
                  <th className="text-right font-medium px-5 py-3">المورد في قيود</th>
                  <th className="text-right font-medium px-5 py-3">مرات الاستخدام</th>
                  <th className="text-right font-medium px-5 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id} className={`hover:bg-primary-50/20 transition-colors ${i !== filtered.length - 1 ? 'border-b border-border-light/60' : ''}`}>
                    <td className="px-5 py-3 text-[13px] font-medium text-text">{m.invoice_vendor_name}</td>
                    <td className="px-5 py-3 text-[13px] text-text">{m.qoyod_vendor_name}</td>
                    <td className="px-5 py-3 text-[12px] text-text-muted">{m.times_used || 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-50 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteItem(m)} className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-border-light/60">
            {filtered.map((m) => (
              <div key={m.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-text truncate">{m.invoice_vendor_name}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">→ {m.qoyod_vendor_name}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-50">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteItem(m)} className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-text-muted">استُخدمت {m.times_used || 1} مرة</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-light py-16 flex flex-col items-center text-center">
          <BookOpen className="w-8 h-8 text-text-muted/30 mb-3" />
          <p className="text-sm text-text-muted">{search ? 'لا توجد نتائج' : 'لا توجد مطابقات بعد'}</p>
          <p className="text-xs text-text-muted/70 mt-1">{search ? '' : 'النظام يحفظ المطابقات تلقائياً عند رفع الفواتير'}</p>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إضافة مطابقة جديدة">
        <Form form={form} setForm={setForm} vendorOptions={vendorOptions} />
        <div className="flex gap-2 mt-5">
          <button onClick={() => setAddOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border-light text-text-muted text-[13px] font-medium hover:bg-surface-lighter">
            إلغاء
          </button>
          <button onClick={handleAdd} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            إضافة
          </button>
        </div>
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="تعديل المطابقة">
        <Form form={form} setForm={setForm} vendorOptions={vendorOptions} />
        <div className="flex gap-2 mt-5">
          <button onClick={() => setEditItem(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border-light text-text-muted text-[13px] font-medium hover:bg-surface-lighter">
            إلغاء
          </button>
          <button onClick={handleEdit} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            حفظ
          </button>
        </div>
      </Modal>

      <Modal open={!!deleteItem} onClose={() => setDeleteItem(null)} title="حذف المطابقة">
        <p className="text-[13px] text-text-secondary mb-4">
          هل تريد حذف مطابقة <strong className="text-text">{deleteItem?.invoice_vendor_name}</strong>؟
        </p>
        <div className="flex gap-2">
          <button onClick={() => setDeleteItem(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border-light text-text-muted text-[13px] font-medium hover:bg-surface-lighter">
            إلغاء
          </button>
          <button onClick={handleDelete} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            حذف
          </button>
        </div>
      </Modal>
    </div>
  )
}
