import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const USERS = [
  { username: 'saud', password: '114545745Sa&', role: 'ADMIN' },
  { username: 'users', password: 'Rakan123', role: 'UPLOADER' },
]

// Routes the UPLOADER role can access
export const UPLOADER_ALLOWED_ROUTES = ['/', '/upload', '/vendors', '/products', '/dictionary', '/settings']

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

  function login(username, password) {
    const found = USERS.find(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase() &&
        u.password === password
    )
    if (!found) return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }
    const authUser = { username: found.username, role: found.role }
    setUser(authUser)
    return { success: true }
  }

  function logout() {
    setUser(null)
  }

  function canAccess(path) {
    if (!user) return false
    if (user.role === 'ADMIN') return true
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
