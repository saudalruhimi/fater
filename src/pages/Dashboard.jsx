import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Plug,
  RefreshCw,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { testQoyodConnection } from '../lib/api'

const statusConfig = {
  scanned: { label: 'ممسوحة', bg: 'bg-blue-50 text-blue-700' },
  matched: { label: 'مطابقة', bg: 'bg-primary-50 text-primary-dark' },
  pushed: { label: 'مرفوعة', bg: 'bg-emerald-50 text-emerald-700' },
  error: { label: 'خطأ', bg: 'bg-red-50 text-red-700' },
}

const weekDays = ['سبت', 'أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع']

function QoyodStatus() {
  const [status, setStatus] = useState('checking') // checking | connected | disconnected
  const [checking, setChecking] = useState(false)

  const checkConnection = async () => {
    setChecking(true)
    setStatus('checking')
    try {
      const result = await testQoyodConnection()
      setStatus(result.connected ? 'connected' : 'disconnected')
    } catch {
      setStatus('disconnected')
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  const config = {
    checking: {
      border: 'border-border-light',
      bg: 'bg-white',
      dot: 'bg-gray-300 animate-pulse',
      text: 'text-text-muted',
      label: 'جارِ التحقق...',
    },
    connected: {
      border: 'border-primary/20',
      bg: 'bg-primary-50/40',
      dot: 'bg-primary',
      text: 'text-primary-dark',
      label: 'متصل',
    },
    disconnected: {
      border: 'border-red-200',
      bg: 'bg-red-50/40',
      dot: 'bg-red-400',
      text: 'text-red-700',
      label: 'غير متصل',
    },
  }

  const c = config[status]

  return (
    <div className={`flex items-center justify-between gap-3 mb-5 px-4 py-3 rounded-xl border ${c.border} ${c.bg} transition-all`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white border border-border-light flex items-center justify-center flex-shrink-0">
          <Plug className="w-4 h-4 text-text-muted" strokeWidth={1.6} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-text">قيود</span>
            <span className="text-[11px] text-text-muted hidden sm:inline">— النظام المحاسبي</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
            <span className={`text-[11px] font-medium ${c.text}`}>{c.label}</span>
            {status === 'connected' && (
              <span className="text-[10px] text-text-muted hidden sm:inline">· فواتير المشتريات</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={checkConnection}
          disabled={checking}
          className="p-1.5 rounded-lg hover:bg-white/80 text-text-muted hover:text-text transition-colors disabled:opacity-50"
          title="إعادة التحقق"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} strokeWidth={1.8} />
        </button>
        <Link
          to="/settings"
          className="p-1.5 rounded-lg hover:bg-white/80 text-text-muted hover:text-text transition-colors hidden sm:flex"
          title="إعدادات الربط"
        >
          <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.8} />
        </Link>
      </div>
    </div>
  )
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'الآن'
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `منذ ${diffHours} ساعة`
  const diffDays = Math.floor(diffHours / 24)
  return `منذ ${diffDays} يوم`
}

export default function Dashboard() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekData, setWeekData] = useState([0, 0, 0, 0, 0, 0, 0])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch all invoices
      const { data, error } = await supabase
        .from('processed_invoices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvoices(data || [])

      // Calculate weekly data
      const now = new Date()
      const dayOfWeek = now.getDay() // 0=Sun
      // Map to Sat-based week: Sat=0, Sun=1, ..., Fri=6
      const satIndex = (dayOfWeek + 1) % 7
      const weekly = [0, 0, 0, 0, 0, 0, 0]
      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

      ;(data || []).forEach((inv) => {
        const d = new Date(inv.created_at)
        if (d >= sevenDaysAgo) {
          const invDay = (d.getDay() + 1) % 7
          weekly[invDay] += 1
        }
      })

      // Rotate so today is last
      const rotated = []
      for (let i = 0; i < 7; i++) {
        rotated.push(weekly[(satIndex + 1 + i) % 7])
      }
      setWeekData(rotated)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalInvoices = invoices.length
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayInvoices = invoices.filter((inv) => inv.created_at?.startsWith(todayStr)).length
  const matchedOrPushed = invoices.filter((inv) => inv.status === 'matched' || inv.status === 'pushed').length
  const matchRate = totalInvoices > 0 ? ((matchedOrPushed / totalInvoices) * 100).toFixed(1) : '0'
  const errorCount = invoices.filter((inv) => inv.status === 'error').length
  const recentInvoices = invoices.slice(0, 5)

  const maxWeek = Math.max(...weekData, 1)

  const stats = [
    {
      label: 'إجمالي الفواتير',
      value: totalInvoices.toLocaleString('en-US'),
      icon: FileText,
      accent: 'bg-primary-50 text-primary',
    },
    {
      label: 'مرفوعة اليوم',
      value: todayInvoices.toLocaleString('en-US'),
      icon: Upload,
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'مطابقة ناجحة',
      value: `${matchRate}%`,
      icon: CheckCircle2,
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'بها أخطاء',
      value: errorCount.toLocaleString('en-US'),
      icon: AlertTriangle,
      accent: 'bg-amber-50 text-amber-600',
    },
  ]

  if (loading) {
    return (
      <div className="max-w-6xl flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      {/* Welcome */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-lg sm:text-xl font-bold text-text">مرحباً بك</h1>
        <p className="text-xs sm:text-sm text-text-muted mt-1">إليك ملخص نشاط الفواتير اليوم</p>
      </div>

      {/* Qoyod API Status */}
      <QoyodStatus />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl sm:rounded-2xl border border-border-light p-4 sm:p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl ${s.accent} flex items-center justify-center`}>
                <s.icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={1.8} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-text leading-none mb-1">{s.value}</p>
            <p className="text-[11px] sm:text-xs text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl border border-border-light overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border-light">
            <h2 className="text-sm font-semibold text-text">آخر الفواتير</h2>
            <Link to="/history" className="text-xs text-primary hover:text-primary-dark transition-colors font-medium">
              عرض الكل
            </Link>
          </div>

          {recentInvoices.length > 0 ? (
            <div className="divide-y divide-border-light/70">
              {recentInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-surface-light/60 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-surface-lighter flex items-center justify-center flex-shrink-0 hidden sm:flex">
                      <FileText className="w-4 h-4 text-text-muted" strokeWidth={1.6} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text truncate">{inv.vendor_name || 'بدون مورد'}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {inv.invoice_number || '—'} · {formatTimeAgo(inv.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pr-0 sm:pr-0">
                    <div className="sm:text-left sm:min-w-[80px]">
                      <span className="text-[13px] font-semibold text-text">
                        {inv.total_amount != null ? Number(inv.total_amount).toLocaleString('en-US') : '—'}
                      </span>
                      {inv.total_amount != null && <span className="text-[10px] text-text-muted mr-1">ر.س</span>}
                    </div>

                    {statusConfig[inv.status] && (
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${statusConfig[inv.status].bg}`}>
                        {statusConfig[inv.status].label}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-surface-lighter flex items-center justify-center mb-2">
                <FileText className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-text mb-0.5">لا توجد فواتير بعد</p>
              <p className="text-xs text-text-muted">ارفع أول فاتورة للبدء</p>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          {/* Mini Chart */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-border-light p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <h3 className="text-sm font-semibold text-text">هذا الأسبوع</h3>
            </div>

            <div className="flex items-end gap-1.5 sm:gap-2 h-24 sm:h-28 mb-3">
              {weekData.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full">
                    <div
                      className={`w-full rounded-md transition-all ${
                        i === weekData.length - 1 ? 'bg-primary' : 'bg-primary/15'
                      }`}
                      style={{ height: `${maxWeek > 0 ? (val / maxWeek) * 100 : 0}px` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 sm:gap-2">
              {weekDays.map((d, i) => (
                <span key={i} className="flex-1 text-center text-[10px] text-text-muted">{d}</span>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-border-light p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-text mb-3">إجراءات سريعة</h3>
            <div className="flex flex-col gap-2">
              <Link
                to="/upload"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-primary text-white text-[13px] font-medium hover:bg-primary-dark transition-colors"
              >
                <Upload className="w-4 h-4" strokeWidth={2} />
                رفع فاتورة جديدة
              </Link>
              <Link
                to="/dictionary"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border text-text-secondary text-[13px] font-medium hover:bg-surface-lighter transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" strokeWidth={1.6} />
                إدارة قاموس المطابقة
              </Link>
            </div>
          </div>

          {/* Match rate ring */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-border-light p-4 sm:p-5 flex items-center gap-4 sm:col-span-2 lg:col-span-1">
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="#F3F4F6" strokeWidth="5" />
                <circle
                  cx="28" cy="28" r="24" fill="none"
                  stroke="#10B981" strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 24 * (matchRate / 100)} ${2 * Math.PI * 24}`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-text">
                {Math.round(matchRate)}%
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-text">نسبة المطابقة</p>
              <p className="text-[11px] text-text-muted mt-0.5">{matchedOrPushed} من {totalInvoices} فاتورة</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
