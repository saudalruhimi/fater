import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Upload,
  BookOpen,
  History,
  Settings,
  ScanLine,
  Menu,
  X,
  Users,
  Package,
  Receipt,
  FileText,
  LogOut,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth, UPLOADER_ALLOWED_ROUTES } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const navSections = [
  {
    label: 'عام',
    items: [
      { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
      { to: '/upload', label: 'رفع الفواتير', icon: Upload },
    ],
  },
  {
    label: 'المحاسبة',
    items: [
      { to: '/invoices', label: 'الفواتير', icon: FileText },
      { to: '/payments', label: 'سندات الصرف', icon: Receipt },
    ],
  },
  {
    label: 'البيانات',
    items: [
      { to: '/vendors', label: 'الموردين', icon: Users },
      { to: '/products', label: 'البنود', icon: Package },
      { to: '/dictionary', label: 'قاموس المطابقة', icon: BookOpen },
    ],
  },
  {
    label: 'النظام',
    items: [
      { to: '/history', label: 'السجل', icon: History },
      { to: '/settings', label: 'الإعدادات', icon: Settings },
    ],
  },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [profileName, setProfileName] = useState('')
  const [profileRole, setProfileRole] = useState('')

  const fetchProfile = () => {
    if (!user?.username) return
    supabase.from('user_settings').select('profile_name, profile_role').eq('profile_username', user.username).single()
      .then(({ data }) => {
        if (data?.profile_name) setProfileName(data.profile_name)
        if (data?.profile_role) setProfileRole(data.profile_role)
      })
  }

  useEffect(() => { fetchProfile() }, [user])

  // Listen for profile updates
  useEffect(() => {
    const handleFocus = () => fetchProfile()
    window.addEventListener('focus', handleFocus)
    window.addEventListener('profile-updated', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('profile-updated', handleFocus)
    }
  }, [user])

  // Filter nav sections based on role
  const filteredSections = user?.role === 'ADMIN'
    ? navSections
    : navSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            UPLOADER_ALLOWED_ROUTES.includes(item.to)
          ),
        }))
        .filter((section) => section.items.length > 0)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Close on escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 right-3 z-50 p-2 rounded-lg bg-white border border-border shadow-sm lg:hidden"
        aria-label="فتح القائمة"
      >
        <Menu className="w-5 h-5 text-text" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-screen w-60 bg-white border-l border-border flex flex-col z-50 transition-all duration-200 lg:visible lg:opacity-100 ${
          open ? 'visible opacity-100' : 'invisible opacity-0 lg:visible lg:opacity-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16">
          <div className="flex items-center gap-2.5">
            <img src="/RASAD.png" alt="رصد" className="w-8 h-8 rounded-lg" />
            <div>
              <span className="text-sm font-bold text-text tracking-tight">رصد</span>
              <p className="text-[10px] text-text-muted leading-none mt-0.5">RASAD</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-md hover:bg-surface-lighter lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        <div className="mx-4 border-b border-border-light" />

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-3 flex flex-col gap-4 overflow-y-auto">
          {filteredSections.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider px-3 mb-1.5">{section.label}</p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ${
                        isActive
                          ? 'bg-primary-50 text-primary-dark font-semibold'
                          : 'text-text-secondary hover:bg-surface-lighter hover:text-text'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={`w-[18px] h-[18px] ${isActive ? 'text-primary' : ''}`}
                          strokeWidth={isActive ? 2 : 1.6}
                        />
                        <span>{item.label}</span>
                        {isActive && (
                          <span className="mr-auto w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User info + Logout */}
        <div className="mx-3 mb-3 p-3 bg-surface-light rounded-xl border border-border-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-text">{profileName || user?.username}</p>
              <p className="text-[10px] text-text-muted">
                {profileRole || (user?.role === 'ADMIN' ? 'مدير النظام' : 'رافع فواتير')}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mx-3 mb-4 flex items-center justify-center gap-1.5">
          <div className="h-px flex-1 bg-gradient-to-l from-primary/10 to-transparent" />
          <p className="text-[8px] text-text-muted/30 whitespace-nowrap">صُنع بإتقان في <span className="text-[#065F46]" style={{ fontFamily: 'Rikaz', fontFeatureSettings: '"salt", "ss01", "ss02", "ss03", "calt", "liga"', fontSize: '11px', textShadow: '0 0 8px rgba(16,185,129,0.3)' }}>ركِـاز</span></p>
          <div className="h-px flex-1 bg-gradient-to-r from-primary/10 to-transparent" />
        </div>
      </aside>
    </>
  )
}
