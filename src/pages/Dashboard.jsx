import {
  FileText,
  Upload,
  RefreshCw,
  Loader2,
  BookOpen,
  ArrowLeft,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { testQoyodConnection } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { ledger, EmptyState } from '../components/ui'

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
    checking: { border: 'border-border', bg: 'bg-surface', text: 'text-text-muted', label: 'جارِ التحقق...' },
    connected: { border: 'border-primary/20', bg: 'bg-primary-50', text: 'text-primary-dark', label: 'متصل بقيود' },
    disconnected: { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700', label: 'غير متصل' },
  }

  const c = config[status]

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${c.border} ${c.bg} transition-all`}>
      <div className="relative flex-shrink-0">
        <img src="/qoyod.png" alt="قيود" className="w-4 h-4 rounded-sm" />
        <span className={`absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full border border-surface ${status === 'connected' ? 'bg-primary' : status === 'disconnected' ? 'bg-red-400' : 'bg-gray-300 animate-pulse'}`} />
      </div>
      <span className={`text-[11px] font-medium ${c.text}`}>{c.label}</span>
      <button
        onClick={checkConnection}
        disabled={checking}
        className="p-0.5 text-text-muted hover:text-text transition-colors disabled:opacity-50"
        title="إعادة التحقق"
      >
        <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} strokeWidth={1.8} />
      </button>
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

// Small-caps section title with a hairline — the ledger side-widget header
function SectionTitle({ children, trailing }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h3 className="text-[12px] font-bold text-text tracking-[0.08em] whitespace-nowrap">{children}</h3>
      <div className="flex-1 border-b border-border" />
      {trailing}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [profileName, setProfileName] = useState('')
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekData, setWeekData] = useState([0, 0, 0, 0, 0, 0, 0])

  useEffect(() => {
    fetchData()
    if (user?.username) {
      supabase.from('user_settings').select('profile_name').eq('profile_username', user.username).single()
        .then(({ data }) => { if (data?.profile_name) setProfileName(data.profile_name) })
    }
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
  const recentInvoices = invoices.slice(0, 6)

  const maxWeek = Math.max(...weekData, 1)
  const weekTotal = weekData.reduce((a, b) => a + b, 0)

  const todayLabel = new Date().toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const stats = [
    { label: 'إجمالي الفواتير', value: totalInvoices.toLocaleString('en-US'), sub: 'منذ بداية الاستخدام' },
    { label: 'مرفوعة اليوم', value: todayInvoices.toLocaleString('en-US'), sub: todayInvoices > 0 ? 'استمر 👏' : 'لا شيء بعد' },
    { label: 'نسبة المطابقة', value: `${Math.round(matchRate)}%`, sub: `${matchedOrPushed} من ${totalInvoices}`, admin: true },
    { label: 'بها أخطاء', value: errorCount.toLocaleString('en-US'), sub: errorCount > 0 ? 'تحتاج مراجعة' : 'كل شيء سليم', alert: errorCount > 0 },
  ]
  const visibleStats = isAdmin ? stats : stats.filter(s => !s.admin)

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full animate-page">
      {/* ── Greeting band ── */}
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
          <div>
            <p className="text-[11px] font-bold text-primary-dark tracking-[0.12em] mb-2">{todayLabel}</p>
            <h1 className="text-[26px] sm:text-[32px] font-black text-text leading-[1.25]">
              حيّاك الله يا {profileName || user?.username} 👋
            </h1>
            <p className="text-[13.5px] text-text-secondary mt-2 leading-relaxed">هذا دفتر نشاطك — آخر الفواتير، وأداء الأسبوع.</p>
          </div>
          <QoyodStatus />
        </div>
        <div className="rule-double" />
      </header>

      {/* ── Stat strip — one band, vertical hairlines ── */}
      <div className="grid grid-cols-2 lg:flex mb-8 sm:mb-10 border-b border-border">
        {visibleStats.map((s, i) => (
          <div
            key={s.label}
            className={`flex-1 py-4 sm:py-5 px-4 sm:px-6 ${i !== 0 ? 'lg:border-r lg:border-border' : ''} ${i % 2 === 1 ? 'border-r border-border lg:border-r' : ''} ${i >= 2 ? 'border-t border-border lg:border-t-0' : ''}`}
          >
            <p className="text-[11px] text-text-muted mb-2">{s.label}</p>
            <p className={`text-[34px] sm:text-[42px] font-black leading-none stat-value ${s.alert ? 'text-red-600' : 'text-text'}`}>
              {s.value}
            </p>
            <p className={`text-[11px] mt-2 ${s.alert ? 'text-red-500' : 'text-text-muted'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10 lg:gap-12">
        {/* ── Recent invoices — ledger table ── */}
        <section className="min-w-0">
          <SectionTitle
            trailing={
              <Link to="/history" className="flex items-center gap-1 text-[12px] font-semibold text-primary-dark hover:text-primary transition-colors whitespace-nowrap">
                السجل الكامل
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            }
          >
            آخر الفواتير
          </SectionTitle>

          {recentInvoices.length > 0 ? (
            <div className={ledger.wrap}>
              <table className={ledger.table}>
                <thead>
                  <tr className={ledger.headRow}>
                    <th className={`${ledger.th} w-8`}>#</th>
                    <th className={ledger.th}>المورد</th>
                    <th className={ledger.th}>رقم الفاتورة</th>
                    {isAdmin && <th className={`${ledger.th} text-left`}>المبلغ</th>}
                    <th className={ledger.th}>الحالة</th>
                    <th className={`${ledger.th} text-left`}>الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv, i) => (
                    <tr key={inv.id} className={ledger.row}>
                      <td className={`${ledger.td} text-text-muted text-[11px]`}>{i + 1}</td>
                      <td className={`${ledger.td} font-semibold text-text`}>{inv.vendor_name || 'بدون مورد'}</td>
                      <td className={`${ledger.td} text-text-muted font-mono text-[12px]`}>{inv.invoice_number || '—'}</td>
                      {isAdmin && (
                        <td className={`${ledger.td} text-left font-semibold text-text whitespace-nowrap`}>
                          {inv.total_amount != null ? Number(inv.total_amount).toLocaleString('en-US') : '—'}
                          {inv.total_amount != null && <span className="text-[10px] font-normal text-text-muted mr-1">ر.س</span>}
                        </td>
                      )}
                      <td className={ledger.td}>
                        {statusConfig[inv.status] && (
                          <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${statusConfig[inv.status].bg}`}>
                            {statusConfig[inv.status].label}
                          </span>
                        )}
                      </td>
                      <td className={`${ledger.td} text-left text-text-muted text-[11px] whitespace-nowrap`}>{formatTimeAgo(inv.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="لا توجد فواتير بعد"
              hint="ارفع أول فاتورة للبدء"
              action={
                <Link to="/upload" className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-dark text-white text-[13px] font-semibold px-5 py-2.5 transition-colors">
                  <Upload className="w-4 h-4" strokeWidth={2} />
                  رفع فاتورة
                </Link>
              }
            />
          )}
        </section>

        {/* ── Side column — flat widgets ── */}
        <aside className="flex flex-col gap-10">
          {/* Week activity */}
          <section>
            <SectionTitle trailing={<span className="text-[11px] text-text-muted whitespace-nowrap">{weekTotal} فاتورة</span>}>
              هذا الأسبوع
            </SectionTitle>
            <div className="flex items-end gap-2 h-28 mb-2 border-b border-border pb-px">
              {weekData.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                  {val > 0 && <span className="text-[10px] text-text-muted">{val}</span>}
                  <div
                    className={`w-full rounded-t-[3px] transition-all ${
                      i === weekData.length - 1 ? 'bg-primary' : 'bg-primary/20'
                    }`}
                    style={{ height: `${Math.max((val / maxWeek) * 85, val > 0 ? 8 : 2)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {weekDays.map((d, i) => (
                <span key={i} className={`flex-1 text-center text-[10px] ${i === weekDays.length - 1 ? 'text-text font-bold' : 'text-text-muted'}`}>{d}</span>
              ))}
            </div>
          </section>

          {/* Match rate */}
          {isAdmin && (
            <section>
              <SectionTitle>نسبة المطابقة</SectionTitle>
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="var(--color-surface-lighter)" strokeWidth="4" />
                    <circle
                      cx="28" cy="28" r="24" fill="none"
                      stroke="var(--color-primary)" strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 24 * (matchRate / 100)} ${2 * Math.PI * 24}`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-text">
                    {Math.round(matchRate)}%
                  </span>
                </div>
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  <span className="font-bold text-text">{matchedOrPushed}</span> فاتورة تمت مطابقتها أو رفعها من أصل <span className="font-bold text-text">{totalInvoices}</span>
                </p>
              </div>
            </section>
          )}

          {/* Quick actions */}
          <section>
            <SectionTitle>إجراءات سريعة</SectionTitle>
            <div className="flex flex-col gap-2">
              <Link
                to="/upload"
                className="flex items-center justify-between px-4 py-3 rounded-full bg-primary text-white text-[13px] font-semibold hover:bg-primary-dark transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Upload className="w-4 h-4" strokeWidth={2} />
                  رفع فاتورة جديدة
                </span>
                <ArrowLeft className="w-4 h-4" strokeWidth={2} />
              </Link>
              <Link
                to="/dictionary"
                className="flex items-center justify-between px-4 py-3 rounded-full border border-border text-text-secondary text-[13px] font-medium hover:bg-surface-lighter hover:text-text transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4" strokeWidth={1.6} />
                  قاموس المطابقة
                </span>
                <ArrowLeft className="w-4 h-4" strokeWidth={1.6} />
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
