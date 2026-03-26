import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, ArrowLeft, Shield, User, Lock } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      const result = login(username.trim(), password)
      if (result.success) {
        navigate('/', { replace: true })
      } else {
        setError(result.error)
      }
      setLoading(false)
    }, 400)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: '#FAFBFC' }}>
      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(16,185,129,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.07) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Glow behind card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%)',
      }} />

      <div className="w-full max-w-[380px] relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-20" style={{ background: '#10B981' }} />
            <img src="/RASAD.png" alt="رصد" className="w-28 h-28 relative drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-bold text-[#065F46] tracking-tight">رصد</h1>
          <p className="text-xs text-[#9CA3AF] mt-1 tracking-[0.2em] uppercase">RASAD</p>
        </div>

        {/* Security badge */}
        <div className="flex justify-center mb-6">
          <span className="text-[10px] text-[#065F46] px-4 py-1.5 rounded-full border border-[#10B981]/15 flex items-center gap-1.5 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            نظام داخلي خاص — للمستخدمين المصرح لهم فقط
          </span>
        </div>

        {/* Form Card */}
        <div className="relative group">
          {/* Card border glow on hover */}
          <div className="absolute -inset-[1px] rounded-[20px] bg-gradient-to-b from-[#10B981]/20 via-transparent to-[#10B981]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative bg-white/80 backdrop-blur-xl rounded-[20px] border border-[#E5E7EB]/80 p-8 shadow-[0_8px_40px_rgba(0,0,0,0.04)]">
            {/* Header with icon */}
            <div className="flex items-center justify-center gap-2 mb-7">
              <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#10B981]" strokeWidth={1.8} />
              </div>
              <h2 className="text-[15px] font-bold text-[#1F2937]">تسجيل الدخول</h2>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Username */}
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-2">اسم المستخدم</label>
                <div className={`relative rounded-xl transition-all duration-200 ${focused === 'user' ? 'ring-2 ring-[#10B981]/15' : ''}`}>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <User className={`w-4 h-4 transition-colors ${focused === 'user' ? 'text-[#10B981]' : 'text-[#D1D5DB]'}`} strokeWidth={1.8} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocused('user')}
                    onBlur={() => setFocused(null)}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl py-3 pr-10 pl-4 text-sm text-[#1F2937] placeholder-[#C4C9D2] focus:outline-none focus:border-[#10B981]/40 focus:bg-white transition-all"
                    placeholder="Username"
                    autoComplete="username"
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-2">كلمة المرور</label>
                <div className={`relative rounded-xl transition-all duration-200 ${focused === 'pass' ? 'ring-2 ring-[#10B981]/15' : ''}`}>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Lock className={`w-4 h-4 transition-colors ${focused === 'pass' ? 'text-[#10B981]' : 'text-[#D1D5DB]'}`} strokeWidth={1.8} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused('pass')}
                    onBlur={() => setFocused(null)}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl py-3 pr-10 pl-10 text-sm text-[#1F2937] placeholder-[#C4C9D2] focus:outline-none focus:border-[#10B981]/40 focus:bg-white transition-all"
                    placeholder="Password"
                    autoComplete="current-password"
                    required
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C4C9D2] hover:text-[#6B7280] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50/80 border border-red-200/60 rounded-xl px-4 py-2.5 text-[12px] text-red-600 text-center backdrop-blur-sm">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username.trim() || !password}
                className="group/btn relative flex items-center justify-center gap-2 w-full text-white font-semibold text-sm py-3.5 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed mt-1 overflow-hidden"
                style={{ background: loading ? '#059669' : '#10B981' }}
                onMouseEnter={(e) => !loading && (e.target.style.background = '#059669')}
                onMouseLeave={(e) => !loading && (e.target.style.background = '#10B981')}
              >
                <div className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
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
        </div>

        <div className="text-center mt-10 space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-l from-[#10B981]/15 to-transparent" />
            <p className="text-[9px] text-[#C4C9D2] whitespace-nowrap">صُنع بإتقان في <span className="text-[#065F46]" style={{ fontFamily: 'Rikaz', fontFeatureSettings: '"salt", "ss01", "ss02", "ss03", "calt", "liga"', fontSize: '12px', textShadow: '0 0 8px rgba(16,185,129,0.3)' }}>ركِـاز</span></p>
            <div className="h-px w-12 bg-gradient-to-r from-[#10B981]/15 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  )
}
