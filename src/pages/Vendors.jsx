import { Search, Users, Loader2, Plus, Pencil, Trash2, Check, Phone } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { getVendors, createVendor, updateVendor, deleteVendor } from '../lib/api'
import { Link } from 'react-router-dom'
import { PageHeader, Sheet, ConfirmDialog, EmptyState, ledger, field, btn } from '../components/ui'

function VendorForm({ form, setForm }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={field.label}>الاسم *</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field.input} />
      </div>
      <div>
        <label className={field.label}>المنشأة</label>
        <input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} className={field.input} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={field.label}>الجوال</label>
          <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} className={field.input} dir="ltr" />
        </div>
        <div>
          <label className={field.label}>البريد</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={field.input} dir="ltr" />
        </div>
      </div>
      <div>
        <label className={field.label}>الرقم الضريبي</label>
        <input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} className={`${field.input} font-mono`} dir="ltr" />
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
    <div className="w-full animate-page">
      <PageHeader
        kicker="البيانات"
        title="الموردين"
        description={`${vendors.length} مورد مسجّل في قيود — إدارة كاملة تتزامن مباشرة.`}
        actions={
          <button onClick={openAdd} className={btn.primary}>
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            إضافة مورد
          </button>
        }
      >
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الرقم الضريبي..."
            className="w-full bg-surface border border-border rounded-full py-2.5 pr-10 pl-4 text-[13px] text-text placeholder-text-muted focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : filtered.length > 0 ? (
        <>
          {/* Desktop — ledger table */}
          <div className={`hidden sm:block ${ledger.wrap}`}>
            <table className={ledger.table}>
              <thead>
                <tr className={ledger.headRow}>
                  <th className={`${ledger.th} w-8`}>#</th>
                  <th className={ledger.th}>الاسم</th>
                  <th className={ledger.th}>المنشأة</th>
                  <th className={ledger.th}>الرقم الضريبي</th>
                  <th className={ledger.th}>الحالة</th>
                  <th className={`${ledger.th} text-left w-20`}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => (
                  <tr key={v.id} className={`group ${ledger.row}`}>
                    <td className={`${ledger.td} text-text-muted text-[11px]`}>{i + 1}</td>
                    <td className={ledger.td}>
                      <Link
                        to={`/vendor-files/${encodeURIComponent(v.name)}`}
                        className="font-semibold text-text hover:text-primary-dark transition-colors"
                        title="فتح ملف المورد"
                      >
                        {v.name}
                      </Link>
                      {v.email && <p className="text-[11px] text-text-muted mt-0.5" dir="ltr">{v.email}</p>}
                    </td>
                    <td className={`${ledger.td} text-text-secondary`}>{v.organization || '—'}</td>
                    <td className={`${ledger.td} text-text-muted font-mono text-[12px]`}>{v.tax_number || '—'}</td>
                    <td className={ledger.td}>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${v.status === 'Active' ? 'bg-primary-50 text-primary-dark' : 'bg-surface-lighter text-text-muted'}`}>
                        {v.status === 'Active' ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className={ledger.td}>
                      <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(v)} className="p-2 rounded-full hover:bg-surface-lighter text-text-muted hover:text-primary transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteItem(v)} className="p-2 rounded-full hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors">
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
            {filtered.map((v) => (
              <div key={v.id} className="py-3.5 border-b border-border-light">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text">{v.name}</p>
                    {v.organization && <p className="text-[12px] text-text-secondary mt-0.5">{v.organization}</p>}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => openEdit(v)} className="p-1.5 rounded-full hover:bg-surface-lighter text-text-muted"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteItem(v)} className="p-1.5 rounded-full hover:bg-red-50 text-text-muted"><Trash2 className="w-3.5 h-3.5" /></button>
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
        </>
      ) : (
        <EmptyState icon={Users} title={search ? 'لا توجد نتائج' : 'لا يوجد موردين'} hint={search ? 'جرّب كلمة بحث أخرى' : 'أضف أول مورد للبدء'} />
      )}

      {/* Add Sheet */}
      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="إضافة مورد جديد"
        subtitle="يُسجَّل مباشرة في قيود"
        footer={
          <>
            <button onClick={handleAdd} disabled={saving} className={`${btn.primary} flex-1`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'جارِ الإضافة...' : 'إضافة'}
            </button>
            <button onClick={() => setAddOpen(false)} className={btn.ghost}>إلغاء</button>
          </>
        }
      >
        <VendorForm form={form} setForm={setForm} />
        {error && <p className="text-[11.5px] text-red-500 bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</p>}
      </Sheet>

      {/* Edit Sheet */}
      <Sheet
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="تعديل المورد"
        subtitle={editItem?.name}
        footer={
          <>
            <button onClick={handleEdit} disabled={saving} className={`${btn.primary} flex-1`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'جارِ الحفظ...' : 'حفظ التعديل'}
            </button>
            <button onClick={() => setEditItem(null)} className={btn.ghost}>إلغاء</button>
          </>
        }
      >
        <VendorForm form={form} setForm={setForm} />
        {error && <p className="text-[11.5px] text-red-500 bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</p>}
      </Sheet>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => { setDeleteItem(null); setError(null) }}
        title="حذف المورد"
        message="هل تريد حذف هذا المورد من قيود؟"
        highlight={deleteItem?.name}
        onConfirm={handleDelete}
        loading={saving}
        error={error}
      />
    </div>
  )
}
