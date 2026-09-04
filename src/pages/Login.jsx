import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, ArrowLeft, User, Lock, ScanLine, FileCheck2, Send } from 'lucide-react'

const FLOW = [
  { icon: ScanLine, label: 'صوّر الفاتورة' },
  { icon: FileCheck2, label: 'راجع وطابق' },
  { icon: Send, label: 'أرسلها لقيود' },
]

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(username.trim(), password)
    if (result.success) {
      navigate('/', { replace: true })
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Brand panel — deep pine (desktop only) */}
      <aside className="hidden lg:flex flex-col justify-between w-[42%] max-w-[560px] bg-[var(--sb-bg)] px-12 py-10 relative overflow-hidden">
        {/* Faint ruled lines — ledger texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 39px, rgba(255,255,255,0.045) 39px, rgba(255,255,255,0.045) 40px)',
          }}
        />

        <div className="relative flex items-center gap-3">
          <img src="/RASAD.png" alt="رصد" className="w-10 h-10 rounded-xl" />
          <div>
            <p className="text-base font-bold text-[var(--sb-text-strong)]">رصد</p>
            <p className="text-[10px] text-[var(--sb-muted)] tracking-[0.22em]">RASAD</p>
          </div>
        </div>

        <div className="relative">
          <h1 className="text-[34px] xl:text-[44px] font-black text-[var(--sb-text-strong)] leading-[1.3] mb-5">
            دفتر مشترياتك،
            <br />
            <span className="text-[var(--sb-accent)]">يكتب نفسه.</span>
          </h1>
          <p className="text-[14.5px] text-[var(--sb-text)] leading-loose max-w-sm mb-10">
            صوّر فاتورة المشتريات، ورصد يقرأها ويطابق بنودها ويسجّلها في قيود — بدون إدخال يدوي.
          </p>

          {/* Flow steps */}
          <div className="flex items-center gap-2">
            {FLOW.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--sb-border)] bg-white/[0.03]">
                  <s.icon className="w-4 h-4 text-[var(--sb-accent)]" strokeWidth={1.8} />
                  <span className="text-[12px] font-medium text-[var(--sb-text)]">{s.label}</span>
                </div>
                {i < FLOW.length - 1 && <span className="text-[var(--sb-muted)]">←</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-1.5">
          <p className="text-[9px] text-[var(--sb-muted)] whitespace-nowrap">صُنع بإتقان في <span className="text-[var(--sb-accent)]" style={{ fontFamily: 'Rikaz', fontFeatureSettings: '"salt", "ss01", "ss02", "ss03", "calt", "liga"', fontSize: '12px' }}>ركِـاز</span></p>
          <div className="h-px flex-1 bg-gradient-to-l from-[var(--sb-border)] to-transparent" />
        </div>
      </aside>

      {/* Form side — paper */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 relative">
        <div className="w-full max-w-[380px]">
          {/* Compact brand for mobile / tablet */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src="/RASAD.png" alt="رصد" className="w-20 h-20 mb-3" />
            <h1 className="text-2xl font-bold text-text tracking-tight">رصد</h1>
            <p className="text-[10px] text-text-muted mt-1 tracking-[0.22em]">RASAD</p>
          </div>

          <div className="bg-surface rounded-2xl border border-border p-7 sm:p-8 shadow-[0_1px_3px_rgba(23,32,26,0.05)]">
            <div className="mb-7">
              <h2 className="text-[17px] font-bold text-text">تسجيل الدخول</h2>
              <p className="text-[12.5px] text-text-muted mt-1">حيّاك الله، سجّل دخولك للمتابعة</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Username */}
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary mb-2">اسم المستخدم</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <User className={`w-4 h-4 transition-colors ${focused === 'user' ? 'text-primary' : 'text-text-muted'}`} strokeWidth={1.8} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocused('user')}
                    onBlur={() => setFocused(null)}
                    className="w-full bg-surface-light border border-border rounded-xl py-3 pr-10 pl-4 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/50 focus:bg-surface transition-all"
                    placeholder="Username"
                    autoComplete="username"
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary mb-2">كلمة المرور</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Lock className={`w-4 h-4 transition-colors ${focused === 'pass' ? 'text-primary' : 'text-text-muted'}`} strokeWidth={1.8} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused('pass')}
                    onBlur={() => setFocused(null)}
                    className="w-full bg-surface-light border border-border rounded-xl py-3 pr-10 pl-10 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/50 focus:bg-surface transition-all"
                    placeholder="Password"
                    autoComplete="current-password"
                    required
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-[12px] text-red-600 text-center">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username.trim() || !password}
                className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary-dark text-white font-semibold text-sm py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ArrowLeft className="w-4 h-4" />
                    <span>دخول</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="flex items-center justify-center gap-1.5 mt-6 text-[10.5px] text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            نظام داخلي خاص — للمستخدمين المصرح لهم فقط
          </p>
        </div>
      </main>
    </div>
  )
}
