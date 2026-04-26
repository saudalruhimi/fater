import {
  Upload, FileText, X, Image, Trash2, CheckCircle2, CloudUpload,
  Sparkles, File, Loader2, AlertCircle, Send, ArrowRight, Plus, Pencil, ArrowLeft, Bookmark, Star,
} from 'lucide-react'
import { useState, useCallback, useRef, useEffect } from 'react'
import { scanInvoice, matchItems, pushToQoyod, getInventories, getVendors, getProducts, createMapping } from '../lib/api.js'
import SearchableSelect from '../components/SearchableSelect.jsx'
import { useToast, parseError } from '../contexts/ToastContext.jsx'

// Mode Selection: AI vs Manual
function ModeSelect({ onSelect }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
      <button
        onClick={() => onSelect('ai')}
        className="group relative bg-white rounded-2xl border-2 border-border-light hover:border-primary p-6 sm:p-8 text-right transition-all card-hover"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
            <Sparkles className="w-6 h-6 text-primary group-hover:text-white" strokeWidth={1.6} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-text mb-1.5">عبر الذكاء الاصطناعي</h3>
            <p className="text-[12px] text-text-muted leading-relaxed">
              ارفع صورة الفاتورة أو ملف PDF — يقرأ الذكاء الاصطناعي البيانات تلقائياً ويستخرج المورد والبنود والمبالغ.
            </p>
            <div className="flex items-center gap-2 mt-3 text-[11px] text-primary font-medium">
              <span>الأسرع</span>
              <span className="text-text-muted/40">·</span>
              <span>للفواتير الإلكترونية</span>
            </div>
          </div>
        </div>
      </button>

      <button
        onClick={() => onSelect('manual')}
        className="group relative bg-white rounded-2xl border-2 border-border-light hover:border-primary p-6 sm:p-8 text-right transition-all card-hover"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <Pencil className="w-6 h-6 text-blue-500 group-hover:text-white" strokeWidth={1.6} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-text mb-1.5">إدخال يدوي</h3>
            <p className="text-[12px] text-text-muted leading-relaxed">
              أدخل بيانات الفاتورة بنفسك — اختر المورد والبنود وأكتب الكميات والأسعار، ثم أرسلها لقيود مباشرة.
            </p>
            <div className="flex items-center gap-2 mt-3 text-[11px] text-blue-600 font-medium">
              <span>دقة كاملة</span>
              <span className="text-text-muted/40">·</span>
              <span>للفواتير الورقية</span>
            </div>
          </div>
        </div>
      </button>
    </div>
  )
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Step 1: Upload
function UploadStep({ onScanned }) {
  const [files, setFiles] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const addFiles = useCallback((newFiles) => {
    const mapped = Array.from(newFiles)
      .filter((f) => f.size <= 10 * 1024 * 1024)
      .map((f) => ({
        file: f,
        id: crypto.randomUUID(),
        url: URL.createObjectURL(f),
        isImage: f.type.startsWith('image/'),
        isPdf: f.type === 'application/pdf',
      }))
    setFiles((prev) => [...prev, ...mapped])
    setError(null)
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

  const startScan = async () => {
    if (!files.length) return
    setScanning(true)
    setError(null)
    try {
      const results = []
      for (const f of files) {
        const result = await scanInvoice(f.file)
        // Attach image preview URL to scanned data
        results.push({ ...result.data, _previewUrl: f.url || null, _isPdf: f.isPdf || false })
      }
      onScanned(results)
    } catch (e) {
      setError(e.message)
    } finally {
      setScanning(false)
    }
  }

  const hasFiles = files.length > 0

  return (
    <>
      <div className={`grid gap-5 ${hasFiles ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1'}`}>
        <div className={hasFiles ? 'lg:col-span-2' : ''}>
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => !scanning && inputRef.current?.click()}
            className={`relative rounded-2xl text-center cursor-pointer transition-all ${
              hasFiles ? 'p-6 sm:p-8' : 'p-10 sm:p-16'
            } ${dragActive ? 'bg-primary-50 border-2 border-primary' : 'bg-white border-2 border-dashed border-border hover:border-primary/30'}`}
          >
            <input ref={inputRef} type="file" multiple accept="image/*,.pdf"
              onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} className="hidden" />
            <div className={`mx-auto rounded-full flex items-center justify-center mb-4 ${
              hasFiles ? 'w-12 h-12' : 'w-16 h-16 sm:w-20 sm:h-20'
            } ${dragActive ? 'bg-primary/10' : 'bg-surface-lighter'}`}>
              <CloudUpload className={`${hasFiles ? 'w-6 h-6' : 'w-8 h-8 sm:w-9 sm:h-9'} ${dragActive ? 'text-primary' : 'text-text-muted'}`} strokeWidth={1.4} />
            </div>
            <p className={`font-semibold text-text mb-1.5 ${hasFiles ? 'text-sm' : 'text-base sm:text-lg'}`}>
              {dragActive ? 'أفلت الملفات هنا' : 'اسحب الفواتير وأفلتها'}
            </p>
            <p className="text-xs text-text-muted">أو اضغط لاختيار الملفات</p>
            {!hasFiles && (
              <div className="flex items-center justify-center gap-4 sm:gap-6 pt-4">
                <div className="flex items-center gap-1.5 text-text-muted"><Image className="w-3.5 h-3.5" /><span className="text-[11px]">PNG / JPG</span></div>
                <div className="flex items-center gap-1.5 text-text-muted"><FileText className="w-3.5 h-3.5" /><span className="text-[11px]">PDF</span></div>
                <div className="text-[11px] text-text-muted/60">حد 10MB</div>
              </div>
            )}
          </div>
        </div>

        {hasFiles && (
          <div className="lg:col-span-3 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-primary">{files.length}</span>
                </div>
                <span className="text-sm font-semibold text-text">ملفات جاهزة</span>
              </div>
              <button onClick={() => { files.forEach(f => f.url && URL.revokeObjectURL(f.url)); setFiles([]); }}
                className="text-[11px] text-text-muted hover:text-red-500 transition-colors px-2 py-1 rounded-md hover:bg-red-50">مسح الكل</button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-[50vh] pl-1">
              {files.map((f) => (
                <div key={f.id} className="bg-white rounded-xl border border-border-light hover:border-primary/20 transition-all group">
                  <div className="flex items-center gap-3 p-3">
                    <div className={`w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center ${f.isImage && f.url ? '' : 'bg-surface-lighter'}`}
                      onClick={() => f.isImage && setPreview(f)}>
                      {f.isImage && f.url
                        ? <img src={f.url} alt="" className="w-full h-full object-cover rounded-lg" />
                        : <div className="flex flex-col items-center gap-0.5"><File className="w-5 h-5 text-red-400" /><span className="text-[8px] font-bold text-red-400">PDF</span></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text truncate">{f.file.name}</p>
                      <span className="text-[11px] text-text-muted">{formatSize(f.file.size)}</span>
                    </div>
                    <button onClick={() => removeFile(f.id)} className="p-2 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-[13px]">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-border-light">
              <button onClick={() => inputRef.current?.click()} disabled={scanning}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border text-text-secondary text-[13px] font-medium hover:border-primary/40 disabled:opacity-50">
                <Upload className="w-4 h-4" /> إضافة المزيد
              </button>
              <button onClick={startScan} disabled={scanning}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-[13px] py-2.5 px-6 rounded-xl transition-colors disabled:opacity-70">
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {scanning ? 'جارِ القراءة...' : 'ابدأ القراءة'}
              </button>
            </div>
          </div>
        )}
      </div>

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

// Manual invoice number counter
const COUNTER_KEY = 'manual_invoice_counter'
const COUNTER_START = 268
function getNextInvoiceNumber() {
  try {
    const raw = localStorage.getItem(COUNTER_KEY)
    const n = raw ? Number(raw) : COUNTER_START
    return `BILL${n}`
  } catch { return `BILL${COUNTER_START}` }
}
function bumpInvoiceCounter() {
  try {
    const raw = localStorage.getItem(COUNTER_KEY)
    const n = raw ? Number(raw) : COUNTER_START
    localStorage.setItem(COUNTER_KEY, String(n + 1))
  } catch { /* ignore */ }
}

// Step 2: Review & Match (also used for Manual mode)
function MatchStep({ data, products, vendors, onPush, onBack, isManual = false }) {
  const [items, setItems] = useState(data.items || [])
  const [vendorId, setVendorId] = useState(() => {
    if (!data.vendor_name || !vendors.length) return null
    const words = data.vendor_name.split(/\s+/).filter(w => w.length > 2)
    let bestMatch = null
    let bestScore = 0
    for (const v of vendors) {
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
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, matched_product_id: null, matched_product_name: null, match_type: 'unmatched' }])
  }

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const calcLineTotal = (item) => {
    return item.total || (item.quantity * item.unit_price)
  }

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
      await onPush({ vendorId, vendor: selectedVendor?.name || '', invoiceNum, invoiceDate, dueDate, items, isInclusive: data.is_inclusive ?? false })
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
            options={vendors.map(v => ({ id: v.id, label: v.name }))}
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
                <span className="text-text-muted text-[11px]">الإجمالي:</span>
                <span className="font-semibold text-text">{calcLineTotal(item).toFixed(2)} ر.س</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        {items.length > 0 && (() => {
          const subtotal = items.reduce((s, i) => s + calcLineTotal(i), 0)
          const vatAmount = isManual ? subtotal * 0.15 : (data.vat_amount || subtotal * 0.15)
          const totalAmount = isManual ? (subtotal + vatAmount) : (data.total_amount || (subtotal + vatAmount))
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

      {/* Actions */}
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
  const [allScanned, setAllScanned] = useState([]) // array of scanned invoices
  const [currentIdx, setCurrentIdx] = useState(0)
  const [scannedData, setScannedData] = useState(null)
  const [matchedItems, setMatchedItems] = useState(null)
  const [products, setProducts] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [doneCount, setDoneCount] = useState(0)
  const toast = useToast()

  const startManualMode = async () => {
    setMode('manual')
    setLoading(true)
    setError(null)
    try {
      const [vendorsResult, productsResult] = await Promise.all([
        getVendors(),
        getProducts(),
      ])
      setVendors(vendorsResult.vendors || [])
      setProducts(productsResult.products || [])
      const today = new Date().toISOString().split('T')[0]
      setScannedData({ items: [], vendor_name: '', invoice_number: getNextInvoiceNumber(), invoice_date: today, due_date: today })
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

  const loadInvoice = async (data) => {
    setScannedData(data)
    setLoading(true)
    setError(null)
    try {
      const [matchResult, vendorsResult] = await Promise.all([
        matchItems(data.items, data.vendor_name),
        vendors.length ? { vendors } : getVendors(),
      ])
      setMatchedItems(matchResult.items)
      setProducts(matchResult.products)
      if (!vendors.length) setVendors(vendorsResult.vendors || [])
      setStep('match')
    } catch (e) {
      const p = parseError(e)
      toast.error(p.message, { title: p.title })
    } finally {
      setLoading(false)
    }
  }

  const handleScanned = async (results) => {
    setAllScanned(results)
    setCurrentIdx(0)
    setDoneCount(0)
    await loadInvoice(results[0])
  }

  const handlePush = async ({ vendorId, vendor, invoiceNum, invoiceDate, dueDate, items, isInclusive }) => {
    // Save new manual mappings
    for (const item of items) {
      if (item.match_type === 'manual' && item.matched_product_id) {
        try {
          await createMapping({
            vendor_item_name: item.description,
            qoyod_product_id: item.matched_product_id,
            qoyod_product_name: item.matched_product_name,
            vendor_name: vendor,
          })
        } catch {}
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
        tax_percent: 15,
      })),
    })

    // Bump invoice counter for manual mode
    if (mode === 'manual' && /^BILL\d+$/.test(invoiceNum)) {
      bumpInvoiceCounter()
    }

    toast.success(`تم تسجيل الفاتورة ${invoiceNum || ''} في قيود`, { title: 'تمت العملية بنجاح' })

    const newDone = doneCount + 1
    setDoneCount(newDone)

    // If more invoices, load next
    const nextIdx = currentIdx + 1
    if (nextIdx < allScanned.length) {
      setCurrentIdx(nextIdx)
      await loadInvoice(allScanned[nextIdx])
    } else {
      setStep('success')
    }
  }

  const reset = () => {
    setMode(null)
    setStep('upload')
    setScannedData(null)
    setMatchedItems(null)
    setAllScanned([])
    setCurrentIdx(0)
    setDoneCount(0)
    setProducts([])
    setError(null)
  }

  return (
    <div className="max-w-5xl animate-page">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-text">رفع الفواتير</h1>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              {mode === null && 'اختر طريقة إدخال الفاتورة'}
              {mode === 'ai' && step === 'upload' && 'ارفع صورة الفاتورة لقراءتها بالذكاء الاصطناعي'}
              {step === 'match' && (allScanned.length > 1
                ? `فاتورة ${currentIdx + 1} من ${allScanned.length} — راجع البيانات وطابق البنود`
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

        {/* Steps indicator (hide on mode select) */}
        {mode && step !== 'success' && (
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
      {!loading && step === 'match' && (
        <MatchStep
          data={{ ...scannedData, items: matchedItems || scannedData?.items }}
          products={products}
          vendors={vendors}
          onPush={handlePush}
          onBack={reset}
          isManual={mode === 'manual'}
        />
      )}
      {step === 'success' && <SuccessStep count={doneCount} onReset={reset} />}
    </div>
  )
}
