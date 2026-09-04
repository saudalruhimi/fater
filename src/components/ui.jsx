import { useState, useEffect, useCallback } from 'react'
import { X, AlertTriangle, Loader2, Sparkles, Info, CheckCircle2 } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   لغة «الدفتر المطبوع» — عناصر مشتركة لكل الصفحات
   عناوين تحريرية بمسطرة مزدوجة، أزرار Pill، شرائح جانبية للنماذج
   ───────────────────────────────────────────────────────────── */

/* يُبقي العنصر مركّباً بعد إغلاقه بقدر مدة حركة الخروج، وإلا أزاله React فوراً
   ولم تُرَ الحركة. يعيد: هل نرسم؟ وهل نحن في طور الخروج؟ */
export function usePresence(open, duration = 200) {
  const [mounted, setMounted] = useState(open)

  useEffect(() => {
    if (open) { setMounted(true); return }
    if (!mounted) return
    const t = setTimeout(() => setMounted(false), duration)
    return () => clearTimeout(t)
  }, [open, duration, mounted])

  return { mounted, leaving: mounted && !open }
}

// Button class recipes — pill-shaped, one visual voice everywhere
export const btn = {
  primary: 'inline-flex items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary-dark text-white text-[13px] font-semibold px-5 py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
  ghost: 'inline-flex items-center justify-center gap-2 rounded-full border border-border text-text-secondary hover:text-text hover:bg-surface-lighter text-[13px] font-medium px-5 py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
  danger: 'inline-flex items-center justify-center gap-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold px-5 py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
  sm: 'inline-flex items-center justify-center gap-1.5 rounded-full text-[12px] font-semibold px-3.5 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
}

// Form field recipes
export const field = {
  label: 'block text-[12px] font-semibold text-text-secondary mb-1.5',
  input: 'w-full bg-surface-light border border-border rounded-xl py-2.5 px-3.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors',
  select: 'w-full bg-surface-light border border-border rounded-xl py-2.5 px-3.5 text-sm text-text focus:outline-none focus:border-primary/50 transition-colors',
}

// Ledger table recipes — hairlines instead of boxed cards
export const ledger = {
  wrap: 'overflow-x-auto',
  table: 'w-full',
  headRow: 'border-b-2 border-text',
  th: 'text-right text-[11px] font-bold text-text-muted px-3 py-2.5 whitespace-nowrap',
  row: 'border-b border-border-light hover:bg-surface-light/70 transition-colors',
  td: 'px-3 py-3 text-[13px]',
}

// Editorial page header with the double-rule signature
export function PageHeader({ kicker, title, description, actions, children }) {
  return (
    <header className="mb-6 sm:mb-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-4">
        <div className="min-w-0">
          {kicker && (
            <p className="text-[11px] font-bold text-primary-dark tracking-[0.12em] mb-2">{kicker}</p>
          )}
          <h1 className="text-[26px] sm:text-[32px] font-black text-text leading-[1.25]">{title}</h1>
          {description && <p className="text-[13.5px] text-text-secondary mt-2 max-w-2xl leading-relaxed">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
      <div className="rule-double" />
      {children && <div className="pt-4">{children}</div>}
    </header>
  )
}

// Segmented pill tabs — used under page headers
export function PillTabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors ${
            active === t.key
              ? 'bg-text text-bg'
              : 'text-text-muted hover:text-text hover:bg-surface-lighter'
          }`}
        >
          {t.icon && <t.icon className="w-3.5 h-3.5" strokeWidth={2} />}
          {t.label}
          {t.count != null && (
            <span className={`text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 ${
              active === t.key ? 'bg-bg/20 text-bg' : 'bg-surface-lighter text-text-muted'
            }`}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// End-side sheet — forms slide in from the left edge (RTL end)
export function Sheet({ open, onClose, title, subtitle, children, footer, wide = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] modal-overlay" onClick={onClose} />
      <div className={`absolute left-0 top-0 h-full w-full ${wide ? 'max-w-xl' : 'max-w-[420px]'} bg-surface border-r border-border shadow-2xl sheet-enter flex flex-col`}>
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-5 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-[16px] font-bold text-text">{title}</h3>
            {subtitle && <p className="text-[12px] text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-lighter transition-colors flex-shrink-0" aria-label="إغلاق">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">{children}</div>
        {footer && <div className="px-5 sm:px-6 py-4 border-t border-border flex gap-2">{footer}</div>}
      </div>
    </div>
  )
}

// Small centered confirm dialog — destructive actions only
export function ConfirmDialog({ open, onClose, title, message, highlight, confirmLabel = 'حذف', onConfirm, loading = false, error = null }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] modal-overlay" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl modal-content p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" strokeWidth={2} />
        </div>
        <h3 className="text-[15px] font-bold text-text mb-1">{title}</h3>
        {message && <p className="text-[13px] text-text-secondary leading-relaxed">{message}</p>}
        {highlight && <p className="text-[13px] font-bold text-text mt-2">«{highlight}»</p>}
        {error && <p className="text-[11.5px] text-red-500 bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} disabled={loading} className={`${btn.ghost} flex-1`}>إلغاء</button>
          <button onClick={onConfirm} disabled={loading} className={`${btn.danger} flex-1`}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// Quiet empty state — sits on the paper, no box
export function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="py-16 sm:py-20 flex flex-col items-center text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-full border border-dashed border-border flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
        </div>
      )}
      <p className="text-sm font-semibold text-text mb-1">{title}</p>
      {hint && <p className="text-[12px] text-text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* إعلان للمستخدمين — أخبار لا تحذير، فيُغلق ولا يعود.
   الإغلاق يُحفظ بالمعرّف، و`until` يجعله يختفي وحده بعد أن يصير الخبر قديماً
   حتى لو لم يغلقه أحد. */
export function Announcement({ id, title, children, until, tone = 'good', dismissible = true }) {
  const key = `announcement_${id}`
  // إعلان غير قابل للإغلاق يتجاهل ما حُفظ سابقاً: بقاؤه محكوم بـ until وحده
  const [dismissed, setDismissed] = useState(() => {
    if (!dismissible) return false
    try { return localStorage.getItem(key) === '1' } catch { return false }
  })

  if (dismissible && dismissed) return null
  if (until && new Date().toISOString().slice(0, 10) > until) return null

  const tones = {
    good: { wrap: 'bg-primary-50 border-primary', icon: 'text-primary-dark', head: 'text-primary-dark', Icon: Sparkles },
    info: { wrap: 'bg-blue-50 border-blue-400', icon: 'text-blue-700', head: 'text-blue-700', Icon: Info },
  }
  const t = tones[tone] || tones.good
  const Icon = t.Icon

  const close = () => {
    try { localStorage.setItem(key, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div className={`mb-5 sm:mb-7 flex items-start gap-3 rounded-xl px-4 py-3 border-r-[3px] ${t.wrap}`}>
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${t.icon}`} strokeWidth={2} />
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-bold mb-0.5 ${t.head}`}>{title}</p>
        <p className="text-[12px] leading-relaxed text-text-secondary">{children}</p>
      </div>
      {dismissible && (
        <button
          onClick={close}
          aria-label="إغلاق الإعلان"
          className="p-1 rounded-full text-text-muted hover:text-text hover:bg-surface transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

/* إعلان إجباري بمنتصف الشاشة — للأخبار التي يجب ألا تفوت أحداً.
   يظهر مرة واحدة لكل مستخدم ثم يبقى البانر الهادئ تذكيراً حتى ينتهي `until`. */
export function AnnouncementModal({ id, title, kicker, points = [], until, children, cta = 'تمام، فهمت' }) {
  const key = `announcement_modal_${id}`
  const expired = until && new Date().toISOString().slice(0, 10) > until
  const [seen, setSeen] = useState(() => {
    try { return localStorage.getItem(key) === '1' } catch { return false }
  })
  const [visible, setVisible] = useState(false)

  // تأخير بسيط حتى تستقر الصفحة، فلا يقفز المودال في وجه المستخدم
  useEffect(() => {
    if (seen || expired) return
    const t = setTimeout(() => setVisible(true), 550)
    return () => clearTimeout(t)
  }, [seen, expired])

  const { mounted, leaving } = usePresence(visible, 300)

  // نُخفي فوراً ونترك usePresence يُبقيه مركّباً حتى تنتهي حركة الخروج.
  // تعليم "شوهد" هنا لا يزيله من الشاشة — الإزالة يحرسها mounted.
  const close = useCallback(() => {
    try { localStorage.setItem(key, '1') } catch { /* ignore */ }
    setSeen(true)
    setVisible(false)
  }, [key])

  useEffect(() => {
    if (!visible) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, close])

  if (!mounted) return null

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md ${leaving ? 'modal-overlay-out' : 'modal-overlay'}`}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`relative w-full max-w-[420px] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden ${leaving ? 'modal-content-out' : 'modal-content'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="إغلاق"
          className="absolute top-3 left-3 p-1.5 rounded-full text-text-muted hover:text-text hover:bg-surface-lighter transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-7 pt-9 pb-7 text-center">
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 mb-5">
            <span className="absolute inset-0 rounded-full border border-primary/25" />
            <Sparkles className="w-8 h-8 text-primary-dark" strokeWidth={1.5} />
          </div>

          {kicker && (
            <p className="text-[11px] font-bold text-primary-dark tracking-[0.14em] mb-2">{kicker}</p>
          )}
          <h2 className="text-[22px] font-black text-text leading-snug mb-2.5">{title}</h2>
          <p className="text-[13.5px] text-text-secondary leading-relaxed">{children}</p>

          {points.length > 0 && (
            <ul className="mt-5 flex flex-col gap-2.5 text-right">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[13px] text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" strokeWidth={2.2} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={close}
            className="mt-7 w-full rounded-full bg-primary hover:bg-primary-dark text-white text-[13.5px] font-bold py-3 transition-colors"
          >
            {cta}
          </button>
        </div>
      </div>
    </div>
  )
}
