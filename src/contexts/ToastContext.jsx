import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: { Icon: CheckCircle2, ring: 'bg-emerald-500', tint: 'border-emerald-500/30' },
  error: { Icon: AlertCircle, ring: 'bg-red-500', tint: 'border-red-500/30' },
  warning: { Icon: AlertTriangle, ring: 'bg-amber-500', tint: 'border-amber-500/30' },
  info: { Icon: Info, ring: 'bg-blue-500', tint: 'border-blue-500/30' },
}

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((message, opts = {}) => {
    const id = nextId++
    const toast = {
      id,
      message,
      type: opts.type || 'info',
      title: opts.title || null,
      duration: opts.duration ?? 4500,
    }
    setToasts(prev => [...prev, toast])
    if (toast.duration > 0) {
      setTimeout(() => dismiss(id), toast.duration)
    }
    return id
  }, [dismiss])

  const success = useCallback((message, opts) => show(message, { ...opts, type: 'success' }), [show])
  const error = useCallback((message, opts) => show(message, { ...opts, type: 'error' }), [show])
  const warning = useCallback((message, opts) => show(message, { ...opts, type: 'warning' }), [show])
  const info = useCallback((message, opts) => show(message, { ...opts, type: 'info' }), [show])

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info, dismiss }}>
      {children}
      <div className="fixed bottom-4 left-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-auto sm:max-w-sm pointer-events-none">
        {toasts.map(t => {
          const cfg = ICONS[t.type] || ICONS.info
          const Icon = cfg.Icon
          return (
            <div
              key={t.id}
              className={`pointer-events-auto bg-white border ${cfg.tint} rounded-2xl shadow-lg overflow-hidden flex items-stretch toast-slide-in`}
            >
              <div className={`w-1 ${cfg.ring} flex-shrink-0`} />
              <div className="flex items-start gap-3 p-3.5 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-lg ${cfg.ring}/15 flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${
                    t.type === 'success' ? 'text-emerald-600' :
                    t.type === 'error' ? 'text-red-600' :
                    t.type === 'warning' ? 'text-amber-600' :
                    'text-blue-600'
                  }`} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  {t.title && <p className="text-[13px] font-semibold text-text leading-snug">{t.title}</p>}
                  <p className={`text-[12px] leading-relaxed ${t.title ? 'text-text-muted mt-0.5' : 'text-text'}`}>
                    {t.message}
                  </p>
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="p-0.5 rounded text-text-muted hover:text-text-secondary transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// Smart error parser — translates common errors to friendly Arabic messages
export function parseError(err) {
  const msg = err?.message || String(err || '')

  // Network errors
  if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('fetch failed')) {
    return { title: 'فشل الاتصال', message: 'تأكد من اتصال الإنترنت أو إن السيرفر شغّال' }
  }

  // Gemini AI errors (passed through from backend)
  if (msg.includes('الذكاء الاصطناعي مشغول')) {
    return { title: 'الذكاء الاصطناعي مشغول', message: 'تجاوز حد الطلبات. انتظر دقيقة وحاول مرة ثانية', type: 'warning' }
  }
  if (msg.includes('حمل عالي')) {
    return { title: 'الخادم محمّل', message: 'حاول بعد دقيقة', type: 'warning' }
  }
  if (msg.includes('مفتاح Gemini')) {
    return { title: 'مفتاح Gemini غير صالح', message: 'راجع إعدادات النظام' }
  }
  if (msg.includes('Resource exhausted') || msg.includes('429')) {
    return { title: 'الذكاء الاصطناعي مشغول', message: 'تجاوز حد الطلبات في الدقيقة. انتظر قليلاً وحاول مرة ثانية', type: 'warning' }
  }
  if (msg.includes('overloaded') || msg.includes('503')) {
    return { title: 'الخادم محمّل', message: 'الذكاء الاصطناعي يواجه ضغط حالياً، حاول بعد دقيقة', type: 'warning' }
  }

  // Duplicate invoice
  if (msg.includes('reference') && (msg.includes('taken') || msg.includes('duplicate') || msg.includes('exists') || msg.includes('unique'))) {
    return { title: 'فاتورة مكررة', message: 'الفاتورة بهذا الرقم مسجلة مسبقاً في قيود', type: 'warning' }
  }

  // Qoyod API errors
  if (msg.includes('Qoyod API 401')) return { title: 'مفتاح API غير صالح', message: 'تأكد من مفتاح قيود في الإعدادات' }
  if (msg.includes('Qoyod API 404')) return { title: 'غير موجود', message: 'العنصر المطلوب غير موجود في قيود' }
  if (msg.includes('Qoyod API 422')) return { title: 'بيانات غير صحيحة', message: 'راجع البيانات وحاول مرة ثانية' }
  if (msg.includes('Qoyod API 500')) return { title: 'خطأ في خادم قيود', message: 'يبدو أن قيود يواجه مشكلة مؤقتة، حاول بعد قليل' }
  if (msg.includes('Qoyod API')) return { title: 'خطأ من قيود', message: msg.replace(/^Qoyod API \d+:\s*/, '') }

  // Auth/permissions
  if (msg.includes('Unauthorized') || msg.includes('401')) {
    return { title: 'غير مصرح', message: 'سجّل دخول مرة ثانية' }
  }
  if (msg.includes('Forbidden') || msg.includes('403')) {
    return { title: 'ليس لديك صلاحية', message: 'هذه العملية تحتاج صلاحيات إضافية' }
  }

  // Server errors
  if (msg.includes('500')) return { title: 'خطأ في الخادم', message: 'حصلت مشكلة في النظام، حاول مرة ثانية' }

  // Default — show original message
  return { title: null, message: msg || 'حصل خطأ غير متوقع' }
}
