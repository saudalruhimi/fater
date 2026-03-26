import { Search, Users, Loader2, Plus, Pencil, Trash2, X, Check, Building2, Phone, Mail, Hash } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { getVendors, createVendor, updateVendor, deleteVendor } from '../lib/api'

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
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

function VendorForm({ form, setForm }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[13px] font-medium text-text mb-1">الاسم *</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text focus:outline-none focus:border-primary/50" />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-text mb-1">المنشأة</label>
        <input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })}
          className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text focus:outline-none focus:border-primary/50" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[13px] font-medium text-text mb-1">الجوال</label>
          <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text focus:outline-none focus:border-primary/50" dir="ltr" />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-text mb-1">البريد</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text focus:outline-none focus:border-primary/50" dir="ltr" />
        </div>
      </div>
      <div>
        <label className="block text-[13px] font-medium text-text mb-1">الرقم الضريبي</label>
        <input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
          className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text font-mono focus:outline-none focus:border-primary/50" dir="ltr" />
      </div>
    </div>
  )
}

const emptyForm = { name: '', organization: '', phone_number: '', email: '', tax_number: '' }

export default function Vendors() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true)
    getVendors()
      .then((res) => setVendors(res.vendors || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return vendors
    const q = search.trim().toLowerCase()
    return vendors.filter(v =>
      v.name?.toLowerCase().includes(q) || v.organization?.toLowerCase().includes(q) || v.tax_number?.includes(q)
    )
  }, [vendors, search])

  const openAdd = () => { setForm(emptyForm); setError(null); setAddOpen(true) }
  const openEdit = (v) => {
    setForm({ name: v.name || '', organization: v.organization || '', phone_number: v.phone_number || '', email: v.email || '', tax_number: v.tax_number || '' })
    setError(null); setEditItem(v)
  }

  const handleAdd = async () => {
    if (!form.name.trim()) return setError('الاسم مطلوب')
    setSaving(true); setError(null)
    try {
      await createVendor(form)
      setAddOpen(false); load()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!form.name.trim()) return setError('الاسم مطلوب')
    setSaving(true); setError(null)
    try {
      await updateVendor(editItem.id, form)
      setEditItem(null); load()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true); setError(null)
    try {
      await deleteVendor(deleteItem.id)
      setDeleteItem(null); load()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-5xl animate-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-text">الموردين</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">{vendors.length} مورد مسجّل في قيود</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-[13px] font-semibold py-2.5 px-5 rounded-xl transition-colors self-start sm:self-auto">
          <Plus className="w-4 h-4" strokeWidth={2.2} />
          إضافة مورد
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الرقم الضريبي..."
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
                  <th className="text-right font-medium px-5 py-3">الاسم</th>
                  <th className="text-right font-medium px-5 py-3">المنشأة</th>
                  <th className="text-right font-medium px-5 py-3">الرقم الضريبي</th>
                  <th className="text-right font-medium px-5 py-3">الحالة</th>
                  <th className="text-left font-medium px-5 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => (
                  <tr key={v.id} className={`group hover:bg-primary-50/20 transition-colors ${i !== filtered.length - 1 ? 'border-b border-border-light/60' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="text-[13px] font-medium text-text">{v.name}</p>
                      {v.email && <p className="text-[11px] text-text-muted">{v.email}</p>}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-text-secondary">{v.organization || '—'}</td>
                    <td className="px-5 py-3 text-[13px] text-text-muted font-mono">{v.tax_number || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${v.status === 'Active' ? 'bg-primary-50 text-primary-dark' : 'bg-surface-lighter text-text-muted'}`}>
                        {v.status === 'Active' ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(v)} className="p-2 rounded-lg hover:bg-white text-text-muted hover:text-primary transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteItem(v)} className="p-2 rounded-lg hover:bg-white text-text-muted hover:text-red-500 transition-colors">
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
            {filtered.map((v) => (
              <div key={v.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text">{v.name}</p>
                    {v.organization && <p className="text-[12px] text-text-secondary mt-0.5">{v.organization}</p>}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => openEdit(v)} className="p-1.5 rounded-md hover:bg-surface-lighter text-text-muted"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteItem(v)} className="p-1.5 rounded-md hover:bg-red-50 text-text-muted"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-text-muted flex-wrap">
                  {v.phone_number && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{v.phone_number}</span>}
                  {v.tax_number && <span className="font-mono">{v.tax_number}</span>}
                  <span className={`px-2 py-0.5 rounded-full font-medium ${v.status === 'Active' ? 'bg-primary-50 text-primary-dark' : 'bg-surface-lighter text-text-muted'}`}>
                    {v.status === 'Active' ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-light py-16 flex flex-col items-center">
          <Users className="w-8 h-8 text-text-muted/30 mb-3" />
          <p className="text-sm text-text-muted">{search ? 'لا توجد نتائج' : 'لا يوجد موردين'}</p>
        </div>
      )}

      {/* Add Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إضافة مورد جديد">
        <VendorForm form={form} setForm={setForm} />
        {error && <p className="text-[11px] text-red-500 mt-2">{error}</p>}
        <div className="flex gap-2 mt-5">
          <button onClick={handleAdd} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-[13px] py-2.5 rounded-xl transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'جارِ الإضافة...' : 'إضافة'}
          </button>
          <button onClick={() => setAddOpen(false)} className="px-5 py-2.5 rounded-xl border border-border text-text-secondary text-[13px] font-medium hover:bg-surface-lighter">إلغاء</button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="تعديل المورد">
        <VendorForm form={form} setForm={setForm} />
        {error && <p className="text-[11px] text-red-500 mt-2">{error}</p>}
        <div className="flex gap-2 mt-5">
          <button onClick={handleEdit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-[13px] py-2.5 rounded-xl transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'جارِ الحفظ...' : 'حفظ التعديل'}
          </button>
          <button onClick={() => setEditItem(null)} className="px-5 py-2.5 rounded-xl border border-border text-text-secondary text-[13px] font-medium hover:bg-surface-lighter">إلغاء</button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteItem} onClose={() => setDeleteItem(null)} title="تأكيد الحذف">
        <p className="text-sm text-text-secondary mb-1">هل تريد حذف هذا المورد؟</p>
        <p className="text-[13px] font-semibold text-text mb-5">&laquo;{deleteItem?.name}&raquo;</p>
        {error && <p className="text-[11px] text-red-500 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={handleDelete} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold text-[13px] py-2.5 rounded-xl transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            حذف
          </button>
          <button onClick={() => setDeleteItem(null)} className="px-5 py-2.5 rounded-xl border border-border text-text-secondary text-[13px] font-medium hover:bg-surface-lighter">إلغاء</button>
        </div>
      </Modal>
    </div>
  )
}
