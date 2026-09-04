import { useState, useRef, useEffect, useMemo } from 'react'
import { Calendar, ChevronRight, ChevronLeft, X } from 'lucide-react'
import { usePresence } from './ui'

/* تقويم رصد — بديل input[type=date]
   المتصفح يرسم حقل التاريخ بنفسه: لا يقبل تنسيقاً، ويعرض ترتيباً وأسماء تتبع
   لغة الجهاز لا لغة النظام. هذا التقويم يعرض أسماء عربية وأسبوعاً يبدأ بالسبت،
   ويحافظ على نفس تعاقد القيمة (YYYY-MM-DD) فيبقى الإرسال لقيود كما هو. */

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

// الأسبوع يبدأ بالسبت — نفس ترتيب مخطط لوحة التحكم
const WEEKDAYS = ['سبت', 'أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع']

const pad = (n) => String(n).padStart(2, '0')
const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

function parseISO(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!m) return null
  const [, y, mo, d] = m
  return { y: +y, m: +mo - 1, d: +d }
}

// السبت = 0 … الجمعة = 6
const satIndex = (jsDay) => (jsDay + 1) % 7

function formatLabel(value) {
  const p = parseISO(value)
  if (!p) return ''
  return `${p.d} ${MONTHS[p.m]} ${p.y}`
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'اختر التاريخ',
  clearable = true,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const { mounted, leaving } = usePresence(open, 240)
  const parsed = parseISO(value)
  const today = new Date()
  const [view, setView] = useState(() => ({
    y: parsed?.y ?? today.getFullYear(),
    m: parsed?.m ?? today.getMonth(),
  }))
  const ref = useRef(null)

  // مزامنة الشهر المعروض مع قيمة تتغيّر من الخارج
  useEffect(() => {
    if (parsed) setView({ y: parsed.y, m: parsed.m })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const grid = useMemo(() => {
    const first = new Date(view.y, view.m, 1)
    const lead = satIndex(first.getDay())
    const days = new Date(view.y, view.m + 1, 0).getDate()
    const cells = Array(lead).fill(null)
    for (let d = 1; d <= days; d++) cells.push(d)
    while (cells.length % 7) cells.push(null)
    return cells
  }, [view])

  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate())

  const pick = (d) => {
    onChange(toISO(view.y, view.m, d))
    setOpen(false)
  }

  const shift = (delta) => setView((v) => {
    const n = v.m + delta
    return { y: v.y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 }
  })

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 bg-surface-light border rounded-xl py-2.5 px-3.5 text-[13px] text-right transition-colors focus:outline-none ${
          open ? 'border-primary/50 ring-1 ring-primary/10' : 'border-border hover:border-primary/30'
        }`}
      >
        <Calendar className={`w-4 h-4 flex-shrink-0 ${value ? 'text-primary-dark' : 'text-text-muted'}`} strokeWidth={1.8} />
        <span className={`flex-1 truncate ${value ? 'text-text' : 'text-text-muted'}`}>
          {value ? formatLabel(value) : placeholder}
        </span>
        {clearable && value && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="مسح التاريخ"
            onClick={(e) => { e.stopPropagation(); onChange('') }}
            className="p-0.5 rounded-full text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {mounted && (
        <div className={`absolute z-[60] top-full mt-2 w-[290px] bg-surface border border-border rounded-2xl shadow-lg p-3 ${leaving ? 'dropdown-menu-out' : 'dropdown-menu'}`}>
          {/* الشهر والسنة */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button" onClick={() => shift(-1)} aria-label="الشهر السابق"
              className="p-1.5 rounded-full hover:bg-surface-lighter text-text-secondary transition-colors"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
            <div className="text-[13.5px] font-bold text-text">
              {MONTHS[view.m]} {view.y}
            </div>
            <button
              type="button" onClick={() => shift(1)} aria-label="الشهر التالي"
              className="p-1.5 rounded-full hover:bg-surface-lighter text-text-secondary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* أيام الأسبوع */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-text-muted py-1">{d}</div>
            ))}
          </div>

          {/* الأيام */}
          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((d, i) => {
              if (!d) return <div key={i} />
              const iso = toISO(view.y, view.m, d)
              const isSel = iso === value
              const isToday = iso === todayISO
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(d)}
                  className={`h-8 rounded-lg text-[12.5px] transition-colors ${
                    isSel
                      ? 'bg-primary text-white font-bold'
                      : isToday
                        ? 'bg-primary-50 text-primary-dark font-bold'
                        : 'text-text-secondary hover:bg-surface-lighter hover:text-text'
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {/* اختصارات */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-light">
            <button
              type="button"
              onClick={() => { onChange(todayISO); setOpen(false) }}
              className="flex-1 py-1.5 rounded-full bg-surface-lighter text-[12px] font-semibold text-text-secondary hover:text-text transition-colors"
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => {
                const y = new Date(); y.setDate(y.getDate() - 1)
                onChange(toISO(y.getFullYear(), y.getMonth(), y.getDate())); setOpen(false)
              }}
              className="flex-1 py-1.5 rounded-full bg-surface-lighter text-[12px] font-semibold text-text-secondary hover:text-text transition-colors"
            >
              أمس
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
