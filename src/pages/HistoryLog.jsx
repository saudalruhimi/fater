import {
  Search, FileText, CheckCircle2, Clock, XCircle,
  Eye, Download, RotateCcw, Calendar, X, Loader2, ScanLine, ArrowUpFromLine,
} from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { exportHistoryPDF, exportInvoiceDetailPDF } from '../lib/pdf'

const STATUS = {
  scanned: { label: 'ممسوحة', icon: ScanLine, color: 'text-blue-500', bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-400' },
  matched: { label: 'مطابقة', icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary-50 text-primary-dark', dot: 'bg-primary' },
  pushed: { label: 'مرفوعة', icon: ArrowUpFromLine, color: 'text-emerald-500', bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-400' },
  error: { label: 'خطأ', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 text-red-700', dot: 'bg-red-400' },
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

  if (loading) {
    return (
      <div className="max-w-5xl flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl animate-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-text">السجل</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">سجل جميع عمليات معالجة الفواتير</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto relative z-10">
          <button
            type="button"
            onClick={() => exportHistoryPDF(filtered.length ? filtered : allLogs)}
            disabled={!allLogs.length}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-text-secondary text-[13px] font-medium hover:bg-surface-lighter transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
            تصدير
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border-light p-4 mb-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المورد أو رقم الفاتورة أو المبلغ..."
            className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 pr-10 pl-3.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-0.5">
          {TABS.map((t) => {
            const count = tabCount(t.key)
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors ${
                  tab === t.key
                    ? 'bg-primary-50 text-primary-dark'
                    : 'text-text-muted hover:bg-surface-lighter hover:text-text-secondary'
                }`}
              >
                {t.key !== 'all' && STATUS[t.key] && <span className={`w-1.5 h-1.5 rounded-full ${STATUS[t.key].dot}`} />}
                {t.label}
                <span className={`text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                  tab === t.key ? 'bg-primary/10 text-primary' : 'bg-surface-lighter text-text-muted'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Grouped list */}
      {grouped.length > 0 ? (
        <div className="space-y-4">
          {grouped.map(([dateLabel, logs]) => (
            <div key={dateLabel}>
              {/* Date header */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <Calendar className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.6} />
                <span className="text-[12px] font-semibold text-text-secondary">{dateLabel}</span>
                <div className="flex-1 border-b border-border-light/60" />
                <span className="text-[11px] text-text-muted">{logs.length} عملية</span>
              </div>

              {/* Log rows */}
              <div className="bg-white rounded-2xl border border-border-light overflow-hidden">
                {/* Desktop */}
                <div className="hidden sm:block">
                  {logs.map((log, i) => {
                    const s = STATUS[log.status] || STATUS.scanned
                    return (
                      <div
                        key={log.id}
                        onClick={() => setDetail(log)}
                        className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-primary-50/20 transition-colors group ${
                          i !== logs.length - 1 ? 'border-b border-border-light/60' : ''
                        }`}
                      >
                        {/* Status dot */}
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />

                        {/* File icon */}
                        <div className="w-9 h-9 rounded-lg bg-surface-lighter flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-text truncate">{log.vendor_name || 'بدون مورد'}</p>
                          <p className="text-[11px] text-text-muted mt-0.5 truncate">{log.invoice_number || '—'}</p>
                        </div>

                        {/* Amount */}
                        <div className="text-left min-w-[80px] hidden md:block">
                          <span className="text-[13px] font-semibold text-text">
                            {log.total_amount != null ? Number(log.total_amount).toLocaleString('en-US') : '—'}
                          </span>
                          {log.total_amount != null && <span className="text-[10px] text-text-muted mr-1">ر.س</span>}
                        </div>

                        {/* Status badge */}
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${s.bg}`}>
                          {s.label}
                        </span>

                        {/* Time */}
                        <span className="text-[11px] text-text-muted min-w-[40px] text-left">{formatTime(log.created_at)}</span>

                        {/* View icon */}
                        <Eye className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )
                  })}
                </div>

                {/* Mobile */}
                <div className="sm:hidden divide-y divide-border-light/60">
                  {logs.map((log) => {
                    const s = STATUS[log.status] || STATUS.scanned
                    return (
                      <div key={log.id} onClick={() => setDetail(log)} className="p-4 cursor-pointer active:bg-surface-light">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-text truncate">{log.vendor_name || 'بدون مورد'}</p>
                            <p className="text-[11px] text-text-muted mt-0.5 truncate">{log.invoice_number || '—'}</p>
                          </div>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${s.bg}`}>
                            {s.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-text-muted">
                          <span className="font-semibold text-text">
                            {log.total_amount != null ? `${Number(log.total_amount).toLocaleString('en-US')} ر.س` : '—'}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span>{formatTime(log.created_at)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-light py-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-surface-lighter flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-text mb-1">
            {allLogs.length === 0 ? 'لا توجد فواتير معالجة بعد' : 'لا توجد نتائج'}
          </p>
          <p className="text-xs text-text-muted">
            {allLogs.length === 0 ? 'ارفع أول فاتورة للبدء' : 'جرّب تغيير كلمة البحث أو الفلتر'}
          </p>
        </div>
      )}

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-8" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
              <h3 className="text-sm font-semibold text-text">تفاصيل العملية</h3>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-surface-lighter transition-colors">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-3">
                {(() => {
                  const s = STATUS[detail.status] || STATUS.scanned
                  const Icon = s.icon
                  return (
                    <>
                      <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                        <Icon className="w-5 h-5" strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text">{s.label}</p>
                        <p className="text-[11px] text-text-muted">
                          {detail.invoice_date || detail.created_at?.slice(0, 10)} — {formatTime(detail.created_at)}
                        </p>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Fields */}
              <div className="bg-surface-light rounded-xl p-4 space-y-3">
                {[
                  { label: 'المورد', value: detail.vendor_name || '—' },
                  { label: 'رقم الفاتورة', value: detail.invoice_number || '—' },
                  { label: 'تاريخ الفاتورة', value: detail.invoice_date || '—' },
                  { label: 'المبلغ الإجمالي', value: detail.total_amount != null ? `${Number(detail.total_amount).toLocaleString('en-US')} ر.س` : '—' },
                  { label: 'مبلغ الضريبة', value: detail.vat_amount != null ? `${Number(detail.vat_amount).toLocaleString('en-US')} ر.س` : '—' },
                  ...(detail.qoyod_bill_id ? [{ label: 'رقم فاتورة قيود', value: detail.qoyod_bill_id }] : []),
                ].map((f) => (
                  <div key={f.label} className="flex items-center justify-between">
                    <span className="text-[12px] text-text-muted">{f.label}</span>
                    <span className="text-[13px] font-medium text-text">{f.value}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 relative z-10">
                {detail.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => { setDetail(null); window.location.href = '/upload' }}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-[13px] py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" strokeWidth={2} />
                    إعادة المعالجة
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => exportInvoiceDetailPDF(detail)}
                  className="flex-1 flex items-center justify-center gap-2 border border-border text-text-secondary font-medium text-[13px] py-2.5 rounded-xl hover:bg-surface-lighter transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" strokeWidth={1.8} />
                  تحميل النتيجة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
