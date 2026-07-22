import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api'

// Backwards-compat fallback: used only when permissions array is missing on a stale stored user
export const UPLOADER_ALLOWED_ROUTES = ['/', '/upload', '/invoices', '/vendors', '/products', '/dictionary', '/vendor-dictionary', '/settings', '/updates']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('auth_user')
    }
  }, [user])

  async function login(username, password) {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        return { success: false, error: data?.error || 'اسم المستخدم أو كلمة المرور غير صحيحة' }
      }
      setUser(data.user)
      return { success: true }
    } catch (e) {
      return { success: false, error: 'فشل الاتصال بالسيرفر' }
    }
  }

  function logout() {
    setUser(null)
  }

  function canAccess(path) {
    if (!user) return false
    if (user.is_admin || user.role === 'ADMIN') return true
    const perms = user.permissions
    if (Array.isArray(perms)) {
      if (perms.includes('*')) return true
      return perms.includes(path)
    }
    // Stale stored user without permissions array — fall back to legacy list
    return UPLOADER_ALLOWED_ROUTES.includes(path)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, canAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
