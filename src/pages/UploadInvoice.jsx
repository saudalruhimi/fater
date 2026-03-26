import {
  Upload, FileText, X, Image, Trash2, CheckCircle2, CloudUpload,
  Sparkles, File, Loader2, AlertCircle, Send, ArrowRight,
} from 'lucide-react'
import { useState, useCallback, useRef, useEffect } from 'react'
import { scanInvoice, matchItems, pushToQoyod, getInventories, getVendors, createMapping } from '../lib/api.js'
import SearchableSelect from '../components/SearchableSelect.jsx'

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

// Step 2: Review & Match
function MatchStep({ data, products, vendors, onPush, onBack }) {
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

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const calcLineTotal = (item) => {
    return item.total || (item.quantity * item.unit_price)
  }

  const selectedVendor = vendors.find(v => v.id === vendorId)

  const handlePush = async () => {
    if (!vendorId) {
      setError('اختر المورد من القائمة')
      return
    }
    const unmatched = items.filter(i => !i.matched_product_id)
    if (unmatched.length) {
      setError(`${unmatched.length} بنود بدون مطابقة — اختر البند المقابل من القائمة`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      console.log('Pushing with vendor:', vendorId, selectedVendor?.name)
      await onPush({ vendorId, vendor: selectedVendor?.name || '', invoiceNum, invoiceDate, dueDate, items, isInclusive: data.is_inclusive ?? false })
    } catch (e) {
      setError(e.message)
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
        <div className="px-5 py-3 border-b border-border-light">
          <h3 className="text-sm font-semibold text-text">البنود ({items.length})</h3>
        </div>

        <div className="divide-y divide-border-light/60">
          {items.map((item, idx) => (
            <div key={idx} className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Original description */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-text-muted mb-0.5">البند بالفاتورة</p>
                  <p className="text-[13px] font-medium text-text">{item.description}</p>
                </div>

                <ArrowRight className="w-4 h-4 text-text-muted hidden sm:block flex-shrink-0" />

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
                      updateItem(idx, 'match_type', p ? 'manual' : 'unmatched')
                    }}
                    placeholder="-- اختر البند --"
                    error={!item.matched_product_id}
                  />
                </div>

                {/* Status badge */}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap self-start sm:self-center ${matchColor(item.match_type)}`}>
                  {matchLabel(item.match_type)}
                </span>
              </div>

              {/* Qty, price, discount, total */}
              <div className="flex flex-wrap items-center gap-3 text-[13px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted text-[11px]">كمية:</span>
                  <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                    className="w-16 bg-surface-light border border-border-light rounded-lg py-1 px-2 text-center text-text focus:outline-none" dir="ltr" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted text-[11px]">سعر:</span>
                  <input type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                    className="w-24 bg-surface-light border border-border-light rounded-lg py-1 px-2 text-center text-text focus:outline-none" dir="ltr" />
                </div>
                <span className="text-text-muted text-[11px]">الإجمالي:</span>
                <span className="font-semibold text-text">{calcLineTotal(item).toFixed(2)} ر.س</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        {(() => {
          const subtotal = items.reduce((s, i) => s + calcLineTotal(i), 0)
          const vatAmount = data.vat_amount || subtotal * 0.15
          const totalAmount = data.total_amount || (subtotal + vatAmount)
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
      setError(e.message)
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
        <h1 className="text-lg sm:text-xl font-bold text-text">رفع الفواتير</h1>
        <p className="text-xs sm:text-sm text-text-muted mt-1">
          {step === 'upload' && 'ارفع صورة الفاتورة لقراءتها بالذكاء الاصطناعي'}
          {step === 'match' && (allScanned.length > 1
            ? `فاتورة ${currentIdx + 1} من ${allScanned.length} — راجع البيانات وطابق البنود`
            : 'راجع البيانات المستخرجة وطابق البنود')}
          {step === 'success' && 'تمت العملية بنجاح'}
        </p>

        {/* Steps indicator */}
        {step !== 'success' && (
          <div className="flex items-center gap-2 mt-4">
            {['رفع', 'مطابقة', 'إرسال'].map((s, i) => {
              const stepIdx = step === 'upload' ? 0 : 1
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    i <= stepIdx ? 'bg-primary text-white' : 'bg-surface-lighter text-text-muted'
                  }`}>{i + 1}</div>
                  <span className={`text-[12px] font-medium ${i <= stepIdx ? 'text-text' : 'text-text-muted'}`}>{s}</span>
                  {i < 2 && <div className={`w-8 h-px ${i < stepIdx ? 'bg-primary' : 'bg-border-light'}`} />}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="text-sm text-text-muted">جارِ مطابقة البنود مع قيود...</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-[13px] mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={() => setError(null)} className="mr-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {!loading && step === 'upload' && <UploadStep onScanned={handleScanned} />}
      {!loading && step === 'match' && (
        <MatchStep
          data={{ ...scannedData, items: matchedItems || scannedData?.items }}
          products={products}
          vendors={vendors}
          onPush={handlePush}
          onBack={reset}
        />
      )}
      {step === 'success' && <SuccessStep count={doneCount} onReset={reset} />}
    </div>
  )
}
