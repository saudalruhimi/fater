import bcrypt from 'bcryptjs'
import { supabase } from './supabase.js'

// Initial users to seed when system_users table is empty (matches the previous hardcoded list)
const INITIAL_USERS = [
  { username: 'saud',  password: '114545745Sa&', role_key: 'ADMIN'    },
  { username: 'users', password: 'Rakan123',     role_key: 'UPLOADER' },
]

/**
 * Bootstrap: ensure at least the initial admin/uploader users exist.
 * Runs once on server start. Safe to call repeatedly — only inserts when empty.
 */
export async function bootstrapAuth() {
  try {
    // Verify the schema exists by trying a count
    const { count, error } = await supabase
      .from('system_users')
      .select('id', { count: 'exact', head: true })

    if (error) {
      console.warn('[auth bootstrap] system_users table not found — run supabase/003_users_roles.sql')
      return
    }

    if ((count || 0) === 0) {
      const rows = []
      for (const u of INITIAL_USERS) {
        const password_hash = await bcrypt.hash(u.password, 10)
        rows.push({
          username: u.username,
          password_hash,
          role_key: u.role_key,
          active: true,
          is_system: true,
        })
      }
      const { error: insErr } = await supabase.from('system_users').insert(rows)
      if (insErr) console.warn('[auth bootstrap] seed insert failed:', insErr.message)
      else console.log(`[auth bootstrap] seeded ${rows.length} initial users`)
    }
  } catch (e) {
    console.warn('[auth bootstrap] failed:', e?.message || e)
  }
}

/**
 * Authenticate a username + password against system_users.
 * Returns { user, role, permissions } on success, or throws on failure.
 */
export async function authenticate(username, password) {
  if (!username || !password) throw new Error('بيانات ناقصة')

  const { data: user, error } = await supabase
    .from('system_users')
    .select('id, username, password_hash, role_key, active')
    .ilike('username', username.trim())
    .maybeSingle()

  if (error) throw new Error('فشل التحقق — حاول مرة ثانية')
  if (!user) throw new Error('اسم المستخدم غير موجود')
  if (!user.active) throw new Error('الحساب موقوف')

  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) throw new Error('كلمة المرور غير صحيحة')

  const { data: role } = await supabase
    .from('system_roles')
    .select('key, label, is_admin')
    .eq('key', user.role_key)
    .maybeSingle()

  let permissions = []
  if (role?.is_admin) {
    permissions = ['*']  // wildcard for full access
  } else {
    const { data: perms } = await supabase
      .from('role_permissions')
      .select('route_path')
      .eq('role_key', user.role_key)
    permissions = (perms || []).map(p => p.route_path)
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role_key,
      role_label: role?.label || user.role_key,
      is_admin: !!role?.is_admin,
      permissions,
    },
  }
}

// ─── User CRUD helpers ───────────────────────────────────────────────
export async function listUsers() {
  const { data, error } = await supabase
    .from('system_users')
    .select('id, username, role_key, active, is_system, created_at')
    .order('id', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function createUser({ username, password, role_key }) {
  if (!username || !password || !role_key) throw new Error('بيانات ناقصة')
  const password_hash = await bcrypt.hash(password, 10)
  const { data, error } = await supabase
    .from('system_users')
    .insert({ username: username.trim(), password_hash, role_key, active: true, is_system: false })
    .select('id, username, role_key, active, is_system, created_at')
    .single()
  if (error) {
    if (String(error.message).includes('duplicate')) throw new Error('اسم المستخدم موجود بالفعل')
    throw new Error(error.message)
  }
  return data
}

export async function updateUser(id, { username, password, role_key, active }) {
  const patch = {}
  if (username) patch.username = username.trim()
  if (role_key) patch.role_key = role_key
  if (typeof active === 'boolean') patch.active = active
  if (password) patch.password_hash = await bcrypt.hash(password, 10)
  if (Object.keys(patch).length === 0) throw new Error('لا يوجد ما يُحدَّث')

  const { data, error } = await supabase
    .from('system_users')
    .update(patch)
    .eq('id', id)
    .select('id, username, role_key, active, is_system, created_at')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteUser(id) {
  // Block deletion of system users
  const { data: u } = await supabase.from('system_users').select('is_system').eq('id', id).maybeSingle()
  if (u?.is_system) throw new Error('لا يمكن حذف المستخدمين الأساسيين للنظام')
  const { error } = await supabase.from('system_users').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return true
}

// ─── Role + Permissions CRUD helpers ──────────────────────────────────
export async function listRoles() {
  const { data: roles, error } = await supabase
    .from('system_roles')
    .select('key, label, description, is_admin, is_system, created_at')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)

  const { data: perms } = await supabase
    .from('role_permissions')
    .select('role_key, route_path')

  const permsByRole = {}
  for (const p of (perms || [])) {
    if (!permsByRole[p.role_key]) permsByRole[p.role_key] = []
    permsByRole[p.role_key].push(p.route_path)
  }

  return (roles || []).map(r => ({
    ...r,
    permissions: r.is_admin ? ['*'] : (permsByRole[r.key] || []),
  }))
}

export async function createRole({ key, label, description, is_admin, permissions }) {
  if (!key || !label) throw new Error('المفتاح والاسم مطلوبان')
  const { data: role, error } = await supabase
    .from('system_roles')
    .insert({ key: key.trim().toUpperCase(), label, description, is_admin: !!is_admin, is_system: false })
    .select('key, label, description, is_admin, is_system, created_at')
    .single()
  if (error) {
    if (String(error.message).includes('duplicate')) throw new Error('مفتاح الدور موجود بالفعل')
    throw new Error(error.message)
  }
  if (!role.is_admin && Array.isArray(permissions) && permissions.length) {
    await supabase.from('role_permissions').insert(
      permissions.map(p => ({ role_key: role.key, route_path: p }))
    )
  }
  return { ...role, permissions: role.is_admin ? ['*'] : (permissions || []) }
}

export async function updateRole(key, { label, description, is_admin, permissions }) {
  const patch = {}
  if (label != null) patch.label = label
  if (description != null) patch.description = description
  if (typeof is_admin === 'boolean') patch.is_admin = is_admin

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('system_roles').update(patch).eq('key', key)
    if (error) throw new Error(error.message)
  }

  if (Array.isArray(permissions)) {
    // Replace all permissions atomically: delete + insert
    const { error: delErr } = await supabase.from('role_permissions').delete().eq('role_key', key)
    if (delErr) throw new Error(delErr.message)
    if (permissions.length > 0) {
      const { error: insErr } = await supabase.from('role_permissions').insert(
        permissions.map(p => ({ role_key: key, route_path: p }))
      )
      if (insErr) throw new Error(insErr.message)
    }
  }
  return true
}

export async function deleteRole(key) {
  const { data: r } = await supabase.from('system_roles').select('is_system').eq('key', key).maybeSingle()
  if (r?.is_system) throw new Error('لا يمكن حذف الأدوار الأساسية للنظام')
  // Block delete if any user uses this role
  const { count } = await supabase.from('system_users').select('id', { count: 'exact', head: true }).eq('role_key', key)
  if ((count || 0) > 0) throw new Error('لا يمكن حذف دور مرتبط بمستخدمين — انقلهم لدور آخر أولاً')
  const { error } = await supabase.from('system_roles').delete().eq('key', key)
  if (error) throw new Error(error.message)
  return true
}
