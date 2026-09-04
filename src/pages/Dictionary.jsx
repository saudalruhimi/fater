import {
  Search, Plus, Pencil, Trash2, Check, BookOpen, Tag, ArrowUpDown, Loader2,
} from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { getMappings, createMapping, updateMapping, deleteMapping, getProducts } from '../lib/api'
import SearchableSelect from '../components/SearchableSelect'
import { PageHeader, Sheet, ConfirmDialog, EmptyState, ledger, field, btn } from '../components/ui'

function FormFields({ form, setForm, productOptions }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={field.label}>اسم صنف المورد</label>
        <input
          value={form.vendor_item_name}
          onChange={(e) => setForm({ ...form, vendor_item_name: e.target.value })}
          placeholder="مثال: حليب كامل الدسم 1 لتر"
          className={field.input}
        />
      </div>
      <div>
        <label className={field.label}>منتج قيود</label>
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
        <label className={field.label}>اسم المورد</label>
        <input
          value={form.vendor_name}
          onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
          placeholder="مثال: شركة التوريدات المتحدة"
          className={field.input}
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

  // Sheet / dialog state
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
      <div className="w-full flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full animate-page">
      <PageHeader
        kicker="البيانات"
        title="قاموس البنود"
        description={`${data.length} مطابقة محفوظة — يتعلم النظام منها تلقائياً مع كل فاتورة.`}
        actions={
          <button onClick={openAdd} className={btn.primary}>
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            إضافة عنصر
          </button>
        }
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الصنف أو المنتج أو المورد..."
              className="w-full bg-surface border border-border rounded-full py-2.5 pr-10 pl-4 text-[13px] text-text placeholder-text-muted focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-border text-text-secondary text-[12px] font-medium hover:bg-surface-lighter hover:text-text transition-colors whitespace-nowrap"
          >
            <ArrowUpDown className="w-3.5 h-3.5" strokeWidth={1.8} />
            {sortAsc ? 'أ → ي' : 'ي → أ'}
          </button>
        </div>
      </PageHeader>

      {filtered.length > 0 ? (
        <>
          {/* Desktop — ledger table */}
          <div className={`hidden sm:block ${ledger.wrap}`}>
            <table className={ledger.table}>
              <thead>
                <tr className={ledger.headRow}>
                  <th className={`${ledger.th} w-8`}>#</th>
                  <th className={ledger.th}>صنف المورد</th>
                  <th className={ledger.th}>منتج قيود</th>
                  <th className={ledger.th}>المورد</th>
                  <th className={ledger.th}>الاستخدام</th>
                  <th className={`${ledger.th} text-left w-20`}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.id} className={`group ${ledger.row}`}>
                    <td className={`${ledger.td} text-text-muted text-[11px]`}>{i + 1}</td>
                    <td className={`${ledger.td} font-semibold text-text`}>{item.vendor_item_name}</td>
                    <td className={`${ledger.td} text-text-secondary`}>{item.qoyod_product_name || '—'}</td>
                    <td className={ledger.td}>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-surface-lighter text-text-secondary">
                        <Tag className="w-3 h-3" strokeWidth={1.8} />
                        {item.vendor_name || '—'}
                      </span>
                    </td>
                    <td className={`${ledger.td} text-text-muted text-[12px]`}>{item.times_used || 0} مرة</td>
                    <td className={ledger.td}>
                      <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(item)} className="p-2 rounded-full hover:bg-surface-lighter text-text-muted hover:text-primary transition-colors" title="تعديل">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteItem(item)} className="p-2 rounded-full hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors" title="حذف">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden border-t-2 border-text">
            {filtered.map((item) => (
              <div key={item.id} className="py-3.5 border-b border-border-light">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text truncate">{item.vendor_item_name}</p>
                    <p className="text-[12px] text-text-secondary mt-0.5">← {item.qoyod_product_name || '—'}</p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-full hover:bg-surface-lighter text-text-muted">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteItem(item)} className="p-1.5 rounded-full hover:bg-red-50 text-text-muted">
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
        </>
      ) : (
        <EmptyState
          icon={BookOpen}
          title={data.length === 0 ? 'لا توجد عناصر في القاموس' : 'لا توجد نتائج'}
          hint={data.length === 0 ? 'أضف أول عنصر للبدء — أو دع النظام يتعلم من فواتيرك' : 'جرّب تغيير كلمة البحث'}
        />
      )}

      {/* Add Sheet */}
      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="إضافة عنصر جديد"
        subtitle="اربط صنف المورد ببند قيود"
        footer={
          <>
            <button onClick={handleAdd} disabled={saving} className={`${btn.primary} flex-1`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.2} />}
              إضافة
            </button>
            <button onClick={() => setAddOpen(false)} className={btn.ghost}>إلغاء</button>
          </>
        }
      >
        <FormFields form={form} setForm={setForm} productOptions={productOptions} />
      </Sheet>

      {/* Edit Sheet */}
      <Sheet
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="تعديل العنصر"
        subtitle={editItem?.vendor_item_name}
        footer={
          <>
            <button onClick={handleEdit} disabled={saving} className={`${btn.primary} flex-1`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.2} />}
              حفظ التعديل
            </button>
            <button onClick={() => setEditItem(null)} className={btn.ghost}>إلغاء</button>
          </>
        }
      >
        <FormFields form={form} setForm={setForm} productOptions={productOptions} />
      </Sheet>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="حذف العنصر"
        message="هل تريد حذف هذه المطابقة من القاموس؟"
        highlight={deleteItem?.vendor_item_name}
        onConfirm={handleDelete}
        loading={saving}
      />
    </div>
  )
}
