import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Search, Bell, X, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
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

function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`
  return `منذ ${Math.floor(diff / 86400)} ي`
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const ref = useRef(null)

  // Load recent invoices as notifications
  useEffect(() => {
    supabase
      .from('processed_invoices')
      .select('id, vendor_name, invoice_number, status, total_amount, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setNotifications(data || [])
        // Count items from last 24h as unread
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000
        setUnread((data || []).filter(n => new Date(n.created_at).getTime() > dayAgo).length)
      })
  }, [])

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

          {/* Notifications */}
          <div ref={ref} className="relative sm:mr-0 mr-auto">
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
                  <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-surface-lighter">
                    <X className="w-3.5 h-3.5 text-text-muted" />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? notifications.map((n) => {
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
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
