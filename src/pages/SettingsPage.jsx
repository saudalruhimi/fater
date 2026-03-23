import {
  User, Building2, Bell, Shield, Palette, Globe, Save,
  Mail, Phone, MapPin, ChevronLeft, Check, Plug, RefreshCw,
  CheckCircle2, XCircle,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { testQoyodConnection, updateQoyodKey } from '../lib/api'
import { supabase } from '../lib/supabase'

// Helper: load or create settings row
async function loadSettings() {
  const { data } = await supabase.from('user_settings').select('*').limit(1).single()
  if (data) return data
  const { data: created } = await supabase.from('user_settings').insert({}).select().single()
  return created
}

async function saveSettings(updates) {
  const settings = await loadSettings()
  await supabase.from('user_settings').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', settings.id)
}

const TABS = [
  { key: 'integrations', label: 'الربط', icon: Plug },
  { key: 'profile', label: 'الملف الشخصي', icon: User },
  { key: 'company', label: 'بيانات الشركة', icon: Building2 },
  { key: 'notifications', label: 'الإشعارات', icon: Bell },
  { key: 'appearance', label: 'المظهر', icon: Palette },
]

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-primary' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all ${
          checked ? 'right-0.5' : 'right-[18px]'
        }`}
      />
    </button>
  )
}

function SectionCard({ title, description, children }) {
  return (
    <div className="bg-white rounded-2xl border border-border-light p-5 sm:p-6">
      <div className="mb-5">
        <h3 className="text-[14px] font-semibold text-text">{title}</h3>
        {description && <p className="text-[12px] text-text-muted mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function InputField({ label, icon: Icon, ...props }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-text mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />}
        <input
          className={`w-full bg-surface-light border border-border-light rounded-xl py-2.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors ${
            Icon ? 'pr-10 pl-3.5' : 'px-3.5'
          }`}
          {...props}
        />
      </div>
    </div>
  )
}

function IntegrationsTab() {
  const [status, setStatus] = useState('checking')
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState('')
  const [info, setInfo] = useState(null)
  const [showKey, setShowKey] = useState(false)
  const [editing, setEditing] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)

  const testConnection = async () => {
    setTesting(true)
    setStatus('checking')
    setTestError('')
    try {
      const result = await testQoyodConnection()
      setStatus(result.connected ? 'connected' : 'disconnected')
      if (result.connected) {
        setInfo(result)
      } else {
        setTestError(result.error || 'تعذر الاتصال بقيود. تحقق من مفتاح API.')
        setInfo(null)
      }
    } catch (err) {
      setStatus('disconnected')
      setTestError(err.message || 'حدث خطأ أثناء الاتصال')
      setInfo(null)
    } finally {
      setTesting(false)
    }
  }

  // Auto-test on mount
  useEffect(() => { testConnection() }, [])

  const statusConfig = {
    connected: { label: 'متصل', dot: 'bg-primary', bg: 'bg-primary-50', text: 'text-primary-dark', Icon: CheckCircle2 },
    disconnected: { label: 'غير متصل', dot: 'bg-red-400', bg: 'bg-red-50', text: 'text-red-700', Icon: XCircle },
    checking: { label: 'جارِ الفحص...', dot: 'bg-gray-300 animate-pulse', bg: 'bg-surface-lighter', text: 'text-text-muted', Icon: RefreshCw },
  }

  const s = statusConfig[status]

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-border-light overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 border-b border-border-light">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#1a1a2e] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-text">قيود</h3>
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              </div>
              <p className="text-[12px] text-text-muted mt-0.5">النظام المحاسبي — فواتير المشتريات</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={testConnection}
              disabled={testing}
              className="flex items-center gap-1.5 text-[12px] font-medium text-text-secondary border border-border-light hover:bg-surface-lighter px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} strokeWidth={1.8} />
              {testing ? 'جارِ الفحص...' : 'إعادة الفحص'}
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {testError && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-[13px]">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {testError}
            </div>
          )}

          {status === 'connected' && info && (
            <>
              <div className="bg-surface-light rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-text-muted">الحالة</span>
                  <span className="text-[13px] text-primary font-medium">متصل</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-text-muted">مفتاح API</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-mono text-text-muted">{showKey ? info.api_key_full : info.api_key_masked}</span>
                    <button onClick={() => setShowKey(!showKey)} className="text-[11px] text-primary hover:text-primary-dark transition-colors">
                      {showKey ? 'إخفاء' : 'إظهار'}
                    </button>
                    <button onClick={() => { setEditing(true); setNewKey(info.api_key_full || '') }} className="text-[11px] text-text-muted hover:text-text transition-colors">
                      تعديل
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-text-muted">عدد البنود</span>
                  <span className="text-[13px] text-text font-medium">{info.products_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-text-muted">عدد الموردين</span>
                  <span className="text-[13px] text-text font-medium">{info.vendors_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-text-muted">عدد المخازن</span>
                  <span className="text-[13px] text-text font-medium">{info.inventories_count}</span>
                </div>
              </div>

              {/* Edit API Key */}
              {editing && (
                <div className="bg-surface-light rounded-xl p-4 space-y-3 border border-primary/20">
                  <label className="block text-[13px] font-medium text-text">تعديل مفتاح API</label>
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="أدخل المفتاح الجديد"
                    className="w-full bg-white border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text font-mono focus:outline-none focus:border-primary/50"
                    dir="ltr"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!newKey.trim()) return
                        setSaving(true)
                        try {
                          await updateQoyodKey(newKey.trim())
                          setEditing(false)
                          setNewKey('')
                          await testConnection()
                        } catch (e) {
                          setTestError(e.message)
                        } finally {
                          setSaving(false)
                        }
                      }}
                      disabled={saving || !newKey.trim()}
                      className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-semibold text-[13px] py-2 px-4 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      {saving ? 'جارِ الحفظ...' : 'حفظ'}
                    </button>
                    <button
                      onClick={() => { setEditing(false); setNewKey('') }}
                      className="text-[13px] text-text-secondary px-4 py-2 rounded-xl border border-border-light hover:bg-surface-lighter transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              <div className="border-t border-border-light/60 pt-5">
                <h4 className="text-[13px] font-semibold text-text mb-3">ما يتم مزامنته</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'فواتير المشتريات', desc: 'تسجيل كفواتير مشتريات' },
                    { label: 'بيانات الموردين', desc: 'مطابقة الموردين تلقائياً' },
                    { label: 'أصناف المنتجات', desc: 'ربط البنود بالأصناف' },
                    { label: 'قاموس المطابقة', desc: 'حفظ المطابقات للمستقبل' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-2.5 p-3 rounded-xl border border-primary/20 bg-primary-50/30">
                      <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 bg-primary">
                        <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-text">{item.label}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {status === 'disconnected' && !testing && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <XCircle className="w-8 h-8 text-red-300 mx-auto mb-3" />
                <p className="text-sm text-text-muted">غير متصل بقيود</p>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-text mb-1.5">أدخل مفتاح API</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="أدخل مفتاح API من قيود"
                  className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 px-3.5 text-sm text-text font-mono placeholder-text-muted focus:outline-none focus:border-primary/50"
                  dir="ltr"
                />
                <p className="text-[11px] text-text-muted mt-1.5">تجده في قيود ← الإعدادات ← التكاملات ← مفتاح API</p>
              </div>
              <button
                onClick={async () => {
                  if (!newKey.trim()) return
                  setSaving(true)
                  try {
                    await updateQoyodKey(newKey.trim())
                    setNewKey('')
                    await testConnection()
                  } catch (e) {
                    setTestError(e.message)
                  } finally {
                    setSaving(false)
                  }
                }}
                disabled={saving || !newKey.trim()}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-[13px] py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
                {saving ? 'جارِ الربط...' : 'ربط بقيود'}
              </button>
            </div>
          )}

          {status === 'checking' && (
            <div className="text-center py-6">
              <RefreshCw className="w-6 h-6 text-text-muted animate-spin mx-auto mb-3" />
              <p className="text-sm text-text-muted">جارِ فحص الاتصال...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileTab() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '' })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings().then((s) => {
      if (s) setForm({ name: s.profile_name || '', email: s.profile_email || '', phone: s.profile_phone || '', role: s.profile_role || '' })
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    await saveSettings({ profile_name: form.name, profile_email: form.email, profile_phone: form.phone, profile_role: form.role })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-primary animate-spin" /></div>

  return (
    <div className="space-y-5">
      <SectionCard title="المعلومات الشخصية" description="بيانات حسابك الأساسية">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center text-xl font-bold text-primary">
            {form.name.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-sm font-semibold text-text">{form.name || 'المستخدم'}</p>
            <p className="text-[12px] text-text-muted">{form.role || 'غير محدد'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField label="الاسم" icon={User} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <InputField label="البريد الإلكتروني" icon={Mail} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <InputField label="رقم الجوال" icon={Phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <InputField label="الدور" icon={Shield} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </div>
      </SectionCard>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 font-semibold text-[13px] py-2.5 px-6 rounded-xl transition-all ${
            saved
              ? 'bg-primary-50 text-primary'
              : 'bg-primary hover:bg-primary-dark text-white'
          }`}
        >
          {saved ? <Check className="w-4 h-4" strokeWidth={2.2} /> : <Save className="w-4 h-4" strokeWidth={2} />}
          {saved ? 'تم الحفظ' : 'حفظ التغييرات'}
        </button>
      </div>
    </div>
  )
}

function CompanyTab() {
  const [form, setForm] = useState({ companyName: '', cr: '', vat: '', city: '', address: '' })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings().then((s) => {
      if (s) setForm({ companyName: s.company_name || '', cr: s.company_cr || '', vat: s.company_vat || '', city: s.company_city || '', address: s.company_address || '' })
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    await saveSettings({ company_name: form.companyName, company_cr: form.cr, company_vat: form.vat, company_city: form.city, company_address: form.address })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-primary animate-spin" /></div>

  return (
    <div className="space-y-5">
      <SectionCard title="بيانات الشركة" description="تُستخدم في مطابقة الفواتير والتقارير">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <InputField label="اسم الشركة" icon={Building2} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </div>
          <InputField label="السجل التجاري" value={form.cr} onChange={(e) => setForm({ ...form, cr: e.target.value })} />
          <InputField label="الرقم الضريبي" value={form.vat} onChange={(e) => setForm({ ...form, vat: e.target.value })} />
          <InputField label="المدينة" icon={MapPin} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <InputField label="العنوان" icon={Globe} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 font-semibold text-[13px] py-2.5 px-6 rounded-xl transition-all ${
            saved ? 'bg-primary-50 text-primary' : 'bg-primary hover:bg-primary-dark text-white'
          }`}
        >
          {saved ? <Check className="w-4 h-4" strokeWidth={2.2} /> : <Save className="w-4 h-4" strokeWidth={2} />}
          {saved ? 'تم الحفظ' : 'حفظ التغييرات'}
        </button>
      </div>
    </div>
  )
}

function NotificationsTab() {
  const [settings, setSettings] = useState({
    emailOnSuccess: true,
    emailOnFail: true,
    emailDigest: false,
    browserNotif: true,
    soundNotif: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings().then((s) => {
      if (s) setSettings({
        emailOnSuccess: s.notif_email_success ?? true,
        emailOnFail: s.notif_email_fail ?? true,
        emailDigest: s.notif_email_digest ?? false,
        browserNotif: s.notif_browser ?? true,
        soundNotif: s.notif_sound ?? false,
      })
    }).finally(() => setLoading(false))
  }, [])

  const update = (key) => {
    const newVal = !settings[key]
    setSettings((s) => ({ ...s, [key]: newVal }))
    const dbKey = { emailOnSuccess: 'notif_email_success', emailOnFail: 'notif_email_fail', emailDigest: 'notif_email_digest', browserNotif: 'notif_browser', soundNotif: 'notif_sound' }[key]
    if (dbKey) saveSettings({ [dbKey]: newVal })
  }

  if (loading) return <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-primary animate-spin" /></div>

  const groups = [
    {
      title: 'البريد الإلكتروني',
      items: [
        { key: 'emailOnSuccess', label: 'إشعار عند نجاح المعالجة', desc: 'يرسل بريد عند اكتمال معالجة الفاتورة' },
        { key: 'emailOnFail', label: 'إشعار عند فشل المعالجة', desc: 'تنبيه فوري عند فشل قراءة فاتورة' },
        { key: 'emailDigest', label: 'ملخص يومي', desc: 'تقرير يومي بجميع العمليات' },
      ],
    },
    {
      title: 'المتصفح',
      items: [
        { key: 'browserNotif', label: 'إشعارات المتصفح', desc: 'تنبيهات فورية في المتصفح' },
        { key: 'soundNotif', label: 'صوت الإشعارات', desc: 'تشغيل صوت عند وصول إشعار' },
      ],
    },
  ]

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <SectionCard key={group.title} title={group.title}>
          <div className="space-y-0">
            {group.items.map((item, i) => (
              <div
                key={item.key}
                className={`flex items-center justify-between gap-4 py-3.5 ${
                  i !== group.items.length - 1 ? 'border-b border-border-light/60' : ''
                }`}
              >
                <div>
                  <p className="text-[13px] font-medium text-text">{item.label}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">{item.desc}</p>
                </div>
                <Toggle checked={settings[item.key]} onChange={() => update(item.key)} />
              </div>
            ))}
          </div>
        </SectionCard>
      ))}
    </div>
  )
}

function AppearanceTab() {
  const [lang, setLang] = useState('ar')
  const [density, setDensity] = useState('comfortable')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings().then((s) => {
      if (s) {
        setLang(s.appearance_lang || 'ar')
        setDensity(s.appearance_density || 'comfortable')
      }
    }).finally(() => setLoading(false))
  }, [])

  const densityOptions = [
    { key: 'compact', label: 'مضغوط' },
    { key: 'comfortable', label: 'مريح' },
    { key: 'spacious', label: 'واسع' },
  ]

  return (
    <div className="space-y-5">
      <SectionCard title="اللغة">
        <div className="flex gap-3">
          {[{ key: 'ar', label: 'العربية', flag: '🇸🇦' }, { key: 'en', label: 'English', flag: '🇺🇸' }].map((l) => (
            <button
              key={l.key}
              onClick={() => { setLang(l.key); saveSettings({ appearance_lang: l.key }) }}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-[13px] font-medium transition-all flex-1 sm:flex-none ${
                lang === l.key
                  ? 'border-primary bg-primary-50 text-primary-dark'
                  : 'border-border-light text-text-secondary hover:bg-surface-lighter'
              }`}
            >
              <span className="text-lg">{l.flag}</span>
              {l.label}
              {lang === l.key && <Check className="w-4 h-4 text-primary mr-auto" strokeWidth={2.2} />}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="كثافة العرض" description="تحكم في المسافات بين العناصر">
        <div className="flex gap-2">
          {densityOptions.map((d) => (
            <button
              key={d.key}
              onClick={() => { setDensity(d.key); saveSettings({ appearance_density: d.key }) }}
              className={`px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                density === d.key
                  ? 'bg-primary-50 text-primary-dark border border-primary/20'
                  : 'bg-surface-light text-text-secondary border border-transparent hover:bg-surface-lighter'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="منطقة الخطر">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-red-50/50 rounded-xl border border-red-100">
          <div>
            <p className="text-[13px] font-medium text-red-700">حذف جميع البيانات</p>
            <p className="text-[11px] text-red-400 mt-0.5">سيتم حذف جميع الفواتير والسجلات والمطابقات نهائياً</p>
          </div>
          <button
            onClick={async () => {
              if (!confirm('هل أنت متأكد؟ سيتم حذف جميع الفواتير والسجلات والمطابقات نهائياً. لا يمكن التراجع.')) return
              await supabase.from('processed_invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000')
              await supabase.from('item_mappings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
              alert('تم حذف جميع البيانات')
              window.location.reload()
            }}
            className="text-[13px] font-medium text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors whitespace-nowrap"
          >
            حذف الكل
          </button>
        </div>
      </SectionCard>
    </div>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('integrations')

  const ActiveComponent = {
    integrations: IntegrationsTab,
    profile: ProfileTab,
    company: CompanyTab,
    notifications: NotificationsTab,
    appearance: AppearanceTab,
  }[activeTab]

  return (
    <div className="max-w-5xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-lg sm:text-xl font-bold text-text">الإعدادات</h1>
        <p className="text-xs sm:text-sm text-text-muted mt-1">إدارة حسابك وتفضيلات النظام</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Side tabs — horizontal on mobile, vertical on desktop */}
        <div className="lg:w-48 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 bg-white lg:bg-white rounded-2xl lg:border border-border-light lg:p-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all ${
                  activeTab === t.key
                    ? 'bg-primary-50 text-primary-dark'
                    : 'text-text-secondary hover:bg-surface-lighter hover:text-text'
                }`}
              >
                <t.icon className={`w-[18px] h-[18px] ${activeTab === t.key ? 'text-primary' : ''}`} strokeWidth={activeTab === t.key ? 2 : 1.6} />
                <span>{t.label}</span>
                {activeTab === t.key && <ChevronLeft className="w-3.5 h-3.5 text-primary mr-auto hidden lg:block" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <ActiveComponent />
        </div>
      </div>
    </div>
  )
}
