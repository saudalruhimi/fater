import {
  Upload, FileText, X, Image, Trash2, CheckCircle2, CloudUpload,
  Sparkles, File, Loader2, AlertCircle, Send, ArrowRight, Plus, Pencil, ArrowLeft, Bookmark, Star,
  Camera, Zap, Target, TrendingUp, AlertTriangle, FileImage,
} from 'lucide-react'
import { useState, useCallback, useRef, useEffect } from 'react'
import { scanInvoice, matchItems, pushToQoyod, getInventories, getVendors, getProducts, createMapping, createVendorMapping, getVendorMappings, getNextBillNumber } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'
import SearchableSelect from '../components/SearchableSelect.jsx'
import { useToast, parseError } from '../contexts/ToastContext.jsx'

// Mode Selection: AI vs Manual
function ModeSelect({ onSelect }) {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero header */}
      <div className="text-center mb-8 sm:mb-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight mb-2">
          كيف تبي تدخل الفاتورة؟
        </h2>
        <p className="text-[13px] sm:text-sm text-text-muted">
          اختر الطريقة الأنسب لنوع الفاتورة عندك
        </p>
      </div>

      <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
        {/* AI Card */}
        <button
          onClick={() => onSelect('ai')}
          className="group relative overflow-hidden rounded-3xl bg-surface border border-border-light hover:border-primary/40 p-7 sm:p-8 text-right transition-all hover:shadow-[0_8px_24px_rgba(16,185,129,0.12)]"
        >
          {/* Decorative gradient glow */}
          <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)' }} />
          {/* Dot pattern */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '18px 18px',
            color: 'var(--color-primary)',
          }} />

          <div className="relative">
            {/* Top row: icon + recommended badge */}
            <div className="flex items-start justify-between mb-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-colors">
                <Sparkles className="w-7 h-7 text-primary group-hover:text-white transition-colors" strokeWidth={1.6} />
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10.5px] font-bold text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                موصى به
              </span>
            </div>

            <h3 className="text-xl sm:text-[22px] font-extrabold text-text tracking-tight mb-2">
              عبر الذكاء الاصطناعي
            </h3>
            <p className="text-[13px] text-text-secondary leading-relaxed mb-5">
              ارفع صورة الفاتورة أو ملف PDF — يقرأ الذكاء الاصطناعي البيانات تلقائياً ويستخرج المورد والبنود والمبالغ خلال ثوانٍ.
            </p>

            {/* Feature checklist */}
            <ul className="space-y-2 mb-6">
              {[
                'استخراج تلقائي للبيانات بدقة 99%',
                'دعم رفع متعدد للفواتير دفعة واحدة',
                'مطابقة ذكية للموردين والبنود',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[12.5px] text-text-secondary">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" strokeWidth={2.2} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* CTA row */}
            <div className="flex items-center justify-between pt-4 border-t border-border-light">
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <span>للفواتير الإلكترونية</span>
                <span className="text-text-muted/40">·</span>
                <span>الأسرع</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-primary group-hover:gap-2.5 transition-all">
                ابدأ
                <ArrowLeft className="w-4 h-4" strokeWidth={2.4} />
              </span>
            </div>
          </div>
        </button>

        {/* Manual Card */}
        <button
          onClick={() => onSelect('manual')}
          className="group relative overflow-hidden rounded-3xl bg-surface border border-border-light hover:border-blue-400/40 p-7 sm:p-8 text-right transition-all hover:shadow-[0_8px_24px_rgba(59,130,246,0.12)]"
        >
          <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.16), transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '18px 18px',
            color: '#3B82F6',
          }} />

          <div className="relative">
            <div className="flex items-start justify-between mb-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500 group-hover:border-blue-500 transition-colors">
                <Pencil className="w-6 h-6 text-blue-500 group-hover:text-white transition-colors" strokeWidth={1.6} />
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10.5px] font-bold text-blue-500">
                دقة 100%
              </span>
            </div>

            <h3 className="text-xl sm:text-[22px] font-extrabold text-text tracking-tight mb-2">
              إدخال يدوي
            </h3>
            <p className="text-[13px] text-text-secondary leading-relaxed mb-5">
              أدخل بيانات الفاتورة بنفسك — اختر المورد والبنود واكتب الكميات والأسعار، ثم أرسلها لقيود مباشرة.
            </p>

            <ul className="space-y-2 mb-6">
              {[
                'تحكم كامل بكل الحقول والأرقام',
                'قوالب سريعة للفواتير المتكررة',
                'ترقيم تلقائي لرقم الفاتورة',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[12.5px] text-text-secondary">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" strokeWidth={2.2} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between pt-4 border-t border-border-light">
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <span>للفواتير الورقية</span>
                <span className="text-text-muted/40">·</span>
                <span>دقة كاملة</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-blue-500 group-hover:gap-2.5 transition-all">
                ابدأ
                <ArrowLeft className="w-4 h-4" strokeWidth={2.4} />
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Compact stat card used in the AI upload hero section (number on top, label below, centered)
function StatCard({ value, label }) {
  return (
    <div className="bg-surface-light border border-border rounded-xl px-4 py-3.5 text-center min-w-[88px]">
      <div className="text-xl sm:text-[22px] font-extrabold text-text leading-none tracking-tight mb-1 font-mono" dir="ltr">{value}</div>
      <div className="text-[10.5px] sm:text-[11px] text-text-muted font-medium">{label}</div>
    </div>
  )
}

// Status summary pill — shown at the top of the file queue
function StatusPill({ icon: Icon, label, count, color, spin }) {
  if (count === 0) return null
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-surface text-[12px] font-semibold"
      style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)`, color }}
    >
      <Icon className={`w-3.5 h-3.5 ${spin ? 'animate-spin' : ''}`} strokeWidth={2} />
      {label}
      <span
        className="font-mono font-bold text-[11px] px-1.5 rounded"
        style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }}
      >
        {count}
      </span>
    </div>
  )
}

// Single file card in the queue grid — shows preview, status, and per-status actions
function FileCard({ file, onRemove, onPreview, onShowError, onRetry, disableRetry }) {
  const f = file
  const isProcessing = f.status === 'processing'
  const isDone = f.status === 'done'
  const isFailed = f.status === 'failed'
  const isQueued = f.status === 'queued'

  const accent =
    isDone ? 'border-primary/40 bg-primary-50/30'
    : isFailed ? 'border-red-300 bg-red-50/30'
    : isProcessing ? 'border-blue-300 bg-blue-50/20'
    : 'border-border-light bg-white'

  const statusLabel =
    isDone ? 'تم'
    : isFailed ? 'فشلت'
    : isProcessing ? 'جارٍ القراءة...'
    : 'في الانتظار'

  const statusColor =
    isDone ? '#10B981'
    : isFailed ? '#EF4444'
    : isProcessing ? '#3B82F6'
    : 'var(--color-text-muted)'

  return (
    <div className={`group rounded-2xl border ${accent} overflow-hidden transition-colors flex flex-col`}>
      {/* Thumbnail / icon area */}
      <div
        className="relative aspect-[4/3] bg-surface-lighter flex items-center justify-center cursor-pointer overflow-hidden"
        onClick={onPreview}
      >
        {f.isImage && f.url ? (
          <img src={f.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-red-400">
            <File className="w-10 h-10" strokeWidth={1.5} />
            <span className="text-[10px] font-bold tracking-wider">PDF</span>
          </div>
        )}

        {/* Top corner: status badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg/90 backdrop-blur-sm text-[10px] font-bold shadow-sm" style={{ color: statusColor }}>
          {isDone && <CheckCircle2 className="w-3 h-3" strokeWidth={2.4} />}
          {isFailed && <AlertCircle className="w-3 h-3" strokeWidth={2.4} />}
          {isProcessing && <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.4} />}
          {statusLabel}
        </div>

        {/* Top-left: remove button (hidden when processing) */}
        {!isProcessing && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="absolute top-2 left-2 w-6 h-6 rounded-full bg-bg/90 backdrop-blur-sm text-text-muted hover:text-red-500 hover:bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            title="حذف"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.4} />
          </button>
        )}

        {/* Processing overlay shimmer */}
        {isProcessing && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-200/60 overflow-hidden">
            <div
              className="h-full w-1/3 bg-blue-500"
              style={{
                animation: 'fc-slide 1.4s ease-in-out infinite',
              }}
            />
          </div>
        )}
      </div>

      {/* Footer with name + actions */}
      <div className="p-3 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-text truncate" title={f.file.name}>{f.file.name}</p>
          <p className="text-[10.5px] text-text-muted">{formatSize(f.file.size)}</p>
        </div>

        {isFailed && (
          <>
            <button
              onClick={onShowError}
              className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 transition-colors"
              title="عرض سبب الفشل"
            >
              <AlertCircle className="w-4 h-4" strokeWidth={2.2} />
            </button>
            <button
              onClick={onRetry}
              disabled={disableRetry}
              className="w-7 h-7 rounded-full bg-primary-50 hover:bg-primary-100 text-primary-dark flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
              title="إعادة المحاولة"
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.2} />
            </button>
          </>
        )}

        {isQueued && (
          <span className="text-[10.5px] text-text-muted px-2 py-0.5 rounded-full bg-surface-lighter font-medium">
            في الانتظار
          </span>
        )}
      </div>

      {/* Inline keyframe for shimmer */}
      <style>{`@keyframes fc-slide { 0% { transform: translateX(-100%); } 50% { transform: translateX(150%); } 100% { transform: translateX(450%); } }`}</style>
    </div>
  )
}

// Step 1: Upload
function UploadStep({ onScanned }) {
  // Each file: { id, file, url, isImage, isPdf, status, result, error }
  // status: 'queued' | 'processing' | 'done' | 'failed'
  const [files, setFiles] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState(null)
  const [errorDetail, setErrorDetail] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [monthCount, setMonthCount] = useState(null)
  const inputRef = useRef(null)
  const cameraRef = useRef(null)
  const toast = useToast()

  // Fetch the count of invoices scanned this month for the stats card
  useEffect(() => {
    const start = new Date()
    start.setDate(1); start.setHours(0, 0, 0, 0)
    supabase
      .from('processed_invoices')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', start.toISOString())
      .then(({ count }) => { if (typeof count === 'number') setMonthCount(count) })
  }, [])

  const updateFile = useCallback((id, patch) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }, [])

  const processFile = useCallback(async (f) => {
    setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'processing', error: null } : x))
    try {
      const result = await scanInvoice(f.file, {
        onRetry: ({ attempt, totalAttempts, delay }) => {
          toast.warning(
            `الذكاء الاصطناعي مشغول — محاولة ${attempt}/${totalAttempts} بعد ${(delay / 1000).toFixed(0)}ث`,
            { title: f.file.name, duration: delay + 500 }
          )
        }
      })
      setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'done', result: result.data } : x))
    } catch (e) {
      const p = parseError(e)
      setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'failed', error: p.message } : x))
    }
  }, [toast])

  const addFiles = useCallback((newFiles) => {
    const mapped = Array.from(newFiles)
      .filter((f) => f.size <= 10 * 1024 * 1024)
      .map((f) => ({
        file: f,
        id: crypto.randomUUID(),
        url: URL.createObjectURL(f),
        isImage: f.type.startsWith('image/'),
        isPdf: f.type === 'application/pdf',
        status: 'queued',
        result: null,
        error: null,
      }))
    setFiles((prev) => [...prev, ...mapped])
  }, [])

  const removeFile = useCallback((id) => {
    setFiles((prev) => {
      const t = prev.find((f) => f.id === id)
      if (t?.url) URL.revokeObjectURL(t.url)
      return prev.filter((f) => f.id !== id)
    })
    if (preview?.id === id) setPreview(null)
  }, [preview])

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }, [addFiles])

  // Process queued/failed files in sequence — failures don't block the rest.
  // After processing, summarize via toasts using the up-to-date snapshot.
  const startScan = async () => {
    const toProcess = files.filter(f => f.status === 'queued' || f.status === 'failed')
    if (!toProcess.length) return
    setScanning(true)
    for (const f of toProcess) {
      await processFile(f)
    }
    setScanning(false)
    setFiles(prev => {
      const succeeded = prev.filter(f => f.status === 'done').length
      const failed = prev.filter(f => f.status === 'failed').length
      if (succeeded > 0) toast.success(`اكتملت قراءة ${succeeded} فاتورة`, { title: 'نجاح' })
      if (failed > 0) toast.warning(`${failed} فاتورة فشلت — راجع التفاصيل وأعد المحاولة`, { title: 'تنبيه' })
      return prev
    })
  }

  // Pass only successfully scanned files to the next step
  const proceedToMatch = () => {
    const successful = files.filter(f => f.status === 'done' && f.result)
    if (!successful.length) return
    const results = successful.map(f => ({ ...f.result, _previewUrl: f.url || null, _isPdf: f.isPdf || false }))
    onScanned(results)
  }

  const hasFiles = files.length > 0
  const counts = {
    total: files.length,
    done: files.filter(f => f.status === 'done').length,
    processing: files.filter(f => f.status === 'processing').length,
    failed: files.filter(f => f.status === 'failed').length,
    queued: files.filter(f => f.status === 'queued').length,
  }
  const hasFailed = counts.failed > 0
  const hasDone = counts.done > 0
  const hasUnprocessed = counts.queued > 0 || counts.failed > 0
  const allDone = hasFiles && counts.done === counts.total

  return (
    <>
      {/* Hero strip — gradient background with dot pattern */}
      {!hasFiles && (
        <div
          className="relative overflow-hidden rounded-2xl mb-5 px-5 sm:px-8 py-7 sm:py-8 border border-border-light"
          style={{ background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-light) 100%)' }}
        >
          {/* Dot pattern */}
          <div className="absolute inset-0 opacity-50 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.10) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />
          {/* Glow */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 80% 50%, rgba(16,185,129,0.12), transparent 60%)',
          }} />

          <div className="relative flex items-center justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11.5px] font-bold text-primary mb-3.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                مدعوم بالذكاء الاصطناعي
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-text leading-[1.15] tracking-tight mb-2.5">
                ارفع فواتيرك للـ <span className="text-primary">AI</span>
              </h2>
              <p className="text-[14px] sm:text-[15px] text-text-secondary leading-relaxed max-w-lg">
                استخرج البيانات تلقائياً من PDF، JPG، أو PNG في ثوانٍ. دقة 99% بدون إدخال يدوي.
              </p>
            </div>

            {/* Stats — small horizontal cards */}
            <div className="flex gap-2.5">
              <StatCard value={monthCount != null ? monthCount.toLocaleString('en-US') : '—'} label="هذا الشهر" />
              <StatCard value="99%" label="دقة" />
              <StatCard value="1.2s" label="متوسط" />
            </div>
          </div>
        </div>
      )}

      {/* Warning banner — inline with right border accent */}
      {!hasFiles && (
        <div
          className="mb-5 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
          style={{
            background: 'rgba(245,158,11,0.10)',
            borderRight: '3px solid #F59E0B',
          }}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" strokeWidth={2} />
          <span className="text-[12.5px] font-bold text-text">تنبيه:</span>
          <span className="flex-1 text-[12.5px] text-text-secondary">تأكد من اسم المنشأة قبل الإرسال</span>
          <button
            onClick={(e) => e.preventDefault()}
            className="text-[11.5px] font-bold text-amber-500 hover:text-amber-400 px-2 py-1 rounded-md transition-colors whitespace-nowrap"
          >
            عرض التفاصيل ←
          </button>
        </div>
      )}

      {/* Stepper pills with chevron separators */}
      {!hasFiles && (
        <div className="flex items-center gap-2 mb-5 flex-wrap justify-end">
          {[
            { n: 1, label: 'رفع', active: true },
            { n: 2, label: 'مطابقة', active: false },
            { n: 3, label: 'إرسال', active: false },
          ].map((s, i, arr) => (
            <div key={s.n} className="flex items-center gap-2">
              {i > 0 && <span className="text-text-muted">›</span>}
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[12.5px] font-semibold ${
                  s.active
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'bg-surface border-border-light text-text-secondary'
                }`}
              >
                <span
                  className={`w-[18px] h-[18px] rounded-full inline-flex items-center justify-center text-[10px] font-bold ${
                    s.active ? 'bg-primary text-white' : 'bg-surface-lighter text-text-muted'
                  }`}
                >
                  {s.n}
                </span>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file inputs (used by both views) */}
      <input ref={inputRef} type="file" multiple accept="image/*,.pdf"
        onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} className="hidden" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} className="hidden" />

      {/* Initial big drop zone — only when no files */}
      {!hasFiles && (
        <div className="relative rounded-2xl bg-surface border border-border p-5 sm:p-6 overflow-hidden">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative rounded-xl text-center px-6 py-14 sm:py-16 transition-all border-2 border-dashed ${
              dragActive ? 'border-primary bg-primary-50/50' : 'border-border'
            }`}
            style={!dragActive ? { background: 'radial-gradient(ellipse at center top, rgba(16,185,129,0.10), transparent 65%)' } : undefined}
          >
            {/* Stack of 3 rotated file cards */}
            <div className="relative mx-auto mb-5" style={{ width: 96, height: 80 }}>
              {[
                { rot: -12, top: 4, left: 0, opacity: 0.5, color: 'var(--color-text-muted)' },
                { rot: 6, top: 0, left: 18, opacity: 0.85, color: '#F59E0B' },
                { rot: -3, top: 8, left: 36, opacity: 1, color: 'var(--color-primary)' },
              ].map((c, i) => (
                <div
                  key={i}
                  className="absolute rounded-[9px] bg-surface-light flex items-center justify-center"
                  style={{
                    top: c.top, left: c.left,
                    width: 54, height: 70,
                    border: `1.5px solid ${c.color}`,
                    transform: `rotate(${c.rot}deg)`,
                    opacity: c.opacity,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                  }}
                >
                  <FileText className="w-5 h-5" style={{ color: c.color }} strokeWidth={2} />
                </div>
              ))}
            </div>

            <h3 className="text-xl sm:text-[22px] font-extrabold text-text leading-tight mb-1.5 tracking-tight">
              {dragActive ? 'أفلت الملفات هنا' : 'اسحب أو اضغط لرفع الفواتير'}
            </h3>
            <p className="text-[13px] text-text-muted mb-5">
              رفع متعدد · حد أقصى 10MB · PDF / JPG / PNG
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
              <button
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-[13.5px] font-bold transition-colors"
                style={{ boxShadow: '0 6px 16px rgba(16,185,129,0.30)' }}
              >
                <Upload className="w-4 h-4" strokeWidth={2.4} />
                رفع من الجهاز
              </button>
              <button
                onClick={() => cameraRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-light border border-border text-text text-[13.5px] font-semibold hover:border-primary/40 transition-colors"
              >
                <Camera className="w-4 h-4" strokeWidth={1.8} />
                من الكاميرا
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center mt-4 pt-4 border-t border-border-light text-[12px]">
            <span className="text-text-muted">💡 نصيحة: للحصول على أفضل دقة، تأكد من وضوح الصورة</span>
          </div>
        </div>
      )}

      {/* Queue / processing view — when files exist */}
      {hasFiles && (
        <div>
          {/* Header bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-text">قائمة الفواتير</h2>
              <p className="text-[12px] text-text-muted mt-0.5">
                {counts.total} فاتورة بالقائمة · {formatSize(files.reduce((s, f) => s + f.file.size, 0))}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-border-light text-text-secondary text-[12.5px] font-semibold hover:border-primary/40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
                إضافة
              </button>
              <button
                onClick={() => { files.forEach(f => f.url && URL.revokeObjectURL(f.url)); setFiles([]) }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50/40 text-[12.5px] font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                مسح الكل
              </button>
            </div>
          </div>

          {/* Status pills + overall progress */}
          <div className="flex items-center flex-wrap gap-2 mb-5">
            <StatusPill icon={CheckCircle2} label="تم" count={counts.done} color="#10B981" />
            <StatusPill icon={Loader2} label="جاري" count={counts.processing} color="#3B82F6" spin />
            <StatusPill icon={AlertCircle} label="فشلت" count={counts.failed} color="#EF4444" />
            <StatusPill icon={File} label="في الانتظار" count={counts.queued} color="var(--color-text-muted)" />
            {scanning && (
              <div className="flex-1 min-w-[140px] flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-surface-lighter rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${counts.total ? Math.round((counts.done / counts.total) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-text-muted whitespace-nowrap" dir="ltr">
                  {counts.done} / {counts.total}
                </span>
              </div>
            )}
          </div>

          {/* Grid of file cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
            {files.map((f) => (
              <FileCard
                key={f.id}
                file={f}
                onRemove={() => removeFile(f.id)}
                onPreview={() => f.isImage && setPreview(f)}
                onShowError={() => setErrorDetail(f)}
                onRetry={() => processFile(f)}
                disableRetry={scanning}
              />
            ))}
          </div>

          {/* Sticky bottom action bar */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-bg/95 backdrop-blur-sm border-t border-border-light">
            <div className="flex items-center flex-wrap justify-end gap-2">
              {hasUnprocessed && (
                <button
                  onClick={startScan}
                  disabled={scanning}
                  className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold text-[13px] py-2.5 px-5 rounded-xl transition-colors disabled:opacity-70"
                >
                  {scanning
                    ? <><Loader2 className="w-4 h-4 animate-spin" />جارِ القراءة...</>
                    : <><Sparkles className="w-4 h-4" />{hasFailed && !counts.queued ? `إعادة محاولة الفاشلة (${counts.failed})` : `ابدأ القراءة (${counts.queued + counts.failed})`}</>}
                </button>
              )}
              {hasDone && !scanning && (
                <button
                  onClick={proceedToMatch}
                  className="inline-flex items-center justify-center gap-2 bg-primary-dark hover:bg-primary text-white font-bold text-[13px] py-2.5 px-5 rounded-xl transition-colors"
                >
                  متابعة بالناجحة ({counts.done})
                  <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-light">
              <p className="text-sm font-medium text-text truncate">{preview.file.name}</p>
              <button onClick={() => setPreview(null)} className="p-1.5 rounded-lg hover:bg-surface-lighter"><X className="w-4 h-4 text-text-muted" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-surface-light flex items-center justify-center">
              <img src={preview.url} alt="" className="max-w-full max-h-[75vh] object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {errorDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setErrorDetail(null)}>
          <div className="bg-white rounded-2xl overflow-hidden max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border-light flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4.5 h-4.5 text-red-500" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text">فشلت قراءة الفاتورة</p>
                <p className="text-[11px] text-text-muted truncate">{errorDetail.file.name}</p>
              </div>
              <button onClick={() => setErrorDetail(null)} className="p-1.5 rounded-lg hover:bg-surface-lighter">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-[13px] text-text-secondary leading-loose mb-4">
                {errorDetail.error || 'حدث خطأ غير معروف أثناء معالجة هذه الفاتورة.'}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setErrorDetail(null)}
                  className="px-4 py-2 rounded-lg text-text-secondary text-[13px] font-medium hover:bg-surface-lighter transition-colors"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => { const f = errorDetail; setErrorDetail(null); processFile(f) }}
                  disabled={scanning}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-[13px] font-bold transition-colors disabled:opacity-60"
                >
                  <Sparkles className="w-3.5 h-3.5" strokeWidth={2.2} />
                  إعادة المحاولة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Templates storage helpers (localStorage)
const TEMPLATES_KEY = 'manual_invoice_templates'
function loadTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function saveTemplates(list) {
  try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

// Manual invoice number counter (local fallback if Qoyod is unreachable)
const COUNTER_KEY = 'manual_invoice_counter'
const COUNTER_START = 268
function getNextInvoiceNumber() {
  try {
    const raw = localStorage.getItem(COUNTER_KEY)
    const n = raw ? Number(raw) : COUNTER_START
    return `BILL${n}`
  } catch { return `BILL${COUNTER_START}` }
}
function setLocalCounter(n) {
  try { localStorage.setItem(COUNTER_KEY, String(n)) } catch { /* ignore */ }
}
function bumpInvoiceCounter() {
  try {
    const raw = localStorage.getItem(COUNTER_KEY)
    const n = raw ? Number(raw) : COUNTER_START
    localStorage.setItem(COUNTER_KEY, String(n + 1))
  } catch { /* ignore */ }
}

// Step 2: Review & Match (also used for Manual mode)
function MatchStep({ data, products, vendors, vendorMappings = [], onPush, onBack, isManual = false, onDraftChange, navigation, onMarkReady, onSendAll, status, sendingAll }) {
  const [items, setItems] = useState(() => (data.items || []).map(it => ({
    ...it,
    discount: Number(it.discount) || 0,
    discount_type: it.discount_type || 'amount',
    line_subtotal_incl_vat: Number(it.line_subtotal_incl_vat) || 0,
  })))
  const [vendorId, setVendorId] = useState(() => {
    // Prefer an already-saved vendor_id (when navigating back to a draft)
    if (data.vendor_id) return data.vendor_id
    if (!data.vendor_name || !vendors.length) return null
    const activeVendors = vendors.filter(v => (v.status || 'Active') === 'Active')

    // 1. Check vendor mappings dictionary first (exact match)
    const normalize = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
    const targetName = normalize(data.vendor_name)
    const mapped = vendorMappings.find(m => normalize(m.invoice_vendor_name) === targetName)
    if (mapped) {
      const v = activeVendors.find(v => v.id === mapped.qoyod_vendor_id)
      if (v) return v.id
    }

    // 2. Word-overlap fuzzy match
    const words = data.vendor_name.split(/\s+/).filter(w => w.length > 2)
    let bestMatch = null
    let bestScore = 0
    for (const v of activeVendors) {
      const target = (v.name + ' ' + (v.organization || '')).toLowerCase()
      let score = 0
      for (const word of words) {
        if (target.includes(word.toLowerCase())) score++
      }
      if (score > bestScore) {
        bestScore = score
        bestMatch = v
      }
    }
    return bestScore >= 1 ? bestMatch.id : null
  })
  const [invoiceNum, setInvoiceNum] = useState(data.invoice_number || '')
  const [invoiceDate, setInvoiceDate] = useState(data.invoice_date || '')
  const [dueDate, setDueDate] = useState(data.due_date || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [templates, setTemplates] = useState(() => isManual ? loadTemplates() : [])
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const toast = useToast()

  const applyTemplate = (tpl) => {
    // Set vendor if matches
    const v = vendors.find(v => v.id === tpl.vendor_id) || vendors.find(v => v.name === tpl.vendor_name)
    if (v) setVendorId(v.id)
    // Add items
    const newItems = tpl.items.map(it => {
      const p = products.find(p => p.id === it.matched_product_id) || products.find(p => p.name === it.matched_product_name)
      return {
        description: it.description || p?.name || '',
        quantity: it.quantity,
        unit_price: it.unit_price,
        matched_product_id: p?.id || null,
        matched_product_name: p?.name || null,
        match_type: p ? 'manual' : 'unmatched',
      }
    })
    setItems(prev => [...prev, ...newItems])
  }

  const saveAsTemplate = () => {
    if (!templateName.trim()) return
    const v = vendors.find(v => v.id === vendorId)
    const tpl = {
      id: crypto.randomUUID(),
      name: templateName.trim(),
      vendor_id: vendorId,
      vendor_name: v?.name || '',
      items: items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        matched_product_id: i.matched_product_id,
        matched_product_name: i.matched_product_name,
      })),
    }
    const next = [...templates, tpl]
    setTemplates(next)
    saveTemplates(next)
    setTemplateName('')
    setShowSaveTemplate(false)
  }

  const deleteTemplate = (id) => {
    const next = templates.filter(t => t.id !== id)
    setTemplates(next)
    saveTemplates(next)
  }

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const addItem = () => {
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, discount: 0, discount_type: 'amount', line_subtotal_incl_vat: 0, matched_product_id: null, matched_product_name: null, match_type: 'unmatched' }])
  }

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const calcLineTotal = (item) => {
    const qty = Number(item.quantity) || 0
    const unit = Number(item.unit_price) || 0
    const disc = Number(item.discount) || 0
    const type = item.discount_type || 'amount'
    const gross = qty * unit
    return type === 'percent' ? gross * (1 - disc / 100) : gross - disc
  }

  // Excl-VAT line total derived from the printed "Item Subtotal (Including VAT)"
  const printedLineExcl = (item, vatRate = 15) => {
    const incl = Number(item.line_subtotal_incl_vat) || 0
    if (!incl) return null
    return incl / (1 + vatRate / 100)
  }

  // Adjust unit_price so the calculated line total exactly matches the printed value
  const completeHalalas = (idx) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const target = printedLineExcl(item, data.vat_rate || 15)
      if (target == null) return item
      const qty = Number(item.quantity) || 0
      const disc = Number(item.discount) || 0
      const type = item.discount_type || 'amount'
      if (qty <= 0) return item
      let newUnit
      if (type === 'percent') {
        const denom = qty * (1 - disc / 100)
        if (denom <= 0) return item
        newUnit = target / denom
      } else {
        newUnit = (target + disc) / qty
      }
      return { ...item, unit_price: Math.round(newUnit * 10000) / 10000 }
    }))
  }

  // Sync the current draft up to the parent so navigation preserves edits
  useEffect(() => {
    if (!onDraftChange) return
    onDraftChange({ vendorId, invoiceNum, invoiceDate, dueDate, items })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, invoiceNum, invoiceDate, dueDate, items])

  const selectedVendor = vendors.find(v => v.id === vendorId)

  const handlePush = async () => {
    if (!vendorId) {
      toast.warning('اختر المورد من القائمة', { title: 'بيانات ناقصة' })
      return
    }
    const unmatched = items.filter(i => !i.matched_product_id)
    if (unmatched.length) {
      toast.warning(`${unmatched.length} بنود بدون مطابقة — اختر البند المقابل من القائمة`, { title: 'بنود غير مكتملة' })
      return
    }
    setSaving(true)
    setError(null)
    try {
      console.log('Pushing with vendor:', vendorId, selectedVendor?.name)
      await onPush({
        vendorId,
        vendor: selectedVendor?.name || '',
        invoiceNum, invoiceDate, dueDate, items,
        isInclusive: data.is_inclusive ?? false,
        // Pass original invoice vendor name so parent can save vendor mapping
        originalVendorName: data.vendor_name || '',
      })
    } catch (e) {
      const p = parseError(e)
      toast.error(p.message, { title: p.title || 'فشل الإرسال' })
    } finally {
      setSaving(false)
    }
  }

  const matchColor = (type) => {
    if (type === 'exact') return 'bg-primary-50 text-primary-dark'
    if (type === 'fuzzy_mapping' || type === 'fuzzy_product') return 'bg-blue-50 text-blue-700'
    if (type === 'ai') return 'bg-amber-50 text-amber-700'
    return 'bg-red-50 text-red-600'
  }

  const matchLabel = (type) => {
    if (type === 'exact') return 'تطابق تام'
    if (type === 'fuzzy_mapping') return 'تطابق تقريبي'
    if (type === 'fuzzy_product') return 'تطابق تقريبي'
    if (type === 'ai') return 'اقتراح ذكي'
    return 'بدون تطابق'
  }

  return (
    <div className="space-y-5">
      {/* Quick Templates (Manual mode only) */}
      {isManual && (
        <div className="bg-white rounded-2xl border border-border-light p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-primary" strokeWidth={1.8} />
              <h3 className="text-sm font-semibold text-text">القوالب السريعة</h3>
              <span className="text-[11px] text-text-muted">({templates.length})</span>
            </div>
            <button onClick={() => setShowSaveTemplate(!showSaveTemplate)}
              disabled={!vendorId || items.length === 0}
              className="flex items-center gap-1.5 text-[12px] font-medium text-primary hover:bg-primary-50 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.2} /> حفظ كقالب
            </button>
          </div>

          {showSaveTemplate && (
            <div className="flex items-center gap-2 mb-3 p-2.5 bg-surface-light rounded-xl">
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="اسم القالب (مثال: فاتورة أسمنت شهرية)"
                className="flex-1 bg-white border border-border-light rounded-lg py-1.5 px-3 text-[13px] focus:outline-none focus:border-primary/40"
                autoFocus
              />
              <button onClick={saveAsTemplate} disabled={!templateName.trim()}
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-[12px] font-medium transition-colors disabled:opacity-40">
                حفظ
              </button>
              <button onClick={() => { setShowSaveTemplate(false); setTemplateName('') }}
                className="p-1.5 rounded-lg text-text-muted hover:bg-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {templates.length === 0 ? (
            <div className="py-6 text-center">
              <Star className="w-6 h-6 text-text-muted/30 mx-auto mb-2" strokeWidth={1.4} />
              <p className="text-[12px] text-text-muted">لا توجد قوالب محفوظة بعد</p>
              <p className="text-[11px] text-text-muted/70 mt-1">أدخل فاتورة وضع المورد والبنود ثم اضغط "حفظ كقالب"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {templates.map(tpl => (
                <div key={tpl.id} className="group relative bg-surface-light hover:bg-primary-50 border border-border-light hover:border-primary/30 rounded-xl p-3 transition-all">
                  <button onClick={() => applyTemplate(tpl)} className="text-right w-full">
                    <p className="text-[12px] font-semibold text-text truncate pl-6">{tpl.name}</p>
                    <p className="text-[11px] text-text-muted truncate mt-0.5">{tpl.vendor_name || '—'}</p>
                    <p className="text-[10px] text-text-muted/80 mt-0.5">{tpl.items.length} بند</p>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteTemplate(tpl.id) }}
                    className="absolute top-2 left-2 p-1 rounded text-text-muted/40 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invoice preview + Header info */}
      <div className={`grid gap-4 ${data._previewUrl ? 'grid-cols-1 lg:grid-cols-[200px_1fr]' : 'grid-cols-1'}`}>
        {/* Image preview thumbnail */}
        {data._previewUrl && (
          <>
            <div className="bg-white rounded-2xl border border-border-light p-2 flex flex-col items-center cursor-pointer hover:border-primary/30 transition-all card-hover"
              onClick={() => setShowPreview(true)}>
              {data._isPdf ? (
                <div className="w-full h-[240px] rounded-xl overflow-hidden">
                  <iframe src={data._previewUrl} className="w-full h-full border-0 rounded-xl pointer-events-none" title="معاينة الفاتورة" />
                </div>
              ) : (
                <img src={data._previewUrl} alt="الفاتورة" className="w-full rounded-xl object-contain max-h-[240px]" />
              )}
              <p className="text-[10px] text-text-muted mt-2 flex items-center gap-1">
                <Image className="w-3 h-3" /> اضغط للتكبير
              </p>
            </div>

            {/* Full preview modal */}
            {showPreview && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-overlay"
                onClick={() => setShowPreview(false)}>
                <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl modal-content" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowPreview(false)}
                    className="absolute -top-3 -left-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-text-muted hover:text-red-500 transition-colors z-10">
                    <X className="w-4 h-4" />
                  </button>
                  {data._isPdf ? (
                    <iframe src={data._previewUrl} className="w-full h-[85vh] border-0 rounded-xl" title="معاينة الفاتورة" />
                  ) : (
                    <img src={data._previewUrl} alt="الفاتورة" className="max-h-[85vh] rounded-xl object-contain" />
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-text-muted mb-1">المورد</label>
          <SearchableSelect
            options={vendors.filter(v => (v.status || 'Active') === 'Active').map(v => ({ id: v.id, label: v.name }))}
            value={vendorId}
            onChange={setVendorId}
            placeholder="-- اختر المورد --"
            error={!vendorId}
          />
          {data.vendor_name && (
            <p className="text-[10px] text-text-muted mt-1">بالفاتورة: {data.vendor_name}</p>
          )}
        </div>
        <div>
          <label className="block text-[12px] font-medium text-text-muted mb-1">رقم الفاتورة</label>
          <input value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)}
            className="w-full bg-white border border-border-light rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-primary/50" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-text-muted mb-1">تاريخ الفاتورة</label>
          <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
            className="w-full bg-white border border-border-light rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-primary/50" dir="ltr" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-text-muted mb-1">تاريخ الاستحقاق</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full bg-white border border-border-light rounded-xl py-2 px-3 text-sm text-text focus:outline-none focus:border-primary/50" dir="ltr" />
        </div>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-2xl border border-border-light overflow-hidden">
        <div className="px-5 py-3 border-b border-border-light flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">البنود ({items.length})</h3>
          {isManual && (
            <button onClick={addItem}
              className="flex items-center gap-1.5 text-[12px] font-medium text-primary hover:bg-primary-50 px-2.5 py-1 rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.2} /> إضافة بند
            </button>
          )}
        </div>

        <div className="divide-y divide-border-light/60">
          {items.length === 0 && isManual && (
            <div className="py-12 flex flex-col items-center text-center">
              <FileText className="w-8 h-8 text-text-muted/30 mb-2" />
              <p className="text-sm text-text-muted">لا توجد بنود — أضف بنداً للبدء</p>
              <button onClick={addItem}
                className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-primary hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" strokeWidth={2.2} /> إضافة بند
              </button>
            </div>
          )}
          {items.map((item, idx) => (
            <div key={idx} className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Original description */}
                {!isManual && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-text-muted mb-0.5">البند بالفاتورة</p>
                      <p className="text-[13px] font-medium text-text">{item.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-muted hidden sm:block flex-shrink-0" />
                  </>
                )}

                {/* Matched product */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-text-muted mb-0.5">البند في قيود</p>
                  <SearchableSelect
                    options={products.map(p => ({ id: p.id, label: p.name }))}
                    value={item.matched_product_id}
                    onChange={(id) => {
                      const p = products.find(p => p.id === id)
                      updateItem(idx, 'matched_product_id', p?.id || null)
                      updateItem(idx, 'matched_product_name', p?.name || null)
                      if (isManual && p?.name && !item.description) {
                        updateItem(idx, 'description', p.name)
                      }
                      updateItem(idx, 'match_type', p ? 'manual' : 'unmatched')
                    }}
                    placeholder="-- اختر البند --"
                    error={!item.matched_product_id}
                  />
                </div>

                {/* Status badge or delete */}
                {isManual ? (
                  <button onClick={() => removeItem(idx)}
                    className="self-start sm:self-center p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap self-start sm:self-center ${matchColor(item.match_type)}`}>
                    {matchLabel(item.match_type)}
                  </span>
                )}
              </div>

              {/* Qty, price, discount, total */}
              <div className="flex flex-wrap items-center gap-3 text-[13px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted text-[11px]">كمية:</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={item.quantity ?? ''}
                    onChange={e => {
                      const v = e.target.value.replace(',', '.')
                      if (v === '' || /^\d*\.?\d*$/.test(v)) {
                        updateItem(idx, 'quantity', v === '' || v === '.' ? '' : v)
                      }
                    }}
                    onBlur={e => {
                      const n = parseFloat(e.target.value)
                      updateItem(idx, 'quantity', isNaN(n) ? 0 : n)
                    }}
                    className="w-20 bg-surface-light border border-border-light rounded-lg py-1 px-2 text-center text-text focus:outline-none" dir="ltr" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted text-[11px]">سعر:</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={item.unit_price ?? ''}
                    onChange={e => {
                      const v = e.target.value.replace(',', '.')
                      if (v === '' || /^\d*\.?\d*$/.test(v)) {
                        updateItem(idx, 'unit_price', v === '' || v === '.' ? '' : v)
                      }
                    }}
                    onBlur={e => {
                      const n = parseFloat(e.target.value)
                      updateItem(idx, 'unit_price', isNaN(n) ? 0 : n)
                    }}
                    className="w-24 bg-surface-light border border-border-light rounded-lg py-1 px-2 text-center text-text focus:outline-none" dir="ltr" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted text-[11px]">خصم:</span>
                  <div className="flex items-center bg-surface-light border border-border-light rounded-lg overflow-hidden">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.discount ?? ''}
                      onChange={e => {
                        const v = e.target.value.replace(',', '.')
                        if (v === '' || /^\d*\.?\d*$/.test(v)) {
                          updateItem(idx, 'discount', v === '' || v === '.' ? '' : v)
                        }
                      }}
                      onBlur={e => {
                        const n = parseFloat(e.target.value)
                        updateItem(idx, 'discount', isNaN(n) ? 0 : n)
                      }}
                      className="w-20 bg-transparent py-1 px-2 text-center text-text focus:outline-none" dir="ltr" />
                    <select
                      value={item.discount_type || 'amount'}
                      onChange={e => updateItem(idx, 'discount_type', e.target.value)}
                      className="bg-white border-r border-border-light py-1 px-1.5 text-[11px] text-text-muted focus:outline-none cursor-pointer"
                    >
                      <option value="amount">ر</option>
                      <option value="percent">%</option>
                    </select>
                  </div>
                </div>
                <span className="text-text-muted text-[11px]">الإجمالي:</span>
                <span className="font-semibold text-text">{calcLineTotal(item).toFixed(2)} ر.س</span>
                {(() => {
                  const target = printedLineExcl(item, data.vat_rate || 15)
                  if (target == null) return null
                  const diff = target - calcLineTotal(item)
                  if (Math.abs(diff) < 0.01) return null
                  return (
                    <button
                      onClick={() => completeHalalas(idx)}
                      title={`المعروض شامل الضريبة بالفاتورة: ${(target * (1 + (data.vat_rate || 15) / 100)).toFixed(2)} ر.س — اضغط لمطابقة الإجمالي بدقة`}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap"
                    >
                      خصم الهللات ({diff > 0 ? '+' : ''}{diff.toFixed(2)})
                    </button>
                  )
                })()}
              </div>
            </div>
          ))}
        </div>

        {/* Totals — always computed from current items so edits update live */}
        {items.length > 0 && (() => {
          const vatRate = data.vat_rate || 15
          const subtotal = items.reduce((s, i) => s + calcLineTotal(i), 0)
          const vatAmount = subtotal * (vatRate / 100)
          const totalAmount = subtotal + vatAmount
          return (
            <div className="border-t border-border-light">
              <div className="px-5 py-2 flex items-center justify-between">
                <span className="text-[13px] text-text-muted">المجموع قبل الضريبة</span>
                <span className="text-[13px] font-medium text-text">{subtotal.toFixed(2)} ر.س</span>
              </div>
              <div className="px-5 py-2 flex items-center justify-between">
                <span className="text-[13px] text-text-muted">ضريبة القيمة المضافة ({data.vat_rate || 15}%)</span>
                <span className="text-[13px] font-medium text-text">{vatAmount.toFixed(2)} ر.س</span>
              </div>
              <div className="px-5 py-3 bg-primary-50 flex items-center justify-between rounded-b-2xl">
                <span className="text-sm font-semibold text-primary-dark">الإجمالي شامل الضريبة</span>
                <span className="text-lg font-bold text-primary-dark">{totalAmount.toFixed(2)} ر.س</span>
              </div>
            </div>
          )
        })()}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-[13px]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Sticky bottom action bar — different for batch (multi-invoice) vs single */}
      {navigation ? (
        <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-bg/95 backdrop-blur-sm border-t border-border-light">
          <div className="flex items-center flex-wrap gap-3 justify-between">
            {/* Prev / index / Next */}
            <div className="flex items-center gap-2">
              <button
                onClick={navigation.goPrev}
                disabled={!navigation.hasPrev || sendingAll}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-surface border border-border-light text-text-secondary text-[12.5px] font-semibold hover:border-primary/40 disabled:opacity-40 transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.2} />
                السابقة
              </button>
              <span className="text-[12px] font-mono text-text-muted px-2" dir="ltr">
                {navigation.idx + 1} / {navigation.total}
              </span>
              <button
                onClick={navigation.goNext}
                disabled={!navigation.hasNext || sendingAll}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-surface border border-border-light text-text-secondary text-[12.5px] font-semibold hover:border-primary/40 disabled:opacity-40 transition-colors"
              >
                التالية
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.2} />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Mark ready / unready */}
              {status !== 'sent' && (
                <button
                  onClick={() => onMarkReady && onMarkReady(status === 'ready' ? 'pending' : 'ready')}
                  disabled={sendingAll}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-colors disabled:opacity-50 ${
                    status === 'ready'
                      ? 'bg-primary-50 border border-primary/30 text-primary-dark'
                      : 'bg-surface border border-border-light text-text-secondary hover:border-primary/40'
                  }`}
                >
                  {status === 'ready'
                    ? <><CheckCircle2 className="w-4 h-4" strokeWidth={2.2} />جاهزة للإرسال</>
                    : <>تجهيز للإرسال</>}
                </button>
              )}
              {status === 'sent' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-[12.5px] font-bold">
                  <CheckCircle2 className="w-4 h-4" strokeWidth={2.4} />تم الإرسال
                </span>
              )}
              {status === 'failed' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-[12.5px] font-bold">
                  <AlertCircle className="w-4 h-4" strokeWidth={2.2} />فشل الإرسال
                </span>
              )}

              {/* Send all (batch) */}
              {onSendAll && (
                <button
                  onClick={onSendAll}
                  disabled={sendingAll || navigation.readyCount === 0}
                  className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold text-[13px] py-2 px-5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {sendingAll
                    ? <><Loader2 className="w-4 h-4 animate-spin" />جارِ الإرسال...</>
                    : <><Send className="w-4 h-4" strokeWidth={2.2} />إرسال الجاهزة ({navigation.readyCount})</>}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Single-invoice mode (manual entry) — original send button
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button onClick={onBack} disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border text-text-secondary text-[13px] font-medium hover:bg-surface-lighter disabled:opacity-50">
            رجوع
          </button>
          <button onClick={handlePush} disabled={saving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-[13px] py-2.5 px-6 rounded-xl transition-colors disabled:opacity-70">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {saving ? 'جارِ الإرسال...' : 'أرسل لقيود'}
          </button>
        </div>
      )}
    </div>
  )
}

// Step 3: Success
function SuccessStep({ count, onReset }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-primary" strokeWidth={1.6} />
      </div>
      <h2 className="text-lg font-bold text-text mb-1">تم الإرسال بنجاح</h2>
      <p className="text-sm text-text-muted mb-6">
        تم تسجيل {count > 1 ? `${count} فواتير` : 'الفاتورة'} في قيود بحالة معتمدة
      </p>
      <button onClick={onReset}
        className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-[13px] py-2.5 px-6 rounded-xl transition-colors">
        <Upload className="w-4 h-4" /> رفع فاتورة أخرى
      </button>
    </div>
  )
}

// Main component
export default function UploadInvoice() {
  const [mode, setMode] = useState(null) // null | 'ai' | 'manual'
  const [step, setStep] = useState('upload') // upload | match | success
  // invoiceStates: per-invoice persistent editing state
  // each: { data, matchedItems, draft, status, error }
  // status: 'pending' | 'ready' | 'sent' | 'failed'
  const [invoiceStates, setInvoiceStates] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  // Manual mode keeps a single scannedData/matchedItems (no batch)
  const [scannedData, setScannedData] = useState(null)
  const [matchedItems, setMatchedItems] = useState(null)
  const [products, setProducts] = useState([])
  const [vendors, setVendors] = useState([])
  const [vendorMappings, setVendorMappings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sendingAll, setSendingAll] = useState(false)
  const [doneCount, setDoneCount] = useState(0)
  const toast = useToast()

  const startManualMode = async () => {
    setMode('manual')
    setLoading(true)
    setError(null)
    try {
      const [vendorsResult, productsResult, nextNumResult, vmResult] = await Promise.all([
        getVendors(),
        getProducts(),
        getNextBillNumber('BILL').catch(() => null),
        getVendorMappings().catch(() => null),
      ])
      setVendors(vendorsResult.vendors || [])
      setProducts(productsResult.products || [])
      setVendorMappings(vmResult?.mappings || [])
      // Prefer the live next-number from Qoyod; fall back to local counter if request fails
      let invoiceNumber
      if (nextNumResult?.suggested) {
        invoiceNumber = nextNumResult.suggested
        setLocalCounter(nextNumResult.next) // sync local counter
      } else {
        invoiceNumber = getNextInvoiceNumber()
      }
      const today = new Date().toISOString().split('T')[0]
      setScannedData({ items: [], vendor_name: '', invoice_number: invoiceNumber, invoice_date: today, due_date: today })
      setMatchedItems([])
      setStep('match')
    } catch (e) {
      const p = parseError(e)
      toast.error(p.message, { title: p.title })
      setMode(null)
    } finally {
      setLoading(false)
    }
  }

  // Match items for a single invoice and cache the result on its state slot
  const loadMatchForIdx = async (idx, source) => {
    const list = source || invoiceStates
    const slot = list[idx]
    if (!slot || slot.matchedItems) return
    setLoading(true)
    setError(null)
    try {
      const onRetry = ({ attempt, totalAttempts, delay }) => {
        toast.warning(
          `جاري إعادة المحاولة... ${attempt}/${totalAttempts} بعد ${(delay / 1000).toFixed(0)}ث`,
          { title: 'الذكاء الاصطناعي مشغول', duration: delay + 500 }
        )
      }
      const [matchResult, vendorsResult, vmResult] = await Promise.all([
        matchItems(slot.data.items, slot.data.vendor_name, { onRetry }),
        vendors.length ? { vendors } : getVendors(),
        vendorMappings.length ? { mappings: vendorMappings } : getVendorMappings().catch(() => ({ mappings: [] })),
      ])
      setProducts(matchResult.products)
      if (!vendors.length) setVendors(vendorsResult.vendors || [])
      if (!vendorMappings.length) setVendorMappings(vmResult?.mappings || [])
      setInvoiceStates(prev => prev.map((s, i) => i === idx ? { ...s, matchedItems: matchResult.items } : s))
    } catch (e) {
      const p = parseError(e)
      toast.error(p.message, { title: p.title })
      setError(p.message)
    } finally {
      setLoading(false)
    }
  }

  // Manual mode loader (single invoice, no batch state)
  const loadManualInvoice = async (data) => {
    setScannedData(data)
    setMatchedItems(data.items || [])
    setStep('match')
  }

  const handleScanned = async (results) => {
    const states = results.map(data => ({
      data,
      matchedItems: null,
      draft: null,
      status: 'pending',
      error: null,
    }))
    setInvoiceStates(states)
    setCurrentIdx(0)
    setDoneCount(0)
    setStep('match')
    await loadMatchForIdx(0, states)
  }

  const goToInvoice = async (idx) => {
    if (idx < 0 || idx >= invoiceStates.length) return
    setCurrentIdx(idx)
    if (!invoiceStates[idx].matchedItems) {
      await loadMatchForIdx(idx)
    }
  }

  const updateDraft = useCallback((idx, draft) => {
    setInvoiceStates(prev => prev.map((s, i) => i === idx ? { ...s, draft } : s))
  }, [])

  const setInvoiceStatus = useCallback((idx, status, error = null) => {
    setInvoiceStates(prev => prev.map((s, i) => i === idx ? { ...s, status, error } : s))
  }, [])

  // Build the data object that MatchStep will consume — applies any saved draft on top
  const getMatchStepData = (idx) => {
    const s = invoiceStates[idx]
    if (!s) return null
    if (s.draft) {
      return {
        ...s.data,
        vendor_id: s.draft.vendorId,
        invoice_number: s.draft.invoiceNum,
        invoice_date: s.draft.invoiceDate,
        due_date: s.draft.dueDate,
        items: s.draft.items,
      }
    }
    return { ...s.data, items: s.matchedItems || s.data.items || [] }
  }

  // Single-invoice push (used by manual mode and as the inner worker for sendAll)
  const sendInvoiceToQoyod = async ({ vendorId, vendor, invoiceNum, invoiceDate, dueDate, items, isInclusive, originalVendorName }) => {
    // Save vendor mapping if invoice vendor name differs from chosen Qoyod vendor name
    if (originalVendorName && originalVendorName.trim() && originalVendorName.trim() !== vendor) {
      try {
        await createVendorMapping({
          invoice_vendor_name: originalVendorName.trim(),
          qoyod_vendor_id: vendorId,
          qoyod_vendor_name: vendor,
        })
      } catch { /* ignore */ }
    }

    // Save new manual item mappings
    for (const item of items) {
      if (item.match_type === 'manual' && item.matched_product_id) {
        try {
          await createMapping({
            vendor_item_name: item.description,
            qoyod_product_id: item.matched_product_id,
            qoyod_product_name: item.matched_product_name,
            vendor_name: vendor,
          })
        } catch { /* ignore */ }
      }
    }

    // Get first inventory
    let inventoryId = 1
    try {
      const inv = await getInventories()
      if (inv.inventories?.[0]) inventoryId = inv.inventories[0].id
    } catch {}

    await pushToQoyod({
      vendor_id: vendorId,
      vendor_name: vendor,
      invoice_number: invoiceNum,
      invoice_date: invoiceDate,
      due_date: dueDate,
      inventory_id: inventoryId,
      is_inclusive: isInclusive,
      items: items.map(i => ({
        product_id: i.matched_product_id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount: i.discount || 0,
        discount_type: i.discount_type || 'amount',
        line_subtotal_incl_vat: i.line_subtotal_incl_vat || 0,
        tax_percent: 15,
      })),
    })

    if (mode === 'manual' && /^BILL\d+$/.test(invoiceNum)) {
      bumpInvoiceCounter()
    }
  }

  // Manual-mode push (single invoice, immediate send + advance to success)
  const handleManualPush = async (payload) => {
    await sendInvoiceToQoyod(payload)
    toast.success(`تم تسجيل الفاتورة ${payload.invoiceNum || ''} في قيود`, { title: 'تمت العملية بنجاح' })
    setDoneCount(doneCount + 1)
    setStep('success')
  }

  // Bulk send all 'ready' invoices
  const sendAll = async () => {
    const ready = invoiceStates
      .map((s, idx) => ({ s, idx }))
      .filter(({ s }) => s.status === 'ready' && s.draft)
    if (!ready.length) {
      toast.warning('لا توجد فواتير جاهزة للإرسال', { title: 'لا يوجد ما يُرسل' })
      return
    }
    setSendingAll(true)
    let succeeded = 0
    let failed = 0
    for (const { s, idx } of ready) {
      try {
        const v = vendors.find(x => x.id === s.draft.vendorId)
        await sendInvoiceToQoyod({
          vendorId: s.draft.vendorId,
          vendor: v?.name || '',
          invoiceNum: s.draft.invoiceNum,
          invoiceDate: s.draft.invoiceDate,
          dueDate: s.draft.dueDate,
          items: s.draft.items,
          isInclusive: s.data.is_inclusive ?? false,
          originalVendorName: s.data.vendor_name || '',
        })
        setInvoiceStatus(idx, 'sent')
        succeeded++
      } catch (e) {
        const p = parseError(e)
        setInvoiceStatus(idx, 'failed', p.message)
        failed++
      }
    }
    setSendingAll(false)
    setDoneCount(prev => prev + succeeded)
    if (succeeded > 0) toast.success(`تم إرسال ${succeeded} فاتورة لقيود`, { title: 'تمت العملية' })
    if (failed > 0) toast.warning(`${failed} فاتورة فشل إرسالها — راجع التفاصيل`, { title: 'فشل جزئي' })
  }

  const reset = () => {
    setMode(null)
    setStep('upload')
    setScannedData(null)
    setMatchedItems(null)
    setInvoiceStates([])
    setCurrentIdx(0)
    setDoneCount(0)
    setProducts([])
    setError(null)
  }

  // The AI upload step has its own hero design — hide the generic page header for it
  const isAiUploadHero = mode === 'ai' && step === 'upload'

  return (
    <div className="w-full animate-page">
      <div className="mb-6 sm:mb-8">
        {!isAiUploadHero && (
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-text">رفع الفواتير</h1>
              <p className="text-xs sm:text-sm text-text-muted mt-1">
                {mode === null && 'اختر طريقة إدخال الفاتورة'}
                {step === 'match' && (invoiceStates.length > 0
                  ? `فاتورة ${currentIdx + 1} من ${invoiceStates.length} — جهّز كل الفواتير ثم أرسلها دفعة واحدة`
                  : mode === 'manual' ? 'أدخل بيانات الفاتورة يدوياً' : 'راجع البيانات المستخرجة وطابق البنود')}
                {step === 'success' && 'تمت العملية بنجاح'}
              </p>
            </div>
            {mode && step !== 'success' && (
              <button onClick={reset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-text-muted hover:text-primary-dark hover:bg-primary-50 transition-colors flex-shrink-0">
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">اختر نمط آخر</span>
                <span className="sm:hidden">رجوع</span>
              </button>
            )}
          </div>
        )}

        {/* "Choose another mode" link only — for AI upload hero */}
        {isAiUploadHero && (
          <div className="flex justify-end mb-4">
            <button onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-text-muted hover:text-primary-dark hover:bg-primary-50 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
              اختر نمط آخر
            </button>
          </div>
        )}

        {/* Steps indicator (hide on mode select and on hero — hero shows it differently) */}
        {mode && step !== 'success' && !isAiUploadHero && (
          <div className="flex items-center gap-2 mt-4">
            {(mode === 'ai' ? ['رفع', 'مطابقة', 'إرسال'] : ['الإدخال', 'الإرسال']).map((s, i) => {
              const stepIdx = mode === 'ai' ? (step === 'upload' ? 0 : 1) : 0
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    i <= stepIdx ? 'bg-primary text-white' : 'bg-surface-lighter text-text-muted'
                  }`}>{i + 1}</div>
                  <span className={`text-[12px] font-medium ${i <= stepIdx ? 'text-text' : 'text-text-muted'}`}>{s}</span>
                  {i < (mode === 'ai' ? 2 : 1) && <div className={`w-8 h-px ${i < stepIdx ? 'bg-primary' : 'bg-border-light'}`} />}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="text-sm text-text-muted">{mode === 'manual' ? 'جارِ تحميل البيانات...' : 'جارِ مطابقة البنود مع قيود...'}</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-[13px] mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={() => setError(null)} className="mr-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {!loading && mode === null && (
        <ModeSelect onSelect={(m) => m === 'ai' ? setMode('ai') : startManualMode()} />
      )}
      {!loading && mode === 'ai' && step === 'upload' && <UploadStep onScanned={handleScanned} />}

      {/* AI batch — multi-invoice flow with persistent state, navigation, and bulk send */}
      {!loading && step === 'match' && mode === 'ai' && invoiceStates.length > 0 && (
        <>
          {/* Invoice strip — quick navigation between invoices with status indicators */}
          {invoiceStates.length > 1 && (
            <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1">
              {invoiceStates.map((s, i) => {
                const active = i === currentIdx
                const colorMap = {
                  pending: { bg: 'bg-surface', border: 'border-border-light', text: 'text-text-secondary', dot: 'bg-text-muted/40' },
                  ready: { bg: 'bg-primary-50', border: 'border-primary/30', text: 'text-primary-dark', dot: 'bg-primary' },
                  sent: { bg: 'bg-primary', border: 'border-primary', text: 'text-white', dot: 'bg-white' },
                  failed: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-600', dot: 'bg-red-500' },
                }
                const c = colorMap[s.status] || colorMap.pending
                return (
                  <button
                    key={i}
                    onClick={() => goToInvoice(i)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-semibold whitespace-nowrap transition-all ${c.bg} ${c.text} ${
                      active ? `${c.border} ring-2 ring-primary/30` : c.border
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    فاتورة {i + 1}
                    {s.status === 'sent' && <CheckCircle2 className="w-3 h-3" strokeWidth={2.4} />}
                    {s.status === 'failed' && <AlertCircle className="w-3 h-3" strokeWidth={2.4} />}
                  </button>
                )
              })}
            </div>
          )}

          <MatchStep
            key={currentIdx}
            data={getMatchStepData(currentIdx)}
            products={products}
            vendors={vendors}
            vendorMappings={vendorMappings}
            onBack={reset}
            isManual={false}
            onDraftChange={(d) => updateDraft(currentIdx, d)}
            navigation={{
              idx: currentIdx,
              total: invoiceStates.length,
              hasPrev: currentIdx > 0,
              hasNext: currentIdx < invoiceStates.length - 1,
              goPrev: () => goToInvoice(currentIdx - 1),
              goNext: () => goToInvoice(currentIdx + 1),
              readyCount: invoiceStates.filter(s => s.status === 'ready').length,
            }}
            status={invoiceStates[currentIdx]?.status}
            onMarkReady={(newStatus) => setInvoiceStatus(currentIdx, newStatus)}
            onSendAll={sendAll}
            sendingAll={sendingAll}
          />
        </>
      )}

      {/* Manual flow — single invoice, immediate send */}
      {!loading && step === 'match' && mode === 'manual' && (
        <MatchStep
          data={{ ...scannedData, items: matchedItems || scannedData?.items }}
          products={products}
          vendors={vendors}
          vendorMappings={vendorMappings}
          onPush={handleManualPush}
          onBack={reset}
          isManual={true}
        />
      )}

      {step === 'success' && <SuccessStep count={doneCount} onReset={reset} />}
    </div>
  )
}
