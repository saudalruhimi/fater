import { NavLink, useLocation } from 'react-router-dom'
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
} from 'lucide-react'
import { useState, useEffect } from 'react'

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
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <span className="text-sm font-bold text-text tracking-tight">AI SCAN</span>
              <p className="text-[10px] text-text-muted leading-none mt-0.5">قارئ الفواتير الذكي</p>
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
          {navSections.map((section) => (
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

        {/* Bottom card */}
        <div className="mx-3 mb-4 p-3 bg-primary-50 rounded-xl border border-primary-100">
          <p className="text-[11px] text-primary-dark font-medium mb-1">نسخة تجريبية</p>
          <p className="text-[10px] text-text-muted leading-relaxed">استمتع بجميع المزايا مجاناً خلال فترة التجربة</p>
        </div>
      </aside>
    </>
  )
}
