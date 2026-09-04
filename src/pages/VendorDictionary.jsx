import {
  Search, Plus, Pencil, Trash2, BookOpen, Loader2,
} from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { getVendorMappings, createVendorMapping, updateVendorMapping, deleteVendorMapping, getVendors } from '../lib/api'
import SearchableSelect from '../components/SearchableSelect'
import { useToast, parseError } from '../contexts/ToastContext.jsx'
import { PageHeader, Sheet, ConfirmDialog, EmptyState, ledger, field, btn } from '../components/ui'

function Form({ form, setForm, vendorOptions }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={field.label}>اسم المورد كما يكتب بالفاتورة</label>
        <input
          value={form.invoice_vendor_name}
          onChange={(e) => setForm({ ...form, invoice_vendor_name: e.target.value })}
          placeholder="مثال: شركة اسمنت المدينة"
          className={field.input}
        />
      </div>
      <div>
        <label className={field.label}>المورد المقابل في قيود</label>
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
    <div className="w-full animate-page">
      <PageHeader
        kicker="البيانات"
        title="قاموس الموردين"
        description="اربط أسماء الموردين كما تُكتب بالفواتير مع مورديهم في قيود — يُحفظ تلقائياً مع كل إرسال."
        actions={
          <button onClick={() => { setForm(emptyForm); setAddOpen(true) }} className={btn.primary}>
            <Plus className="w-4 h-4" /> إضافة مطابقة
          </button>
        }
      >
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المورد..."
            className="w-full bg-surface border border-border rounded-full py-2.5 pr-10 pl-4 text-[13px] text-text placeholder-text-muted focus:outline-none focus:border-primary/40 transition-colors"
          />
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
                  <th className={ledger.th}>اسم المورد بالفاتورة</th>
                  <th className={ledger.th}>المورد في قيود</th>
                  <th className={ledger.th}>الاستخدام</th>
                  <th className={`${ledger.th} text-left w-20`}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id} className={`group ${ledger.row}`}>
                    <td className={`${ledger.td} text-text-muted text-[11px]`}>{i + 1}</td>
                    <td className={`${ledger.td} font-semibold text-text`}>{m.invoice_vendor_name}</td>
                    <td className={`${ledger.td} text-text-secondary`}>{m.qoyod_vendor_name}</td>
                    <td className={`${ledger.td} text-text-muted text-[12px]`}>{m.times_used || 1} مرة</td>
                    <td className={ledger.td}>
                      <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(m)} className="p-2 rounded-full hover:bg-surface-lighter text-text-muted hover:text-primary transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteItem(m)} className="p-2 rounded-full hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors">
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
            {filtered.map((m) => (
              <div key={m.id} className="py-3.5 border-b border-border-light">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-text truncate">{m.invoice_vendor_name}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">← {m.qoyod_vendor_name}</p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => startEdit(m)} className="p-1.5 rounded-full hover:bg-surface-lighter text-text-muted">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteItem(m)} className="p-1.5 rounded-full hover:bg-red-50 text-text-muted">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-text-muted">استُخدمت {m.times_used || 1} مرة</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={BookOpen}
          title={search ? 'لا توجد نتائج' : 'لا توجد مطابقات بعد'}
          hint={search ? 'جرّب كلمة بحث أخرى' : 'النظام يحفظ المطابقات تلقائياً عند رفع الفواتير'}
        />
      )}

      {/* Add Sheet */}
      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="إضافة مطابقة جديدة"
        subtitle="اسم بالفاتورة ← مورد في قيود"
        footer={
          <>
            <button onClick={handleAdd} disabled={saving} className={`${btn.primary} flex-1`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إضافة
            </button>
            <button onClick={() => setAddOpen(false)} className={btn.ghost}>إلغاء</button>
          </>
        }
      >
        <Form form={form} setForm={setForm} vendorOptions={vendorOptions} />
      </Sheet>

      {/* Edit Sheet */}
      <Sheet
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="تعديل المطابقة"
        subtitle={editItem?.invoice_vendor_name}
        footer={
          <>
            <button onClick={handleEdit} disabled={saving} className={`${btn.primary} flex-1`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              حفظ
            </button>
            <button onClick={() => setEditItem(null)} className={btn.ghost}>إلغاء</button>
          </>
        }
      >
        <Form form={form} setForm={setForm} vendorOptions={vendorOptions} />
      </Sheet>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="حذف المطابقة"
        message="هل تريد حذف هذه المطابقة؟"
        highlight={deleteItem?.invoice_vendor_name}
        onConfirm={handleDelete}
        loading={saving}
      />
    </div>
  )
}
