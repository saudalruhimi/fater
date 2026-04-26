import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Search, Bell, X, FileText, CheckCircle2, AlertCircle, Clock, Trash2, Megaphone, Sparkles, ArrowLeft, Sun, Moon } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

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

// Bump this when you publish a new update entry in pages/Updates.jsx (use date or date+suffix)
const LATEST_UPDATE_DATE = '2026-04-26-2'
const LATEST_UPDATE_VERSION = 'v1.3.0'
const LATEST_UPDATE_TITLE = 'الوضع الليلي + نظام Toast الذكي'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [filter, setFilter] = useState(() => localStorage.getItem('notif_filter') || 'all')
  const [clearedAt, setClearedAt] = useState(() => Number(localStorage.getItem('notif_cleared_at') || 0))
  const [updatesRead, setUpdatesRead] = useState(() => localStorage.getItem('updates_read_at') || '')
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const ref = useRef(null)
  const hasNewUpdate = LATEST_UPDATE_DATE > updatesRead

  useEffect(() => {
    const html = document.documentElement
    if (dark) html.classList.add('dark')
    else html.classList.remove('dark')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

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

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="min-h-screen bg-bg overflow-x-hidden">
      <Sidebar />

      <div className="lg:mr-60">
        {/* Top Bar */}
        <header className="sticky top-0 z-10 bg-bg/80 backdrop-blur-sm border-b border-border-light px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="w-10 lg:hidden" />

          <div className="relative hidden sm:block">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
            <input
              type="text"
              placeholder="بحث..."
              className="bg-white border border-border rounded-lg py-1.5 pr-9 pl-4 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/40 w-48 md:w-64 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 sm:mr-0 mr-auto">
          {/* Updates */}
          <Link
            to="/updates"
            title="تحديثات النظام"
            className={`relative p-2 rounded-lg hover:bg-surface-lighter transition-colors ${
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
            className="relative p-2 rounded-lg hover:bg-surface-lighter transition-colors overflow-hidden group"
          >
            <span className="block transition-transform duration-500" style={{ transform: dark ? 'rotate(0deg)' : 'rotate(180deg)' }}>
              {dark
                ? <Sun className="w-[18px] h-[18px] text-amber-400" strokeWidth={1.8} />
                : <Moon className="w-[18px] h-[18px] text-text-secondary group-hover:text-primary" strokeWidth={1.8} />}
            </span>
          </button>

          {/* Notifications */}
          <div ref={ref} className="relative">
            <button
              onClick={() => { setOpen(!open); if (!open) setUnread(0) }}
              className="relative p-2 rounded-lg hover:bg-surface-lighter transition-colors"
            >
              <Bell className="w-[18px] h-[18px] text-text-secondary" strokeWidth={1.6} />
              {unread > 0 && (
                <span className="absolute top-1 left-1 min-w-[16px] h-4 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {open && (
              <div className="fixed sm:absolute left-4 right-4 sm:left-0 sm:right-auto top-14 sm:top-full sm:mt-2 w-auto sm:w-80 bg-white border border-border-light rounded-2xl shadow-lg overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
                  <h3 className="text-sm font-semibold text-text">الإشعارات</h3>
                  <div className="flex items-center gap-1">
                    {visible.length > 0 && (
                      <button onClick={clearAll} title="مسح الكل" className="p-1.5 rounded hover:bg-surface-lighter text-text-muted hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </button>
                    )}
                    <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-surface-lighter">
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
                          ? 'bg-primary text-white'
                          : 'bg-surface-lighter text-text-muted hover:bg-surface-light'
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
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-light/60 transition-colors border-b border-border-light/50 last:border-0">
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
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* New Update Modal — shown once per user when there's a new update */}
      {updateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-overlay bg-black/50 backdrop-blur-sm"
          onClick={dismissUpdateModal}>
          <div className="relative bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl modal-content"
            onClick={e => e.stopPropagation()}>
            {/* Decorative top with gradient + dots */}
            <div className="relative bg-gradient-to-br from-primary-50 via-emerald-50 to-teal-50 px-6 pt-7 pb-6 text-center">
              <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.2) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }} />
              <button onClick={dismissUpdateModal}
                className="absolute top-3 left-3 p-1.5 rounded-lg text-text-muted hover:bg-white/70 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>

              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md mb-3">
                <Sparkles className="w-8 h-8 text-primary" strokeWidth={1.5} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full ring-4 ring-white animate-pulse" />
              </div>

              <div className="relative">
                <span className="inline-block text-[10px] font-mono font-bold text-primary-dark bg-white/80 px-2 py-0.5 rounded mb-2">
                  {LATEST_UPDATE_VERSION}
                </span>
                <h2 className="text-lg font-bold text-text mb-1">تحديث جديد متاح!</h2>
                <p className="text-[13px] text-text-muted">{LATEST_UPDATE_TITLE}</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 text-center">
              <p className="text-[13px] text-text-secondary leading-relaxed">
                ضفنا ميزات وتحسينات جديدة لتجربتك في رصد. اطلع عليها الحين عشان تستفيد منها.
              </p>

              <div className="flex flex-col sm:flex-row gap-2 mt-5">
                <button onClick={dismissUpdateModal}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border-light text-text-muted text-[13px] font-medium hover:bg-surface-lighter transition-colors">
                  لاحقاً
                </button>
                <button onClick={goToUpdates}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-[13px] font-semibold transition-colors">
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
