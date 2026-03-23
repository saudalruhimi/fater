import {
  Search, Plus, Pencil, Trash2, X, Check, BookOpen, Tag, ArrowUpDown, Loader2,
} from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { getMappings, createMapping, updateMapping, deleteMapping, getProducts } from '../lib/api'
import SearchableSelect from '../components/SearchableSelect'

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

function FormFields({ form, setForm, productOptions }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-text mb-1.5">اسم صنف المورد</label>
        <input
          value={form.vendor_item_name}
          onChange={(e) => setForm({ ...form, vendor_item_name: e.target.value })}
          placeholder="مثال: حليب كامل الدسم 1 لتر"
          className="w-full bg-surface-light border border-border rounded-xl py-2.5 px-3.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-text mb-1.5">منتج قيود</label>
        <SearchableSelect
          options={productOptions}
          value={form.qoyod_product_id}
          onChange={(id) => {
            const product = productOptions.find((p) => p.id === id)
            setForm({
              ...form,
              qoyod_product_id: id,
              qoyod_product_name: product ? product.label : '',
            })
          }}
          placeholder="اختر منتج من قيود..."
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-text mb-1.5">اسم المورد</label>
        <input
          value={form.vendor_name}
          onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
          placeholder="مثال: شركة التوريدات المتحدة"
          className="w-full bg-surface-light border border-border rounded-xl py-2.5 px-3.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>
    </div>
  )
}

export default function Dictionary() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [sortAsc, setSortAsc] = useState(true)
  const [productOptions, setProductOptions] = useState([])

  // Modal state
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const emptyForm = { vendor_item_name: '', qoyod_product_id: null, qoyod_product_name: '', vendor_name: '' }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    fetchMappings()
    fetchProducts()
  }, [])

  async function fetchMappings() {
    setLoading(true)
    try {
      const result = await getMappings()
      setData(result.mappings || [])
    } catch (err) {
      console.error('Error fetching mappings:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchProducts() {
    try {
      const result = await getProducts()
      setProductOptions(
        (result.products || []).map((p) => ({ id: p.id, label: p.name }))
      )
    } catch (err) {
      console.error('Error fetching products:', err)
    }
  }

  const filtered = useMemo(() => {
    let result = data
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (d) =>
          (d.vendor_item_name || '').toLowerCase().includes(q) ||
          (d.qoyod_product_name || '').toLowerCase().includes(q) ||
          (d.vendor_name || '').toLowerCase().includes(q)
      )
    }
    result = [...result].sort((a, b) =>
      sortAsc
        ? (a.vendor_item_name || '').localeCompare(b.vendor_item_name || '', 'ar')
        : (b.vendor_item_name || '').localeCompare(a.vendor_item_name || '', 'ar')
    )
    return result
  }, [data, search, sortAsc])

  const openAdd = () => {
    setForm(emptyForm)
    setAddOpen(true)
  }

  const handleAdd = async () => {
    if (!form.vendor_item_name.trim() || !form.qoyod_product_id) return
    setSaving(true)
    try {
      await createMapping({
        vendor_item_name: form.vendor_item_name,
        qoyod_product_id: form.qoyod_product_id,
        qoyod_product_name: form.qoyod_product_name,
        vendor_name: form.vendor_name,
      })
      setAddOpen(false)
      await fetchMappings()
    } catch (err) {
      console.error('Error creating mapping:', err)
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (item) => {
    setForm({
      vendor_item_name: item.vendor_item_name || '',
      qoyod_product_id: item.qoyod_product_id || null,
      qoyod_product_name: item.qoyod_product_name || '',
      vendor_name: item.vendor_name || '',
    })
    setEditItem(item)
  }

  const handleEdit = async () => {
    if (!form.vendor_item_name.trim() || !form.qoyod_product_id) return
    setSaving(true)
    try {
      await updateMapping(editItem.id, {
        vendor_item_name: form.vendor_item_name,
        qoyod_product_id: form.qoyod_product_id,
        qoyod_product_name: form.qoyod_product_name,
        vendor_name: form.vendor_name,
      })
      setEditItem(null)
      await fetchMappings()
    } catch (err) {
      console.error('Error updating mapping:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await deleteMapping(deleteItem.id)
      setDeleteItem(null)
      await fetchMappings()
    } catch (err) {
      console.error('Error deleting mapping:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-text">قاموس المطابقة</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">{data.length} عنصر مسجّل</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white text-[13px] font-semibold py-2.5 px-5 rounded-xl transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" strokeWidth={2.2} />
          إضافة عنصر
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-2xl border border-border-light p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الصنف أو المنتج أو المورد..."
              className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 pr-10 pl-3.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
          {/* Sort toggle */}
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border-light text-text-secondary text-[13px] hover:bg-surface-lighter transition-colors whitespace-nowrap"
          >
            <ArrowUpDown className="w-3.5 h-3.5" strokeWidth={1.8} />
            {sortAsc ? 'أ → ي' : 'ي → أ'}
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="bg-white rounded-2xl border border-border-light overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light text-[12px] text-text-muted">
                  <th className="text-right font-medium px-5 py-3">صنف المورد</th>
                  <th className="text-right font-medium px-5 py-3">منتج قيود</th>
                  <th className="text-right font-medium px-5 py-3">المورد</th>
                  <th className="text-right font-medium px-5 py-3">مرات الاستخدام</th>
                  <th className="text-left font-medium px-5 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.id} className={`group hover:bg-primary-50/30 transition-colors ${i !== filtered.length - 1 ? 'border-b border-border-light/60' : ''}`}>
                    <td className="px-5 py-3.5">
                      <span className="text-[13px] font-medium text-text">{item.vendor_item_name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[13px] text-text-secondary">{item.qoyod_product_name || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-surface-lighter text-text-secondary">
                        <Tag className="w-3 h-3" strokeWidth={1.8} />
                        {item.vendor_name || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[12px] text-text-muted">{item.times_used || 0}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-2 rounded-lg hover:bg-white text-text-muted hover:text-primary transition-colors"
                          title="تعديل"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          className="p-2 rounded-lg hover:bg-white text-text-muted hover:text-red-500 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-border-light/60">
            {filtered.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text truncate">{item.vendor_item_name}</p>
                    <p className="text-[12px] text-text-secondary mt-0.5">{item.qoyod_product_name || '—'}</p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-md hover:bg-surface-lighter text-text-muted">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteItem(item)} className="p-1.5 rounded-md hover:bg-red-50 text-text-muted">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-lighter text-text-secondary">
                    <Tag className="w-3 h-3" strokeWidth={1.8} />
                    {item.vendor_name || '—'}
                  </span>
                  <span className="text-[11px] text-text-muted">استخدام: {item.times_used || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-light py-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-surface-lighter flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-text mb-1">
            {data.length === 0 ? 'لا توجد عناصر في القاموس' : 'لا توجد نتائج'}
          </p>
          <p className="text-xs text-text-muted">
            {data.length === 0 ? 'أضف أول عنصر للبدء' : 'جرّب تغيير كلمة البحث'}
          </p>
        </div>
      )}

      {/* Add Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إضافة عنصر جديد">
        <FormFields form={form} setForm={setForm} productOptions={productOptions} />
        <div className="flex gap-2 mt-5">
          <button
            onClick={handleAdd}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-[13px] py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.2} />}
            إضافة
          </button>
          <button onClick={() => setAddOpen(false)} className="px-5 py-2.5 rounded-xl border border-border text-text-secondary text-[13px] font-medium hover:bg-surface-lighter transition-colors">
            إلغاء
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="تعديل العنصر">
        <FormFields form={form} setForm={setForm} productOptions={productOptions} />
        <div className="flex gap-2 mt-5">
          <button
            onClick={handleEdit}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-[13px] py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.2} />}
            حفظ التعديل
          </button>
          <button onClick={() => setEditItem(null)} className="px-5 py-2.5 rounded-xl border border-border text-text-secondary text-[13px] font-medium hover:bg-surface-lighter transition-colors">
            إلغاء
          </button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteItem} onClose={() => setDeleteItem(null)} title="تأكيد الحذف">
        <p className="text-sm text-text-secondary mb-1">هل تريد حذف هذا العنصر؟</p>
        <p className="text-[13px] font-semibold text-text mb-5">&laquo;{deleteItem?.vendor_item_name}&raquo;</p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold text-[13px] py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            حذف
          </button>
          <button onClick={() => setDeleteItem(null)} className="px-5 py-2.5 rounded-xl border border-border text-text-secondary text-[13px] font-medium hover:bg-surface-lighter transition-colors">
            إلغاء
          </button>
        </div>
      </Modal>
    </div>
  )
}
