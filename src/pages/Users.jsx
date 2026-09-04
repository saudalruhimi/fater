import { Users as UsersIcon, Shield, ShieldCheck, Loader2, Search, Plus, Pencil, Trash2, Lock, KeyRound, Power } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { adminListUsers, adminCreateUser, adminUpdateUser, adminDeleteUser, adminListRoles } from '../lib/api'
import { PageHeader, Sheet, EmptyState, field, btn } from '../components/ui'

const ROLE_COLORS = {
  ADMIN:    { color: '#0F7B5F', bg: 'rgba(15,123,95,0.10)', border: 'rgba(15,123,95,0.25)' },
  UPLOADER: { color: '#3B82F6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.25)' },
}
function roleColor(key) {
  return ROLE_COLORS[key] || { color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.25)' }
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | user object
  const [form, setForm] = useState({ username: '', password: '', role_key: '', active: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const refresh = async () => {
    try {
      const [u, r] = await Promise.all([adminListUsers(), adminListRoles()])
      setUsers(u.users || [])
      setRoles(r.roles || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [])

  const rolesByKey = useMemo(() => {
    const m = {}
    for (const r of roles) m[r.key] = r
    return m
  }, [roles])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => u.username.toLowerCase().includes(q) || (rolesByKey[u.role_key]?.label || '').toLowerCase().includes(q))
  }, [users, search, rolesByKey])

  const openNew = () => {
    setEditing('new')
    setForm({ username: '', password: '', role_key: roles[0]?.key || 'UPLOADER', active: true })
    setError('')
  }
  const openEdit = (u) => {
    setEditing(u)
    setForm({ username: u.username, password: '', role_key: u.role_key, active: u.active })
    setError('')
  }
  const closeSheet = () => { setEditing(null); setError('') }

  const save = async () => {
    setError('')
    if (!form.username || !form.role_key) { setError('اليوزر والدور مطلوبان'); return }
    if (editing === 'new' && !form.password) { setError('كلمة المرور مطلوبة للحساب الجديد'); return }
    setSaving(true)
    try {
      if (editing === 'new') {
        await adminCreateUser({ username: form.username, password: form.password, role_key: form.role_key })
      } else {
        const patch = { role_key: form.role_key, active: form.active }
        if (form.username !== editing.username) patch.username = form.username
        if (form.password) patch.password = form.password
        await adminUpdateUser(editing.id, patch)
      }
      await refresh()
      closeSheet()
    } catch (e) {
      setError(e?.message || 'فشل الحفظ')
    } finally { setSaving(false) }
  }

  const remove = async (u) => {
    if (!confirm(`حذف المستخدم "${u.username}"؟`)) return
    try {
      await adminDeleteUser(u.id)
      await refresh()
    } catch (e) {
      alert(e?.message || 'فشل الحذف')
    }
  }

  const toggleActive = async (u) => {
    try {
      await adminUpdateUser(u.id, { active: !u.active })
      await refresh()
    } catch (e) {
      alert(e?.message || 'فشل التحديث')
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
        kicker="الإدارة"
        title="المستخدمين"
        description={`${users.length} مستخدم — الحسابات والأدوار وصلاحيات الوصول.`}
        actions={
          <>
            <Link to="/users/roles" className={btn.ghost}>
              <Shield className="w-4 h-4" strokeWidth={1.8} />
              الأدوار والصلاحيات
            </Link>
            <button onClick={openNew} className={btn.primary}>
              <Plus className="w-4 h-4" strokeWidth={2.4} />
              إضافة مستخدم
            </button>
          </>
        }
      >
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.8} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باليوزر أو الدور..."
            className="w-full bg-surface border border-border rounded-full py-2.5 pr-10 pl-4 text-[13px] text-text focus:outline-none focus:border-primary/40"
          />
        </div>
      </PageHeader>

      {/* Users — joined grid */}
      {filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded-2xl overflow-hidden">
          {filtered.map((u) => {
            const role = rolesByKey[u.role_key]
            const c = roleColor(u.role_key)
            const RoleIcon = role?.is_admin ? ShieldCheck : Shield
            const initial = u.username[0]?.toUpperCase() || 'U'
            return (
              <div
                key={u.id}
                className={`bg-surface p-5 transition-colors ${u.active ? '' : 'opacity-60'}`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ background: c.color }}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-text truncate" dir="ltr">@{u.username}</p>
                      {u.is_system && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-text-muted">
                          <Lock className="w-2.5 h-2.5" strokeWidth={2.2} />
                          نظام
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActive(u)}
                      title={u.active ? 'إيقاف' : 'تفعيل'}
                      className={`p-1.5 rounded-full transition-colors ${u.active ? 'text-primary hover:bg-primary-50' : 'text-text-muted hover:bg-surface-lighter'}`}
                    >
                      <Power className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => openEdit(u)}
                      title="تعديل"
                      className="p-1.5 rounded-full text-text-muted hover:text-primary hover:bg-primary-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                    {!u.is_system && (
                      <button
                        onClick={() => remove(u)}
                        title="حذف"
                        className="p-1.5 rounded-full text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Role badge */}
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}
                >
                  <RoleIcon className="w-3 h-3" strokeWidth={2.2} />
                  <span className="text-[11px] font-bold">{role?.label || u.role_key}</span>
                </div>

                {!u.active && (
                  <p className="mt-3 text-[11px] text-red-500 font-medium">⏸ الحساب موقوف — لا يستطيع تسجيل الدخول</p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={UsersIcon} title="لا توجد نتائج" hint="جرّب كلمة بحث أخرى" />
      )}

      {/* New / Edit sheet */}
      <Sheet
        open={!!editing}
        onClose={closeSheet}
        title={editing === 'new' ? 'إضافة مستخدم' : 'تعديل المستخدم'}
        subtitle={editing !== 'new' && editing ? `@${editing.username}` : 'حساب دخول جديد للنظام'}
        footer={
          <>
            <button onClick={save} disabled={saving} className={`${btn.primary} flex-1`}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editing === 'new' ? 'إضافة' : 'حفظ'}
            </button>
            <button onClick={closeSheet} disabled={saving} className={btn.ghost}>إلغاء</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={field.label}>اسم المستخدم *</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              dir="ltr"
              disabled={editing && editing !== 'new' && editing.is_system}
              className={`${field.input} disabled:opacity-60`}
            />
            {editing && editing !== 'new' && editing.is_system && (
              <p className="text-[10px] text-text-muted mt-1">مستخدم النظام لا يمكن تغيير اسمه</p>
            )}
          </div>

          <div>
            <label className={field.label}>
              <KeyRound className="w-3 h-3 inline-block ml-1" strokeWidth={2} />
              كلمة المرور {editing === 'new' ? '*' : '(اتركها فارغة للإبقاء على الحالية)'}
            </label>
            <input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              type="password"
              dir="ltr"
              placeholder={editing === 'new' ? '' : '••••••••'}
              className={field.input}
            />
          </div>

          <div>
            <label className={field.label}>الدور *</label>
            <select
              value={form.role_key}
              onChange={(e) => setForm({ ...form, role_key: e.target.value })}
              className={field.select}
            >
              {roles.map((r) => (
                <option key={r.key} value={r.key}>{r.label} ({r.key})</option>
              ))}
            </select>
          </div>

          {editing && editing !== 'new' && (
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-[13px] text-text">الحساب مفعّل</span>
            </label>
          )}

          {error && (
            <p className="text-[12px] text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
      </Sheet>
    </div>
  )
}
