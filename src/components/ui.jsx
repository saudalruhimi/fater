import { X, AlertTriangle, Loader2 } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   لغة «الدفتر المطبوع» — عناصر مشتركة لكل الصفحات
   عناوين تحريرية بمسطرة مزدوجة، أزرار Pill، شرائح جانبية للنماذج
   ───────────────────────────────────────────────────────────── */

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
