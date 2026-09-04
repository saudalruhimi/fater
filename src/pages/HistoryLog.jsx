import {
  Search, FileText, CheckCircle2, Clock, XCircle,
  Eye, Download, RotateCcw, Loader2, ScanLine, ArrowUpFromLine,
} from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { exportHistoryPDF, exportInvoiceDetailPDF } from '../lib/pdf'
import { PageHeader, PillTabs, EmptyState, Sheet, btn } from '../components/ui'

const STATUS = {
  scanned: { label: 'ممسوحة', icon: ScanLine, bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-400' },
  matched: { label: 'مطابقة', icon: CheckCircle2, bg: 'bg-primary-50 text-primary-dark', dot: 'bg-primary' },
  pushed: { label: 'مرفوعة', icon: ArrowUpFromLine, bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-400' },
  error: { label: 'خطأ', icon: XCircle, bg: 'bg-red-50 text-red-700', dot: 'bg-red-400' },
}

const TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'scanned', label: 'ممسوحة' },
  { key: 'matched', label: 'مطابقة' },
  { key: 'pushed', label: 'مرفوعة' },
  { key: 'error', label: 'خطأ' },
]

function formatDate(dateStr) {
  if (!dateStr) return dateStr
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)
  const d = dateStr.slice(0, 10)
  if (d === todayStr) return 'اليوم'
  if (d === yesterdayStr) return 'أمس'
  return d
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function groupByDate(logs) {
  const groups = {}
  logs.forEach((log) => {
    const label = formatDate(log.created_at || log.invoice_date)
    if (!groups[label]) groups[label] = []
    groups[label].push(log)
  })
  return Object.entries(groups)
}

export default function HistoryLog() {
  const [allLogs, setAllLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('processed_invoices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAllLogs(data || [])
    } catch (err) {
      console.error('Error fetching logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let result = allLogs
    if (tab !== 'all') result = result.filter((l) => l.status === tab)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((l) =>
        (l.vendor_name || '').toLowerCase().includes(q) ||
        (l.invoice_number || '').toLowerCase().includes(q) ||
        String(l.total_amount || '').includes(q)
      )
    }
    return result
  }, [allLogs, search, tab])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const tabCount = (key) => {
    if (key === 'all') return allLogs.length
    return allLogs.filter((l) => l.status === key).length
  }

  const visibleTabs = TABS.map(t => ({ ...t, count: tabCount(t.key) }))

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full animate-page">
      <PageHeader
        kicker="النظام"
        title="السجل"
        description="يوميات كل عمليات معالجة الفواتير — قراءةً ومطابقةً وإرسالاً."
        actions={
          <button
            type="button"
            onClick={() => exportHistoryPDF(filtered.length ? filtered : allLogs)}
            disabled={!allLogs.length}
            className={btn.ghost}
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
            تصدير PDF
          </button>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المورد أو رقم الفاتورة أو المبلغ..."
              className="w-full bg-surface border border-border rounded-full py-2.5 pr-10 pl-4 text-[13px] text-text placeholder-text-muted focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
          <PillTabs tabs={visibleTabs} active={tab} onChange={setTab} />
        </div>
      </PageHeader>

      {/* Timeline ledger — a rail of days */}
      {grouped.length > 0 ? (
        <div className="relative">
          {/* Vertical rail */}
          <div className="absolute top-1 bottom-1 right-[5px] w-px bg-border hidden sm:block" />

          <div className="space-y-8">
            {grouped.map(([dateLabel, logs]) => (
              <section key={dateLabel} className="relative sm:pr-8">
                {/* Rail node */}
                <span className="hidden sm:block absolute right-0 top-1.5 w-[11px] h-[11px] rounded-full bg-primary ring-4 ring-bg" />

                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className="text-[15px] font-bold text-text">{dateLabel}</h2>
                  <span className="text-[11px] text-text-muted">{logs.length} عملية</span>
                  <div className="flex-1 border-b border-border" />
                </div>

                <div>
                  {logs.map((log) => {
                    const s = STATUS[log.status] || STATUS.scanned
                    return (
                      <button
                        key={log.id}
                        onClick={() => setDetail(log)}
                        className="w-full text-right group flex items-center gap-3 sm:gap-4 py-3 border-b border-border-light hover:bg-surface-light/70 transition-colors"
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-text truncate">{log.vendor_name || 'بدون مورد'}</p>
                          <p className="text-[11px] text-text-muted mt-0.5 truncate font-mono">{log.invoice_number || '—'}</p>
                        </div>
                        <div className="text-left min-w-[80px] hidden md:block">
                          <span className="text-[13px] font-semibold text-text">
                            {log.total_amount != null ? Number(log.total_amount).toLocaleString('en-US') : '—'}
                          </span>
                          {log.total_amount != null && <span className="text-[10px] text-text-muted mr-1">ر.س</span>}
                        </div>
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${s.bg}`}>
                          {s.label}
                        </span>
                        <span className="text-[11px] text-text-muted min-w-[40px] text-left font-mono">{formatTime(log.created_at)}</span>
                        <Eye className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Clock}
          title={allLogs.length === 0 ? 'لا توجد فواتير معالجة بعد' : 'لا توجد نتائج'}
          hint={allLogs.length === 0 ? 'ارفع أول فاتورة للبدء' : 'جرّب تغيير كلمة البحث أو الفلتر'}
        />
      )}

      {/* Detail sheet */}
      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title="تفاصيل العملية"
        subtitle={detail ? `${detail.invoice_date || detail.created_at?.slice(0, 10)} — ${formatTime(detail.created_at)}` : ''}
        footer={detail && (
          <>
            {detail.status === 'error' && (
              <button
                type="button"
                onClick={() => { setDetail(null); window.location.href = '/upload' }}
                className={`${btn.primary} flex-1`}
              >
                <RotateCcw className="w-4 h-4" strokeWidth={2} />
                إعادة المعالجة
              </button>
            )}
            <button
              type="button"
              onClick={() => exportInvoiceDetailPDF(detail)}
              className={`${btn.ghost} flex-1`}
            >
              <Download className="w-4 h-4" strokeWidth={1.8} />
              تحميل النتيجة
            </button>
          </>
        )}
      >
        {detail && (
          <div className="space-y-5">
            {/* Status */}
            {(() => {
              const s = STATUS[detail.status] || STATUS.scanned
              const Icon = s.icon
              return (
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  <p className="text-sm font-bold text-text">{s.label}</p>
                </div>
              )
            })()}

            {/* Fields — ledger rows */}
            <div className="border-t-2 border-text">
              {[
                { label: 'المورد', value: detail.vendor_name || '—' },
                { label: 'رقم الفاتورة', value: detail.invoice_number || '—' },
                { label: 'تاريخ الفاتورة', value: detail.invoice_date || '—' },
                { label: 'المبلغ الإجمالي', value: detail.total_amount != null ? `${Number(detail.total_amount).toLocaleString('en-US')} ر.س` : '—' },
                { label: 'مبلغ الضريبة', value: detail.vat_amount != null ? `${Number(detail.vat_amount).toLocaleString('en-US')} ر.س` : '—' },
                ...(detail.qoyod_bill_id ? [{ label: 'رقم فاتورة قيود', value: detail.qoyod_bill_id }] : []),
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between py-3 border-b border-border-light">
                  <span className="text-[12px] text-text-muted">{f.label}</span>
                  <span className="text-[13px] font-semibold text-text">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
