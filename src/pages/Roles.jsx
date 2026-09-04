import { Shield, ShieldCheck, Check, X, ArrowLeft, LayoutDashboard, Upload, FileText, Users, Package, BookOpen, History, Settings, Megaphone, Loader2, Plus, Pencil, Trash2, Lock, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { adminListRoles, adminCreateRole, adminUpdateRole, adminDeleteRole } from '../lib/api'
import { PageHeader, Sheet, btn } from '../components/ui'

// All app routes — used as the catalog of available permissions
const APP_ROUTES = [
  { path: '/',                  label: 'لوحة التحكم',         icon: LayoutDashboard, group: 'عام' },
  { path: '/upload',            label: 'رفع الفواتير',        icon: Upload,          group: 'عام' },
  { path: '/invoices',          label: 'الفواتير',            icon: FileText,        group: 'المحاسبة' },
  { path: '/reconcile',         label: 'المطابقة',            icon: FileText,        group: 'المحاسبة' },
  { path: '/reconcile/archive', label: 'أرشيف المطابقات',     icon: FileText,        group: 'المحاسبة' },
  { path: '/vendors',           label: 'الموردين',            icon: Users,           group: 'البيانات' },
  { path: '/vendor-files',      label: 'ملفات الموردين',      icon: Users,           group: 'البيانات' },
  { path: '/products',          label: 'البنود',              icon: Package,         group: 'البيانات' },
  { path: '/dictionary',        label: 'قاموس البنود',         icon: BookOpen,        group: 'البيانات' },
  { path: '/vendor-dictionary', label: 'قاموس الموردين',       icon: BookOpen,        group: 'البيانات' },
  { path: '/users',             label: 'المستخدمين',          icon: Users,           group: 'الإدارة' },
  { path: '/users/roles',       label: 'الأدوار والصلاحيات',  icon: Shield,          group: 'الإدارة' },
  { path: '/history',           label: 'السجل',               icon: History,         group: 'النظام' },
  { path: '/settings',          label: 'الإعدادات',           icon: Settings,        group: 'النظام' },
  { path: '/updates',           label: 'تحديثات النظام',      icon: Megaphone,       group: 'النظام' },
]

const COLORS = [
  { color: '#10B981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.30)' },
  { color: '#3B82F6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.30)' },
  { color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.30)' },
  { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)' },
  { color: '#EF4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.30)' },
]
function colorFor(idx) { return COLORS[idx % COLORS.length] }

export default function Roles() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | role object
  const [form, setForm] = useState({ key: '', label: '', description: '', is_admin: false, permissions: [] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const refresh = async () => {
    try {
      const r = await adminListRoles()
      setRoles(r.roles || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [])

  const groupedRoutes = useMemo(() => {
    const map = new Map()
    for (const r of APP_ROUTES) {
      if (!map.has(r.group)) map.set(r.group, [])
      map.get(r.group).push(r)
    }
    return Array.from(map.entries())
  }, [])

  const openNew = () => {
    setEditing('new')
    setForm({ key: '', label: '', description: '', is_admin: false, permissions: [] })
    setError('')
  }
  const openEdit = (r) => {
    setEditing(r)
    setForm({
      key: r.key,
      label: r.label,
      description: r.description || '',
      is_admin: r.is_admin,
      permissions: r.is_admin ? [] : (r.permissions || []),
    })
    setError('')
  }
  const closeModal = () => { setEditing(null); setError('') }

  const togglePermission = (path) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(path)
        ? prev.permissions.filter(p => p !== path)
        : [...prev.permissions, path],
    }))
  }

  const save = async () => {
    setError('')
    if (!form.key || !form.label) { setError('المفتاح والاسم مطلوبان'); return }
    setSaving(true)
    try {
      if (editing === 'new') {
        await adminCreateRole({
          key: form.key,
          label: form.label,
          description: form.description,
          is_admin: form.is_admin,
          permissions: form.is_admin ? [] : form.permissions,
        })
      } else {
        await adminUpdateRole(editing.key, {
          label: form.label,
          description: form.description,
          is_admin: form.is_admin,
          permissions: form.is_admin ? [] : form.permissions,
        })
      }
      await refresh()
      closeModal()
    } catch (e) {
      setError(e?.message || 'فشل الحفظ')
    } finally { setSaving(false) }
  }

  const remove = async (r) => {
    if (!confirm(`حذف الدور "${r.label}"؟`)) return
    try {
      await adminDeleteRole(r.key)
      await refresh()
    } catch (e) {
      alert(e?.message || 'فشل الحذف')
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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12.5px] mb-4 text-text-muted">
        <Link to="/users" className="hover:text-text-secondary transition-colors">المستخدمين</Link>
        <ArrowLeft className="w-3 h-3 text-border" strokeWidth={2.2} />
        <span className="text-text-secondary font-semibold">الأدوار والصلاحيات</span>
      </div>

      <PageHeader
        kicker="الإدارة"
        title="الأدوار والصلاحيات"
        description={`${roles.length} أدوار في النظام — كل دور يحدد الصفحات المسموح الوصول لها.`}
        actions={
          <button onClick={openNew} className={btn.primary}>
            <Plus className="w-4 h-4" strokeWidth={2.4} />
            إضافة دور
          </button>
        }
      />

      {/* Roles overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {roles.map((role, i) => {
          const c = role.is_admin ? COLORS[0] : colorFor(i + 1)
          const Icon = role.is_admin ? ShieldCheck : Shield
          const accessibleCount = role.is_admin ? APP_ROUTES.length : (role.permissions || []).filter(p => APP_ROUTES.some(r => r.path === p)).length
          return (
            <div
              key={role.key}
              className="rounded-2xl p-5"
              style={{ background: c.bg, border: `1px solid ${c.border}` }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: c.color }}
                  >
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-text">{role.label}</h3>
                    <p className="text-[11px] font-mono mt-0.5" style={{ color: c.color }}>{role.key}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(role)}
                    title="تعديل"
                    className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-white/50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                  {!role.is_system && (
                    <button
                      onClick={() => remove(role)}
                      title="حذف"
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
              {role.description && (
                <p className="text-[12.5px] text-text-secondary leading-relaxed mb-4 line-clamp-3">
                  {role.description}
                </p>
              )}
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: c.border }}>
                <div>
                  <p className="text-[10.5px] text-text-muted font-medium">صلاحيات الوصول</p>
                  <p className="text-[15px] font-bold text-text mt-0.5">
                    <span style={{ color: c.color }}>{accessibleCount}</span>
                    <span className="text-text-muted text-[12px] font-mono mx-1">/ {APP_ROUTES.length}</span>
                    صفحة
                  </p>
                </div>
                {role.is_system && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-text-muted">
                    <Lock className="w-2.5 h-2.5" strokeWidth={2.2} />
                    نظام
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Permissions matrix (read-only display) */}
      <div className="bg-surface border border-border-light rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-light">
          <h2 className="text-[14px] font-bold text-text">مصفوفة الصلاحيات</h2>
          <p className="text-[12px] text-text-muted mt-0.5">عرض شامل للصلاحيات لكل دور (للتعديل اضغط أيقونة القلم على البطاقة)</p>
        </div>

        {/* Column headers */}
        <div className="hidden sm:grid px-5 py-2.5 bg-surface-light border-b border-border-light gap-3" style={{ gridTemplateColumns: `1fr repeat(${roles.length}, 100px)` }}>
          <div />
          {roles.map((r, i) => {
            const c = r.is_admin ? COLORS[0] : colorFor(i + 1)
            return (
              <p key={r.key} className="text-[10.5px] font-bold text-center" style={{ color: c.color }}>{r.label}</p>
            )
          })}
        </div>

        {groupedRoutes.map(([group, routes]) => (
          <div key={group}>
            <div className="px-5 py-2 bg-surface-light/50 border-y border-border-light">
              <p className="text-[10.5px] font-bold text-text-muted uppercase tracking-wider">{group}</p>
            </div>
            <div className="divide-y divide-border-light">
              {routes.map((r) => {
                const RouteIcon = r.icon
                return (
                  <div
                    key={r.path}
                    className="px-5 py-3 grid items-center gap-3"
                    style={{ gridTemplateColumns: `1fr repeat(${roles.length}, 100px)` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-surface-lighter flex items-center justify-center flex-shrink-0">
                        <RouteIcon className="w-4 h-4 text-text-muted" strokeWidth={1.7} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-text truncate">{r.label}</p>
                        <p className="text-[10.5px] font-mono text-text-muted truncate" dir="ltr">{r.path}</p>
                      </div>
                    </div>
                    {roles.map((role, i) => {
                      const c = role.is_admin ? COLORS[0] : colorFor(i + 1)
                      const allowed = role.is_admin || (role.permissions || []).includes(r.path)
                      return (
                        <div key={role.key} className="flex justify-center">
                          {allowed ? (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: c.bg, color: c.color }}>
                              <Check className="w-3.5 h-3.5" strokeWidth={2.6} />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-surface-lighter text-text-muted/50 flex items-center justify-center">
                              <X className="w-3.5 h-3.5" strokeWidth={2.4} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* New / Edit role sheet */}
      <Sheet
        open={!!editing}
        onClose={closeModal}
        title={editing === 'new' ? 'إضافة دور' : `تعديل: ${(editing && editing.label) || ''}`}
        subtitle="حدد الصفحات المسموح الوصول لها"
        wide
        footer={
          <>
            <button onClick={save} disabled={saving} className={`${btn.primary} flex-1`}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" strokeWidth={2.2} />}
              {editing === 'new' ? 'إضافة' : 'حفظ'}
            </button>
            <button onClick={closeModal} disabled={saving} className={btn.ghost}>إلغاء</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-text mb-1">المفتاح *</label>
              <input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })}
                disabled={editing && editing !== 'new'}
                dir="ltr"
                placeholder="MANAGER"
                className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text font-mono focus:outline-none focus:border-primary/50 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text mb-1">الاسم *</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="مدير محاسبة"
                className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-text mb-1">الوصف</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer p-3 bg-surface-light rounded-xl border border-border-light">
            <input
              type="checkbox"
              checked={form.is_admin}
              onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
              className="w-4 h-4 accent-primary"
            />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-text">دور إداري كامل</p>
              <p className="text-[11px] text-text-muted">يحصل على وصول كامل لكل الصفحات تلقائياً</p>
            </div>
          </label>

          {!form.is_admin && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12px] font-semibold text-text">الصلاحيات (اختر الصفحات المسموح بها)</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setForm({ ...form, permissions: APP_ROUTES.map(r => r.path) })}
                    className="text-[11px] text-primary hover:bg-primary-50 px-2 py-1 rounded-md font-semibold"
                  >
                    تحديد الكل
                  </button>
                  <button
                    onClick={() => setForm({ ...form, permissions: [] })}
                    className="text-[11px] text-text-muted hover:bg-surface-lighter px-2 py-1 rounded-md font-semibold"
                  >
                    مسح الكل
                  </button>
                </div>
              </div>
              <div className="bg-surface-light rounded-xl border border-border-light divide-y divide-border-light max-h-72 overflow-y-auto">
                {groupedRoutes.map(([group, routes]) => (
                  <div key={group}>
                    <p className="px-3 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-surface-lighter/50">{group}</p>
                    {routes.map((r) => {
                      const RouteIcon = r.icon
                      const checked = form.permissions.includes(r.path)
                      return (
                        <label
                          key={r.path}
                          className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-lighter/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(r.path)}
                            className="w-4 h-4 accent-primary"
                          />
                          <RouteIcon className="w-4 h-4 text-text-muted" strokeWidth={1.7} />
                          <span className="flex-1 text-[12.5px] text-text">{r.label}</span>
                          <span className="text-[10.5px] font-mono text-text-muted" dir="ltr">{r.path}</span>
                        </label>
                      )
                    })}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-text-muted mt-1.5 text-center">
                مُحدّد: {form.permissions.length} / {APP_ROUTES.length}
              </p>
            </div>
          )}

          {error && (
            <p className="text-[12px] text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
      </Sheet>
    </div>
  )
}
