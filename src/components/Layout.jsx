import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, X, FileText, CheckCircle2, AlertCircle, AlertTriangle, Clock, Trash2,
  Megaphone, Sparkles, ArrowLeft, Sun, Moon, LayoutDashboard, Upload, CreditCard,
  Users, Package, BookOpen, History, Settings, Shield, ChevronDown, LogOut,
  LayoutGrid, Database,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Announcement, AnnouncementModal } from './ui'

/* ─────────── التنقّل: مجموعات الشريط العلوي ─────────── */
const NAV = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard },
  { to: '/upload', label: 'رفع الفواتير', icon: Upload },
  {
    label: 'المحاسبة', icon: FileText,
    children: [
      { to: '/invoices', label: 'الفواتير', icon: FileText },
      { to: '/payments', label: 'سندات الصرف', icon: CreditCard },
    ],
  },
  {
    label: 'البيانات', icon: Database,
    children: [
      { to: '/vendors', label: 'الموردين', icon: Users },
      { to: '/products', label: 'البنود', icon: Package },
      { to: '/dictionary', label: 'قاموس البنود', icon: BookOpen },
      { to: '/vendor-dictionary', label: 'قاموس الموردين', icon: BookOpen },
    ],
  },
  {
    label: 'النظام', icon: Settings,
    children: [
      { to: '/history', label: 'السجل', icon: History },
      { to: '/users', label: 'المستخدمين', icon: Users },
      { to: '/users/roles', label: 'الأدوار والصلاحيات', icon: Shield },
      { to: '/settings', label: 'الإعدادات', icon: Settings },
      { to: '/updates', label: 'تحديثات النظام', icon: Megaphone },
    ],
  },
]

// عناصر شريط الجوال السفلي (الرفع بالمنتصف)
const BOTTOM_NAV = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard },
  { to: '/invoices', label: 'الفواتير', icon: FileText },
  { to: '/upload', label: 'رفع', icon: Upload, center: true },
  { to: '/payments', label: 'السندات', icon: CreditCard },
]

const NOTIF_ICONS = {
  pushed: { icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary-50' },
  scanned: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
  matched: { icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
}

const NOTIF_LABELS = {
  pushed: 'تم إرسال فاتورة لقيود',
  scanned: 'تم قراءة فاتورة',
  matched: 'تم مطابقة فاتورة',
  error: 'فشل في معالجة فاتورة',
}

const FILTERS = [
  { id: 'all', label: 'الكل', statuses: null },
  { id: 'pushed', label: 'الإرسال', statuses: ['pushed'] },
  { id: 'scanned', label: 'القراءة', statuses: ['scanned', 'matched'] },
]

function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`
  return `منذ ${Math.floor(diff / 86400)} ي`
}

// Persistent warning banner about a known invoice format issue
function ZakharefWarning() {
  return (
    <div className="mb-5 sm:mb-7 flex items-start gap-3 rounded-xl px-4 py-3 bg-amber-50 border-r-[3px] border-amber-400">
      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-amber-700 mb-0.5">تنبيه: فواتير شركة زخارف البيت</p>
        <p className="text-[12px] leading-relaxed text-text-secondary">
          فواتير زخارف البيت لا تُستخرج بشكل دقيق حالياً. في حال رغبتكم باستخدام الذكاء الاصطناعي يرجى التحقق والتأكد من المخرجات، أو
          <span className="font-semibold text-text"> إدخالها يدوياً </span>
          لضمان الدقة.
        </p>
      </div>
    </div>
  )
}

// Bump this when you publish a new update entry in pages/Updates.jsx (use date or date+suffix)
const LATEST_UPDATE_DATE = '2026-07-22'
const LATEST_UPDATE_VERSION = 'v1.5.0'
const LATEST_UPDATE_TITLE = 'سندات الصرف — ادفع فواتيرك من رصد'

/* ─────────── قائمة منسدلة لمجموعة تنقّل ─────────── */
function NavGroup({ group, currentPath }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const isActive = group.children.some(c => currentPath === c.to || (c.to !== '/' && currentPath.startsWith(c.to + '/')))

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors ${
          isActive ? 'bg-text text-bg font-semibold' : 'text-text-secondary hover:text-text hover:bg-surface-lighter'
        }`}
        aria-expanded={open}
      >
        {group.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 min-w-[210px] bg-surface border border-border rounded-2xl shadow-lg p-1.5 z-50 dropdown-menu">
          {group.children.map((c) => (
            <NavLink
              key={c.to}
              to={c.to}
              end={c.to === '/users'}
              onClick={() => setOpen(false)}
              className={({ isActive: a }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-colors ${
                  a ? 'bg-primary-50 text-primary-dark font-semibold' : 'text-text-secondary hover:bg-surface-lighter hover:text-text'
                }`
              }
            >
              <c.icon className="w-4 h-4" strokeWidth={1.7} />
              {c.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, canAccess } = useAuth()

  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [filter, setFilter] = useState(() => localStorage.getItem('notif_filter') || 'all')
  const [clearedAt, setClearedAt] = useState(() => Number(localStorage.getItem('notif_cleared_at') || 0))
  const [updatesRead, setUpdatesRead] = useState(() => localStorage.getItem('updates_read_at') || '')
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [profileName, setProfileName] = useState('')
  const [profileRole, setProfileRole] = useState('')
  const notifRef = useRef(null)
  const userRef = useRef(null)
  const hasNewUpdate = LATEST_UPDATE_DATE > updatesRead

  useEffect(() => {
    const html = document.documentElement
    if (dark) html.classList.add('dark')
    else html.classList.remove('dark')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  // Profile info (name + role) for the user chip
  const fetchProfile = () => {
    if (!user?.username) return
    supabase.from('user_settings').select('profile_name, profile_role').eq('profile_username', user.username).single()
      .then(({ data }) => {
        if (data?.profile_name) setProfileName(data.profile_name)
        if (data?.profile_role) setProfileRole(data.profile_role)
      })
  }
  useEffect(() => { fetchProfile() }, [user])
  useEffect(() => {
    const handler = () => fetchProfile()
    window.addEventListener('focus', handler)
    window.addEventListener('profile-updated', handler)
    return () => {
      window.removeEventListener('focus', handler)
      window.removeEventListener('profile-updated', handler)
    }
  }, [user])

  // Show modal once when there's a new update and user hasn't seen it
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  useEffect(() => {
    if (hasNewUpdate && location.pathname !== '/updates' && location.pathname !== '/login') {
      const t = setTimeout(() => setUpdateModalOpen(true), 600)
      return () => clearTimeout(t)
    }
  }, [hasNewUpdate, location.pathname])

  const dismissUpdateModal = () => {
    setUpdateModalOpen(false)
    localStorage.setItem('updates_read_at', LATEST_UPDATE_DATE)
    setUpdatesRead(LATEST_UPDATE_DATE)
  }

  const goToUpdates = () => {
    dismissUpdateModal()
    navigate('/updates')
  }

  useEffect(() => {
    if (location.pathname === '/updates' && hasNewUpdate) {
      localStorage.setItem('updates_read_at', LATEST_UPDATE_DATE)
      setUpdatesRead(LATEST_UPDATE_DATE)
    }
  }, [location.pathname, hasNewUpdate])

  // Load recent invoices as notifications
  useEffect(() => {
    supabase
      .from('processed_invoices')
      .select('id, vendor_name, invoice_number, status, total_amount, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setNotifications(data || [])
      })
  }, [])

  useEffect(() => {
    localStorage.setItem('notif_filter', filter)
  }, [filter])

  const activeFilter = FILTERS.find(f => f.id === filter) || FILTERS[0]
  const visible = notifications.filter(n => {
    if (new Date(n.created_at).getTime() <= clearedAt) return false
    if (activeFilter.statuses && !activeFilter.statuses.includes(n.status)) return false
    return true
  })

  useEffect(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    setUnread(visible.filter(n => new Date(n.created_at).getTime() > dayAgo).length)
  }, [visible])

  const clearAll = () => {
    const now = Date.now()
    localStorage.setItem('notif_cleared_at', String(now))
    setClearedAt(now)
  }

  // Close popovers on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close mobile "more" sheet on route change
  useEffect(() => { setMoreOpen(false) }, [location.pathname])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  // Permission-filtered navigation
  const nav = NAV
    .map((item) => {
      if (item.children) {
        const children = item.children.filter(c => canAccess(c.to))
        return children.length ? { ...item, children } : null
      }
      return canAccess(item.to) ? item : null
    })
    .filter(Boolean)

  const bottomNav = BOTTOM_NAV.filter(i => canAccess(i.to))
  const bottomPaths = new Set(BOTTOM_NAV.map(i => i.to))
  // Everything accessible that didn't fit in the bottom bar → "المزيد" sheet
  const moreItems = NAV.flatMap(i => (i.children ? i.children : [i]))
    .filter(i => canAccess(i.to) && !bottomPaths.has(i.to))

  const displayName = profileName || user?.username || ''

  return (
    <div className="min-h-screen bg-bg">
      {/* ═══════════ الشريط العلوي ═══════════ */}
      <header className="fixed top-0 inset-x-0 z-40 bg-bg/90 backdrop-blur-md border-b border-border-light">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/RASAD.png" alt="رصد" className="w-9 h-9 rounded-xl" />
            <div className="leading-none">
              <span className="text-[15px] font-bold text-text tracking-tight">رصد</span>
              <p className="text-[9px] text-text-muted tracking-[0.22em] mt-0.5">RASAD</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {nav.map((item) =>
              item.children ? (
                <NavGroup key={item.label} group={item} currentPath={location.pathname} />
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors ${
                      isActive ? 'bg-text text-bg font-semibold' : 'text-text-secondary hover:text-text hover:bg-surface-lighter'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              )
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Updates */}
            <Link
              to="/updates"
              title="تحديثات النظام"
              className={`relative hidden sm:block p-2 rounded-full hover:bg-surface-lighter transition-colors ${
                location.pathname === '/updates' ? 'bg-primary-50' : ''
              }`}
            >
              <Megaphone className={`w-[18px] h-[18px] ${location.pathname === '/updates' ? 'text-primary' : 'text-text-secondary'}`} strokeWidth={1.6} />
              {hasNewUpdate && (
                <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-bg" />
              )}
            </Link>

            {/* Dark mode toggle */}
            <button
              onClick={() => setDark(!dark)}
              title={dark ? 'الوضع النهاري' : 'الوضع الليلي'}
              className="p-2 rounded-full hover:bg-surface-lighter transition-colors group"
            >
              <span className="block transition-transform duration-500" style={{ transform: dark ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                {dark
                  ? <Sun className="w-[18px] h-[18px] text-amber-500" strokeWidth={1.8} />
                  : <Moon className="w-[18px] h-[18px] text-text-secondary group-hover:text-primary" strokeWidth={1.8} />}
              </span>
            </button>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) setUnread(0) }}
                className="relative p-2 rounded-full hover:bg-surface-lighter transition-colors"
              >
                <Bell className="w-[18px] h-[18px] text-text-secondary" strokeWidth={1.6} />
                {unread > 0 && (
                  <span className="absolute top-1 left-1 min-w-[16px] h-4 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="fixed sm:absolute left-4 right-4 sm:left-0 sm:right-auto top-16 sm:top-full sm:mt-2 w-auto sm:w-80 bg-surface border border-border rounded-2xl shadow-lg overflow-hidden z-50 dropdown-menu">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
                    <h3 className="text-sm font-semibold text-text">الإشعارات</h3>
                    <div className="flex items-center gap-1">
                      {visible.length > 0 && (
                        <button onClick={clearAll} title="مسح الكل" className="p-1.5 rounded hover:bg-surface-lighter text-text-muted hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                        </button>
                      )}
                      <button onClick={() => setNotifOpen(false)} className="p-1 rounded hover:bg-surface-lighter">
                        <X className="w-3.5 h-3.5 text-text-muted" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-1.5 px-4 py-2 border-b border-border-light/60">
                    {FILTERS.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                          filter === f.id
                            ? 'bg-text text-bg'
                            : 'bg-surface-lighter text-text-muted hover:text-text-secondary'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {visible.length > 0 ? visible.map((n) => {
                      const config = NOTIF_ICONS[n.status] || NOTIF_ICONS.scanned
                      const Icon = config.icon
                      return (
                        <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-light transition-colors border-b border-border-light/50 last:border-0">
                          <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Icon className={`w-4 h-4 ${config.color}`} strokeWidth={1.8} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-text">{NOTIF_LABELS[n.status]}</p>
                            <p className="text-[11px] text-text-muted mt-0.5 truncate">
                              {n.vendor_name || 'فاتورة'} {n.invoice_number ? `#${n.invoice_number}` : ''}
                            </p>
                            {n.total_amount && (
                              <p className="text-[11px] text-text-muted">{Number(n.total_amount).toLocaleString('en-US')} ر.س</p>
                            )}
                          </div>
                          <span className="text-[10px] text-text-muted whitespace-nowrap flex-shrink-0">{timeAgo(n.created_at)}</span>
                        </div>
                      )
                    }) : (
                      <div className="py-10 text-center">
                        <Bell className="w-6 h-6 text-text-muted/30 mx-auto mb-2" />
                        <p className="text-[12px] text-text-muted">لا توجد إشعارات</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User chip */}
            <div ref={userRef} className="relative mr-1">
              <button
                onClick={() => setUserOpen(v => !v)}
                className="flex items-center gap-2 pr-1 pl-2 py-1 rounded-full border border-border hover:bg-surface-lighter transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-primary-50 text-primary-dark text-[12px] font-bold flex items-center justify-center">
                  {displayName.charAt(0) || '؟'}
                </span>
                <span className="hidden md:block text-[12.5px] font-medium text-text max-w-[110px] truncate">{displayName}</span>
                <ChevronDown className={`hidden md:block w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${userOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
              </button>

              {userOpen && (
                <div className="absolute top-full mt-2 left-0 w-56 bg-surface border border-border rounded-2xl shadow-lg overflow-hidden z-50 dropdown-menu">
                  <div className="px-4 py-3 border-b border-border-light">
                    <p className="text-[13px] font-bold text-text truncate">{displayName}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {profileRole || (user?.role === 'ADMIN' ? 'مدير النظام' : 'رافع فواتير')}
                    </p>
                  </div>
                  <div className="p-1.5">
                    {canAccess('/settings') && (
                      <Link
                        to="/settings"
                        onClick={() => setUserOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-text-secondary hover:bg-surface-lighter hover:text-text transition-colors"
                      >
                        <Settings className="w-4 h-4" strokeWidth={1.7} />
                        الإعدادات
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" strokeWidth={1.7} />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════ المحتوى ═══════════ */}
      <main className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 pt-[84px] sm:pt-[92px] pb-28 lg:pb-12">
        <Announcement id="ai-restored-2026-09" title="رجع الذكاء الاصطناعي يشتغل" until="2026-09-07">
          قراءة الفواتير رجعت تعمل على الموقع بعد إصلاح سبب التوقف، وصارت أسرع.
          كذلك تحسّنت دقة مطابقة البنود — راجع المطابقة قبل الإرسال كالعادة.
        </Announcement>
        <ZakharefWarning />
        <Outlet />
      </main>

      {/* ═══════════ شريط الجوال السفلي ═══════════ */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch justify-around h-16">
          {bottomNav.map((item) =>
            item.center ? (
              <NavLink key={item.to} to={item.to} className="relative flex flex-col items-center justify-end pb-1.5 w-16">
                {({ isActive }) => (
                  <>
                    <span className={`absolute -top-5 w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg ring-4 ring-bg transition-colors ${
                      isActive ? 'bg-primary-dark' : 'bg-primary'
                    }`}>
                      <item.icon className="w-[22px] h-[22px] text-white" strokeWidth={2} />
                    </span>
                    <span className={`text-[10px] font-semibold ${isActive ? 'text-primary-dark' : 'text-text-muted'}`}>{item.label}</span>
                  </>
                )}
              </NavLink>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className="flex flex-col items-center justify-center gap-1 flex-1"
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-[20px] h-[20px] ${isActive ? 'text-primary-dark' : 'text-text-muted'}`} strokeWidth={isActive ? 2.2 : 1.7} />
                    <span className={`text-[10px] ${isActive ? 'text-primary-dark font-bold' : 'text-text-muted font-medium'}`}>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          )}

          {/* المزيد */}
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center justify-center gap-1 flex-1">
            <span className="relative">
              <LayoutGrid className="w-[20px] h-[20px] text-text-muted" strokeWidth={1.7} />
              {hasNewUpdate && <span className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 bg-primary rounded-full" />}
            </span>
            <span className="text-[10px] text-text-muted font-medium">المزيد</span>
          </button>
        </div>
      </nav>

      {/* Bottom sheet: المزيد (mobile) */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] modal-overlay" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-surface border-t border-border rounded-t-3xl rise-enter pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="flex justify-center pt-3 pb-1">
              <span className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-5 py-2">
              <h3 className="text-[14px] font-bold text-text">كل الأقسام</h3>
              <button onClick={() => setMoreOpen(false)} className="p-1.5 rounded-full hover:bg-surface-lighter">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 pt-1">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/users'}
                  className={({ isActive }) =>
                    `relative flex flex-col items-center gap-2 py-4 rounded-2xl border transition-colors ${
                      isActive ? 'border-primary/30 bg-primary-50' : 'border-border-light bg-surface-light'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-dark' : 'text-text-secondary'}`} strokeWidth={1.7} />
                      <span className={`text-[11px] font-medium text-center px-1 ${isActive ? 'text-primary-dark' : 'text-text-secondary'}`}>{item.label}</span>
                      {item.to === '/updates' && hasNewUpdate && (
                        <span className="absolute top-2 left-2 w-1.5 h-1.5 bg-primary rounded-full" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-border-light bg-surface-light text-red-500"
              >
                <LogOut className="w-5 h-5" strokeWidth={1.7} />
                <span className="text-[11px] font-medium">تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* إعلان عودة الذكاء الاصطناعي — أول ما يشوفه المستخدم، ولا يزاحم مودال التحديثات */}
      {!updateModalOpen && (
        <AnnouncementModal
          id="ai-restored-2026-09"
          kicker="خبر النظام"
          title="رجع الذكاء الاصطناعي يشتغل"
          until="2026-09-07"
          points={[
            'قراءة الفواتير رجعت تعمل على الموقع بعد إصلاح سبب التوقف',
            'صارت أسرع — الفاتورة تُقرأ خلال ثوانٍ معدودة',
            'تحسّنت دقة مطابقة البنود، وقلّت المطابقات الخاطئة',
          ]}
          cta="تمام، ابدأ"
        >
          تقدر ترفع فواتيرك وتقرأها بالذكاء الاصطناعي زي أول. راجع المطابقة قبل الإرسال كالعادة.
        </AnnouncementModal>
      )}

      {/* New Update Modal — shown once per user when there's a new update */}
      {updateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-overlay bg-black/50 backdrop-blur-sm"
          onClick={dismissUpdateModal}>
          <div className="relative bg-surface rounded-2xl max-w-md w-full overflow-hidden shadow-2xl modal-content border border-border"
            onClick={e => e.stopPropagation()}>
            <div className="relative px-6 pt-7 pb-6 text-center bg-primary-50 border-b border-border-light">
              <button onClick={dismissUpdateModal}
                className="absolute top-3 left-3 p-1.5 rounded-lg text-text-muted hover:bg-surface hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>

              <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface border border-border-light mb-3">
                <Sparkles className="w-7 h-7 text-primary" strokeWidth={1.5} />
              </div>

              <div className="relative">
                <span className="inline-block text-[10px] font-mono font-bold text-primary-dark bg-surface px-2 py-0.5 rounded mb-2 border border-border-light">
                  {LATEST_UPDATE_VERSION}
                </span>
                <h2 className="text-lg font-bold text-text mb-1">تحديث جديد متاح!</h2>
                <p className="text-[13px] text-text-secondary">{LATEST_UPDATE_TITLE}</p>
              </div>
            </div>

            <div className="px-6 py-5 text-center">
              <p className="text-[13px] text-text-secondary leading-relaxed">
                ضفنا ميزات وتحسينات جديدة لتجربتك في رصد. اطلع عليها الحين عشان تستفيد منها.
              </p>

              <div className="flex flex-col sm:flex-row gap-2 mt-5">
                <button onClick={dismissUpdateModal}
                  className="flex-1 px-4 py-2.5 rounded-full border border-border text-text-secondary text-[13px] font-medium hover:bg-surface-lighter transition-colors">
                  لاحقاً
                </button>
                <button onClick={goToUpdates}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-primary hover:bg-primary-dark text-white text-[13px] font-semibold transition-colors">
                  <span>عرض التحديث</span>
                  <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
