import { Sparkles, Plus, Wrench, Zap, Bug, Megaphone, Search, FileText, BarChart3, BellRing, ScanLine, FileCheck2, Bookmark, Type, Filter as FilterIcon, Hash, Calendar, ListFilter, EyeOff, Trash2, Lock, Shield, UserCog, Palette, Activity, Database, MessageCircle, Network, Sliders, X, Pencil, Info, Moon } from 'lucide-react'
import { useState, useMemo } from 'react'

const TYPES = {
  feature: { label: 'ميزة جديدة', icon: Sparkles, badge: 'bg-emerald-500 text-white', tint: 'bg-emerald-50', accent: 'text-emerald-700', dot: 'bg-emerald-500' },
  improvement: { label: 'تحسين', icon: Zap, badge: 'bg-blue-500 text-white', tint: 'bg-blue-50', accent: 'text-blue-700', dot: 'bg-blue-500' },
  fix: { label: 'إصلاح', icon: Bug, badge: 'bg-amber-500 text-white', tint: 'bg-amber-50', accent: 'text-amber-700', dot: 'bg-amber-500' },
  add: { label: 'إضافة', icon: Plus, badge: 'bg-violet-500 text-white', tint: 'bg-violet-50', accent: 'text-violet-700', dot: 'bg-violet-500' },
  maintenance: { label: 'صيانة', icon: Wrench, badge: 'bg-slate-500 text-white', tint: 'bg-slate-50', accent: 'text-slate-700', dot: 'bg-slate-500' },
}

const FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'feature', label: 'ميزات' },
  { id: 'improvement', label: 'تحسينات' },
  { id: 'add', label: 'إضافات' },
  { id: 'fix', label: 'إصلاحات' },
]

const UPDATES = [
  {
    version: 'v1.3.0',
    date: '2026-04-26',
    title: 'تحسينات الإدخال والفلترة والإشعارات',
    summary: 'تحديث ضخم يركز على تسريع إدخال الفواتير، تحسين العرض، وراحة المستخدم. أضفنا نمط الإدخال اليدوي للفواتير اللي ما تحتاج ذكاء اصطناعي مع نظام قوالب سريعة، فلترة متقدمة وتقسيم صفحات في الفواتير، فلترة الإشعارات بالنوع، صفحة "تحديثات النظام" اللي تشوفها الآن، نظام إشعارات Toast ذكي يترجم الأخطاء التقنية لرسائل عربية واضحة، وأخيراً الوضع الليلي بزر بسيط في الهيدر مع باليت ألوان مدروسة لراحة العين.',
    items: [
      { type: 'feature', icon: Pencil, text: 'نمط الإدخال اليدوي للفواتير', description: 'تقدر تختار بين الإدخال عبر الذكاء الاصطناعي (صورة + قراءة آلية) أو الإدخال اليدوي بدون استخدام أي ذكاء اصطناعي. مفيد للفواتير الإلكترونية اللي عندك بياناتها جاهزة، أو لما تبي إدخال سريع ودقيق 100%.' },
      { type: 'feature', icon: Bookmark, text: 'القوالب السريعة', description: 'احفظ أي فاتورة كقالب جاهز بزر "حفظ كقالب"، وارجع تستخدمها لاحقاً بضغطة واحدة. مثلاً: فاتورة شهرية لمورد ثابت — تختار القالب فيتعبأ المورد والبنود والكميات والأسعار تلقائياً، ما يبقى عليك إلا الإرسال.' },
      { type: 'feature', icon: Hash, text: 'ترقيم تلقائي لرقم الفاتورة', description: 'أرقام الفواتير اليدوية تتولّد تلقائياً بالتسلسل (BILL268، BILL269، BILL270…) — يبدأ من الرقم اللي تختاره، ويزيد بعد كل إرسال ناجح. تقدر تعدّله يدوياً لو تبي رقم محدد.' },
      { type: 'improvement', icon: Calendar, text: 'تعبئة تلقائية للتواريخ', description: 'تاريخ الفاتورة وتاريخ الاستحقاق يتعبأن بتاريخ اليوم تلقائياً عند البدء بفاتورة يدوية جديدة، عشان توفر وقت الكتابة المتكرر.' },
      { type: 'feature', icon: Sliders, text: 'فلترة متقدمة في الفواتير', description: 'لوحة فلترة تفصيلية بصفحة الفواتير تخليك تبحث بدقة: نطاق تاريخ من-إلى، رقم فاتورة محدد، اسم مورد، وحد أدنى/أعلى للمبلغ. كل فلتر فعال يظهر بعداد بزر الفلترة، وتقدر تمسحها كلها بضغطة.' },
      { type: 'feature', icon: ListFilter, text: 'تقسيم الصفحات', description: 'بدل ما تتمرر بقائمة طويلة، اختر عدد الفواتير بالصفحة (10، 15، 20، أو 30) وتنقل بين الصفحات بأزرار "السابق" و"التالي" مع عرض رقم الصفحة الحالية والإجمالي.' },
      { type: 'add', icon: FileText, text: 'صفحة الفواتير لمستخدمي الرفع', description: 'مستخدمو رفع الفواتير يقدرون يشوفون كل الفواتير المرفوعة وحالتها، بدل ما تكون مقتصرة على المدير فقط.' },
      { type: 'feature', icon: BellRing, text: 'فلترة الإشعارات حسب النوع', description: 'بأعلى لوحة الإشعارات في تبويبات: الكل / الإرسال (الفواتير اللي ترسلت لقيود) / القراءة (الفواتير اللي تم قراءتها أو مطابقتها). اختيارك يحفظ تلقائياً.' },
      { type: 'feature', icon: Trash2, text: 'مسح كل الإشعارات', description: 'زر "مسح" بأعلى لوحة الإشعارات يخفي كل الإشعارات الحالية بضغطة واحدة، ويبقى يعرضلك الجديدة فقط. الإشعارات المخفية ما تنحذف من قاعدة البيانات.' },
      { type: 'improvement', icon: EyeOff, text: 'حفظ تفضيلات الفلترة', description: 'تفضيلاتك في الفلترة (نوع الإشعار المختار، الإشعارات الممسوحة) تنحفظ محلياً على المتصفح، فترجع للوضع نفسه لما تفتح الموقع مرة ثانية.' },
      { type: 'add', icon: Megaphone, text: 'صفحة "تحديثات النظام"', description: 'صفحة جديدة تعرض كل التحديثات والميزات اللي ضافت للنظام بترتيب زمني. زر بأعلى الصفحة (بجانب الإشعارات) ينقلك لها، وفيه نقطة خضراء تظهر لما يكون فيه تحديث جديد ما قريته بعد.' },
      { type: 'fix', icon: Hash, text: 'تحسين حقل الكمية والسعر', description: 'حقول الكمية والسعر صارت تقبل الأعداد العشرية بدقة كاملة (45.4523، 11.5، إلخ)، وتقبل الفاصلة بدل النقطة وتحولها تلقائياً. كانت قبل ترجع للصفر لما تكتب "45." أو ترفض الفواصل — الآن تستنى تكمل الكتابة بدون مشاكل.' },
      { type: 'feature', icon: Moon, text: 'الوضع الليلي', description: 'زر بالهيدر بجانب تحديثات النظام يخليك تبدّل بين الوضع النهاري والوضع الليلي بضغطة واحدة (مع رسم متحرك لطيف للأيقونة). الباليت مدروسة بدقة: خلفية رمادي دافئ #1A1A1A، بطاقات أعلى منها بدرجة، ونصوص بتباين AAA يريح العين. الاختيار يحفظ محلياً ويطبّق تلقائياً على كل صفحات النظام في الجلسات الجاية.' },
      { type: 'feature', icon: Sparkles, text: 'نظام إشعارات Toast ذكي', description: 'كل العمليات صارت تعطيك تنبيه واضح بأسفل الشاشة — أخضر للنجاح، أحمر للأخطاء، أصفر للتحذيرات (مثل "فاتورة مكررة")، أزرق للمعلومات. النظام يترجم الأخطاء التقنية لرسائل عربية مفهومة: بدل "Failed to fetch" يظهرلك "فشل الاتصال — تأكد من الإنترنت"، وبدل "401" يظهرلك "مفتاح API غير صالح".' },
    ],
  },
  {
    version: 'v1.2.0',
    date: '2026-04-22',
    title: 'نظام تسجيل الدخول والصلاحيات',
    summary: 'إضافة طبقة الأمان الأساسية للنظام. صار يدعم مستخدمين متعددين بصلاحيات مختلفة — مدير عنده وصول كامل، ومستخدم رفع صلاحياته محدودة. كل مستخدم له إعداداته الشخصية المنفصلة، فما تختلط بياناتك مع أحد ثاني.',
    items: [
      { type: 'feature', icon: Shield, text: 'نظام مستخدمين بصلاحيات', description: 'النظام صار يدعم مستخدمين متعددين بصلاحيات مختلفة: مدير (saud) عنده صلاحية كاملة، ومستخدم رفع (users) صلاحياته محدودة على رفع الفواتير وعرضها وإدارة الموردين والبنود فقط.' },
      { type: 'improvement', icon: UserCog, text: 'إعدادات شخصية منفصلة', description: 'كل مستخدم له إعدادات خاصة (الاسم، الرقم، الإيميل، المنصب) منفصلة عن الباقين — ما يعرض بياناتك بحساب غيرك.' },
    ],
  },
  {
    version: 'v1.1.0',
    date: '2026-04-20',
    title: 'تحسينات التصميم والتجربة',
    summary: 'إضافة طبقة من الحركات والتفاعلات السلسة على كل الصفحات. الانتقالات والبطاقات والأزرار صارت أكثر استجابة وأقل احتكاك، بدون ما تشتت التركيز عن الوظيفة الأساسية.',
    items: [
      { type: 'feature', icon: Sparkles, text: 'حركات وتفاعلات متقدمة', description: 'حركات سلسة عند الانتقال بين الصفحات، تفاعلات على البطاقات والأزرار، ومؤثرات بصرية خفيفة تخلي التجربة أكثر سلاسة من غير ما تشتت.' },
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-04-15',
    title: 'الإطلاق الأولي',
    summary: 'إصدار البداية. الفكرة الأساسية: صور الفاتورة الورقية بالجوال، الذكاء الاصطناعي يقرأها بـ Gemini Vision، النظام يطابق البنود مع قيود، وترسلها بضغطة زر. أول إصدار يحتوي قراءة الفواتير، المطابقة الذكية بأربع مستويات، الإرسال المباشر لقيود، وقاموس مطابقة يتعلم تلقائياً من اختياراتك.',
    items: [
      { type: 'feature', icon: ScanLine, text: 'قراءة الفواتير من الصور', description: 'باستخدام Gemini Vision: تصور الفاتورة الورقية بالجوال، ترفعها للنظام، والذكاء الاصطناعي يستخرج كل بياناتها (المورد، التاريخ، رقم الفاتورة، البنود، الكميات، الأسعار، الضريبة) خلال ثواني.' },
      { type: 'feature', icon: Network, text: 'مطابقة ذكية للموردين والبنود', description: 'بدل ما تختار كل بند يدوياً، النظام يطابق تلقائياً اسم البند بالفاتورة مع البنود المسجلة بقيود — أربع مستويات: قاموس محفوظ → تطابق تقريبي → بحث بالبنود → اقتراح بالذكاء الاصطناعي.' },
      { type: 'feature', icon: FileCheck2, text: 'إرسال الفواتير لقيود مباشرة', description: 'بعد ما تراجع البيانات وتطابق البنود، اضغط زر واحد فيتم إنشاء فاتورة المشتريات بقيود تلقائياً مع الضريبة والحسابات الصحيحة، وتتسجل بحالة "موافق عليها" جاهزة للدفع.' },
      { type: 'feature', icon: Database, text: 'قاموس مطابقة قابل للتعلم', description: 'كل ما تطابق بند يدوياً مع بند بقيود، النظام يحفظها بالقاموس. المرة الجاية لما يجي نفس البند من نفس المورد، يطابقه تلقائياً بدون ما تتدخل.' },
    ],
  },
]

const LATEST_DATE = UPDATES[0].date

export default function Updates() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [summaryOpen, setSummaryOpen] = useState(null)

  const filteredVersions = useMemo(() => {
    const q = search.trim().toLowerCase()
    return UPDATES.map(u => ({
      ...u,
      items: u.items.filter(it => {
        if (filter !== 'all' && it.type !== filter) return false
        if (q && !it.text.toLowerCase().includes(q) && !(it.description || '').toLowerCase().includes(q)) return false
        return true
      }),
    })).filter(u => u.items.length > 0)
  }, [filter, search])

  const counts = useMemo(() => {
    const all = UPDATES.flatMap(u => u.items)
    const c = { all: all.length }
    for (const t of Object.keys(TYPES)) c[t] = all.filter(i => i.type === t).length
    return c
  }, [])

  return (
    <div className="max-w-6xl animate-page">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-50 via-emerald-50/50 to-teal-50 border border-primary/10 px-6 sm:px-10 py-8 sm:py-10 mb-6">
        {/* Decorative dots pattern */}
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        <div className="relative">
          <div className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-semibold text-primary-dark mb-3">
            <Megaphone className="w-3 h-3" strokeWidth={2.2} />
            <span>سجل التحديثات</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text mb-2">
            ما الجديد في <span className="text-primary-dark">رصد</span>
          </h1>
          <p className="text-[13px] sm:text-sm text-text-muted max-w-xl leading-relaxed">
            اكتشف كل ميزة جديدة، تحسين، وإصلاح أضفناه ليوم في تحسين تجربتك. نضيف هنا كل تحديث جديد بمجرد إطلاقه.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-border-light p-3 sm:p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.6} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في التحديثات..."
              className="w-full bg-surface-light border border-border-light rounded-xl py-2.5 pr-10 pl-3.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary/40 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-muted hover:text-red-500">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {FILTERS.map(f => {
              const active = filter === f.id
              const count = counts[f.id] || 0
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium whitespace-nowrap transition-colors ${
                    active ? 'bg-primary text-white' : 'bg-surface-light text-text-muted hover:bg-surface-lighter'
                  }`}
                >
                  {f.label}
                  <span className={`text-[10px] min-w-[20px] h-[18px] rounded-full flex items-center justify-center px-1 ${
                    active ? 'bg-white/20 text-white' : 'bg-white text-text-muted'
                  }`}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Versions */}
      {filteredVersions.length > 0 ? (
        <div className="space-y-8">
          {filteredVersions.map((version) => {
            const isLatest = version.date === LATEST_DATE
            return (
              <section key={version.version}>
                {/* Version header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1 bg-white rounded-xl border border-border-light px-2 py-1">
                    <span className={`w-2 h-2 rounded-full mr-1 ${isLatest ? 'bg-primary animate-pulse' : 'bg-text-muted/40'}`} />
                    <span className="text-[12px] font-mono font-bold text-primary-dark px-1">{version.version}</span>
                    {version.summary && (
                      <button
                        onClick={() => setSummaryOpen(version.version)}
                        title="عرض ملخص التحديث"
                        className="p-1 rounded-md text-primary hover:bg-primary-50 transition-colors"
                      >
                        <Info className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-text truncate">{version.title}</h2>
                    <p className="text-[11px] text-text-muted">{version.date} · {version.items.length} {version.items.length === 1 ? 'تحديث' : 'تحديثات'}</p>
                  </div>
                  {isLatest && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-white font-semibold flex-shrink-0">
                      الأحدث
                    </span>
                  )}
                  <div className="hidden sm:block flex-1 h-px bg-gradient-to-l from-border-light to-transparent" />
                </div>

                {/* Items grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {version.items.map((item, idx) => {
                    const t = TYPES[item.type] || TYPES.improvement
                    const Icon = t.icon
                    const ItemIcon = item.icon || Icon
                    return (
                      <div key={`${version.version}-${idx}`}
                        className="group bg-white rounded-2xl border border-border-light overflow-hidden card-hover hover:border-primary/20 transition-all">
                        {/* Visual top section */}
                        <div className={`relative h-32 ${t.tint} flex items-center justify-center overflow-hidden`}>
                          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
                            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                          }} />
                          <div className="relative w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ItemIcon className={`w-7 h-7 ${t.accent}`} strokeWidth={1.6} />
                          </div>
                          <div className={`absolute top-3 left-3 ${t.badge} text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm`}>
                            {t.label}
                          </div>
                          {isLatest && (
                            <div className="absolute top-3 right-3 bg-white text-primary-dark text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                              جديد
                            </div>
                          )}
                        </div>

                        <div className="p-4 sm:p-5">
                          <h3 className="text-[14px] font-bold text-text leading-snug mb-2">{item.text}</h3>
                          {item.description && (
                            <p className="text-[12px] text-text-muted leading-relaxed line-clamp-4">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-light py-16 flex flex-col items-center">
          <FilterIcon className="w-8 h-8 text-text-muted/30 mb-3" />
          <p className="text-sm text-text-muted">لا توجد تحديثات تطابق البحث</p>
        </div>
      )}

      <div className="mt-8 text-center text-[11px] text-text-muted/60">
        صُنع بإتقان في <span className="text-[#065F46]" style={{ fontFamily: 'Rikaz', fontFeatureSettings: '"salt", "ss01", "ss02", "ss03", "calt", "liga"', fontSize: '14px', textShadow: '0 0 8px rgba(16,185,129,0.3)' }}>ركِـاز</span>
      </div>

      {/* Summary Modal */}
      {summaryOpen && (() => {
        const v = UPDATES.find(u => u.version === summaryOpen)
        if (!v) return null
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-overlay"
            onClick={() => setSummaryOpen(null)}>
            <div className="relative bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl modal-content"
              onClick={e => e.stopPropagation()}>
              {/* Header with gradient */}
              <div className="relative bg-gradient-to-br from-primary-50 via-emerald-50/60 to-teal-50 px-6 py-5 border-b border-border-light">
                <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
                  backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.15) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }} />
                <button onClick={() => setSummaryOpen(null)}
                  className="absolute top-3 left-3 p-1.5 rounded-lg text-text-muted hover:bg-white/60 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <div className="relative flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                    <Info className="w-5 h-5 text-primary" strokeWidth={1.6} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono font-bold text-primary-dark bg-white/80 px-2 py-0.5 rounded">{v.version}</span>
                      <span className="text-[11px] text-text-muted">{v.date}</span>
                    </div>
                    <h3 className="text-base font-bold text-text leading-snug">{v.title}</h3>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
                <p className="text-[13px] text-text leading-loose">
                  {v.summary}
                </p>

                <div className="mt-5 pt-4 border-t border-border-light/60">
                  <p className="text-[11px] text-text-muted mb-2">يحتوي هذا التحديث على:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(
                      v.items.reduce((acc, it) => { acc[it.type] = (acc[it.type] || 0) + 1; return acc }, {})
                    ).map(([type, count]) => {
                      const t = TYPES[type] || TYPES.improvement
                      return (
                        <span key={type} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${t.tint} ${t.accent}`}>
                          {count} {t.label}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
