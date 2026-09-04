import { Sparkles, Plus, Wrench, Zap, Bug, Megaphone, Search, FileText, BarChart3, BellRing, ScanLine, FileCheck2, Bookmark, Type, Filter as FilterIcon, Hash, Calendar, ListFilter, EyeOff, Trash2, Lock, Shield, UserCog, Palette, Activity, Database, MessageCircle, Network, Sliders, X, Pencil, Info, Moon, ChevronLeft, ChevronRight, Share2, Link as LinkIcon, Layers, Send, Percent, Calculator, Package, LayoutGrid, Target, Newspaper, ArrowLeftRight, CreditCard, Wallet, History } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'

const TYPES = {
  feature: { label: 'ميزة جديدة', icon: Sparkles, color: '#10B981', bg: 'rgba(16,185,129,0.10)', accent: 'text-primary-dark' },
  improvement: { label: 'تحسين', icon: Zap, color: '#3B82F6', bg: 'rgba(59,130,246,0.10)', accent: 'text-blue-700' },
  fix: { label: 'إصلاح', icon: Bug, color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', accent: 'text-amber-700' },
  add: { label: 'إضافة', icon: Plus, color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)', accent: 'text-violet-700' },
  maintenance: { label: 'صيانة', icon: Wrench, color: '#64748B', bg: 'rgba(100,116,139,0.10)', accent: 'text-slate-700' },
}

const TYPE_ORDER = ['feature', 'improvement', 'add', 'fix', 'maintenance']

const UPDATES = [
  {
    version: 'v1.5.0',
    date: '2026-07-22',
    title: 'سندات الصرف — ادفع فواتيرك من رصد',
    summary: 'قسم جديد كامل لإدارة سندات الصرف. صرت تدفع فواتير المشتريات غير المدفوعة مباشرة من رصد بدون ما تدخل قيود — بضغطة وحدة، بنفس مبلغ الفاتورة وتاريخها بالضبط. تقدر تدفع فاتورة وحدة أو عدة فواتير دفعة وحدة، تفلتر بالبحث والتاريخ وتستثني موردين معينين، وعندك سجل كامل للسندات المرسلة مقسّم حسب المورد مع إمكانية التعديل والحذف اللي يتزامن مع قيود مباشرة.',
    items: [
      { type: 'feature', icon: CreditCard, text: 'دفع الفواتير غير المدفوعة من رصد', description: 'قسم "سندات الصرف" الجديد يجيب لك كل الفواتير الموافق عليها وغير المدفوعة من قيود. تختار حساب الدفع مرة وحدة، وتضغط "دفع" على أي فاتورة — يتسجّل سند الصرف بنفس مبلغ الفاتورة وبتاريخها بالضبط. مافيه إدخال يدوي ولا دخول للموقع.' },
      { type: 'feature', icon: Wallet, text: 'الدفع الجماعي', description: 'حدّد عدة فواتير دفعة وحدة عن طريق مربعات الاختيار، أو حدّد الكل، ويطلع لك شريط فيه إجمالي المبلغ وعدد الفواتير. اضغط "دفع المحدد" وينبعث كل السندات بالتتابع مع عدّاد تقدّم — مثالي لتسديد متراكم عدة أشهر مرة وحدة.' },
      { type: 'feature', icon: Sliders, text: 'فلترة وبحث متقدم', description: 'ابحث بالمورد أو رقم الفاتورة، فلتر بنطاق تاريخ من-إلى، واستثنِ موردين معينين بالبحث عن أسمائهم (مثلاً: كل الفواتير ما عدا شركة كذا). كل فلتر يحدّث الإجمالي المعروض لحظياً.' },
      { type: 'feature', icon: History, text: 'سجل السندات المرسلة', description: 'تبويب "سجل السندات" يعرض كل السندات اللي أرسلتها من رصد على شكل كروت لكل مورد (عدد السندات + الإجمالي). اضغط على أي مورد يفتح لك سنداته مع بحث برقم السند أو رقم الفاتورة أو المبلغ.' },
      { type: 'feature', icon: Pencil, text: 'تعديل وحذف السندات', description: 'من داخل سجل المورد تقدر تعدّل السند (المبلغ، التاريخ، الحساب، المرجع) أو تحذفه — والتغيير يتزامن مباشرة مع قيود. تعدّل في رصد يتعدّل في قيود، تحذف من رصد ينحذف من قيود.' },
      { type: 'fix', icon: Bug, text: 'تحديث محرك قراءة الفواتير', description: 'حدّثنا نموذج الذكاء الاصطناعي المستخدم في قراءة الفواتير بعد إيقاف الإصدار القديم من مزوّد الخدمة، فرجعت القراءة تشتغل بشكل طبيعي.' },
    ],
  },
  {
    version: 'v1.4.0',
    date: '2026-05-02',
    title: 'تجهيز جماعي للفواتير + تصميم محسّن',
    summary: 'تحديث ضخم يركز على رفع الفواتير دفعة واحدة بدل واحدة واحدة. صرت تجهّز كل الفواتير على راحتك، تتنقل بينها بدون فقدان أي تعديل، وترسلهم لقيود بضغطة واحدة. ضفنا حقل الخصم بالريال أو بالنسبة، زر "خصم الهللات" لمطابقة الإجمالي بدقة، قائمة فواتير شبكية مع تتبع لحظي لكل ملف، إعادة تصميم كاملة لصفحة رفع الفواتير وصفحة تحديثات النظام، وحسابات إجماليات لحظية تتحدث مع كل تعديل.',
    items: [
      { type: 'feature', icon: Send, text: 'تجهيز جماعي للفواتير', description: 'الحين ترفع 10 فواتير دفعة وحدة، تجهّزهم كلهم على راحتك، وترسلهم لقيود بضغطة واحدة. كل فاتورة لها حالة (في الانتظار / جاهزة / تم الإرسال / فشلت)، وزر "إرسال الجاهزة" يبعث الكل مرة وحدة.' },
      { type: 'feature', icon: ArrowLeftRight, text: 'التنقل الحر بين الفواتير', description: 'صرت تقدر ترجع لأي فاتورة عدّلتها سابقاً وتعدّل أو تتحقق منها — حتى لو كنت في الفاتورة الخامسة من 10. كل تعديلاتك محفوظة بالذاكرة ولا تضيع لما تتنقل.' },
      { type: 'feature', icon: Percent, text: 'حقل الخصم بالريال أو بالنسبة', description: 'ضفنا عمود الخصم بكل بند، تختار بالريال أو بالنسبة المئوية مثل ما هو موجود بقيود. الذكاء الاصطناعي يستخرج الخصم تلقائياً من الفاتورة.' },
      { type: 'feature', icon: Target, text: 'زر "خصم الهللات"', description: 'لما يكون فيه فرق هللات بين الإجمالي المعروض والمحسوب (بسبب التقريب)، يطلع لك زر صغير جنب البند. ضغطه يعدّل سعر الوحدة بدقة عشان الإجمالي بقيود يطابق الفاتورة بالضبط.' },
      { type: 'feature', icon: LayoutGrid, text: 'قائمة فواتير شبكية مع تتبع لحظي', description: 'صفحة قائمة الفواتير اتعدّلت لشبكة بطاقات. كل بطاقة تعرض حالة الفاتورة (جاري القراءة / تم / فشل / في الانتظار) مع شريط تقدم. لو فشلت فاتورة، الباقي يكمّل بدون توقف، وفيها زر إعادة محاولة منفصل + زر يعرض سبب الفشل.' },
      { type: 'feature', icon: Palette, text: 'إعادة تصميم صفحة رفع الفواتير', description: 'هيرو جديد فيه شارة "مدعوم بالذكاء الاصطناعي"، إحصائيات (المتوسط 1.2s، الدقة 99%، عداد فواتير الشهر)، تصميم منطقة الرفع بأيقونات ملفات متراكبة، وزرين منفصلين: "رفع من الجهاز" و"من الكاميرا".' },
      { type: 'feature', icon: Newspaper, text: 'إعادة تصميم صفحة تحديثات النظام', description: 'تصميم احترافي مستوحى من Linear/Stripe — سايدبار يمين بالإصدارات مع timeline، محتوى رئيسي بقراءة مريحة، تبويبات فلترة بنوع التحديث، وأزرار تنقل بين الإصدارات. كل إصدار قريته يختفي عنده مؤشر "ما قريته بعد".' },
      { type: 'improvement', icon: Calculator, text: 'حسابات لحظية للإجماليات', description: 'المجموع قبل الضريبة، الضريبة، والإجمالي شامل الضريبة صاروا يحسبون لحظياً من البنود. أي تعديل بأي حقل يُحدّث المجموع فوراً (كان قبل يعتمد على قراءة الذكاء الاصطناعي ولا يتغير).' },
      { type: 'improvement', icon: Package, text: 'قاعدة الكراتين vs الكمية', description: 'الذكاء الاصطناعي صار يميز بين عمود "عدد الكراتين" وعمود "الكمية" — حتى لو الكراتين جاي أول، ياخذ الكمية الفعلية بناءً على الوحدة (متر مربع / حبة / كجم).' },
      { type: 'add', icon: Plus, text: 'زر "إضافة المزيد" + "مسح الكل" بقائمة الرفع', description: 'أزرار جديدة بأعلى قائمة الفواتير المرفوعة لإضافة المزيد أو مسح الكل بسرعة بدون الرجوع لأي مكان.' },
      { type: 'add', icon: BarChart3, text: 'شريط حالة الفواتير', description: 'شريط بأعلى صفحة المطابقة يعرض كل الفواتير المرفوعة كأزرار صغيرة ملونة حسب الحالة، تنقر على أي وحدة تنتقل لها مباشرة.' },
      { type: 'fix', icon: Bug, text: 'تجاهل سطر الخصم الإجمالي', description: 'الذكاء الاصطناعي صار يتجاهل سطر "مجموع الخصم" الموجود تحت الفاتورة، لأنه عادة مجرد مجموع لخصومات البنود وليس خصماً إضافياً (كان قبل يخصم مرتين).' },
    ],
  },
  {
    version: 'v1.3.0',
    date: '2026-04-26',
    title: 'تحسينات الإدخال والفلترة والإشعارات',
    summary: 'تحديث ضخم يركز على تسريع إدخال الفواتير، تحسين العرض، وراحة المستخدم. أضفنا نمط الإدخال اليدوي للفواتير اللي ما تحتاج ذكاء اصطناعي مع نظام قوالب سريعة، فلترة متقدمة وتقسيم صفحات في الفواتير، فلترة الإشعارات بالنوع، صفحة "تحديثات النظام" اللي تشوفها الآن، نظام إشعارات Toast ذكي يترجم الأخطاء التقنية لرسائل عربية واضحة، وأخيراً الوضع الليلي بزر بسيط في الهيدر مع باليت ألوان مدروسة لراحة العين.',
    items: [
      { type: 'feature', icon: Moon, text: 'الوضع الليلي', description: 'أخيراً وصل! زر صغير بالهيدر بجنب تحديثات النظام، تضغطه وتبدّل بين النهاري والليلي بضغطة وحدة (مع رسم متحرك لطيف للأيقونة). الباليت متعوب عليها — خلفية رمادي دافئ، بطاقات بدرجة أعلى، ونصوص تباين AAA تريح عينك. واختيارك يحفظ تلقائياً، فلما تفتح النظام مرة ثانية يطلع لك بنفس الوضع.' },
      { type: 'feature', icon: Pencil, text: 'الإدخال اليدوي للفواتير', description: 'ما تبي تستخدم الذكاء الاصطناعي؟ تمام. صار فيه نمط إدخال يدوي 100% — مفيد للفواتير الإلكترونية اللي بياناتها جاهزة عندك، أو لما تبي إدخال سريع ودقيق بدون أي خطوات وسيطة.' },
      { type: 'feature', icon: Bookmark, text: 'القوالب السريعة', description: 'عندك مورد ثابت تتعامل معاه كل شهر؟ احفظ فاتورته كقالب بزر "حفظ كقالب"، ولما يجي وقت الفاتورة الجديدة اختر القالب — يتعبأ المورد والبنود والكميات والأسعار تلقائياً. ما يبقى عليك إلا الإرسال.' },
      { type: 'feature', icon: Hash, text: 'الترقيم التلقائي للفواتير', description: 'أرقام الفواتير اليدوية تتولّد بالتسلسل تلقائياً (BILL268، BILL269، BILL270…). تختار الرقم اللي تبدأ منه، والنظام يكمّل عليك بعد كل إرسال ناجح. ولو تبي رقم محدد، عدّله يدوياً وخلاص.' },
      { type: 'feature', icon: Sliders, text: 'الفلترة المتقدمة', description: 'لوحة فلترة كاملة بصفحة الفواتير: نطاق تاريخ من-إلى، رقم فاتورة محدد، اسم مورد، وحد أدنى/أعلى للمبلغ. كل فلتر فعال يطلع بعدّاد على زر الفلترة عشان تعرف وش مفعّل، وتقدر تمسحها كلها بضغطة وحدة.' },
      { type: 'feature', icon: ListFilter, text: 'تقسيم الصفحات', description: 'بدل ما تتمرر بقائمة طويلة لين تتعب، اختر عدد الفواتير اللي تبيها بالصفحة (10 / 15 / 20 / 30) وتنقل بين الصفحات بزر "السابق" و"التالي" — مع عرض رقم الصفحة الحالية والإجمالي.' },
      { type: 'feature', icon: BellRing, text: 'فلترة الإشعارات حسب النوع', description: 'بأعلى لوحة الإشعارات تبويبات: الكل / الإرسال (الفواتير اللي ترسلت لقيود) / القراءة (اللي تم قراءتها أو مطابقتها). اختيارك يحفظ تلقائياً.' },
      { type: 'feature', icon: Trash2, text: 'مسح كل الإشعارات', description: 'زر "مسح" بأعلى لوحة الإشعارات يخفي كل الإشعارات الحالية بضغطة، ويبقى يعرض لك الجديدة فقط. لا تخاف — المخفية ما تنحذف من قاعدة البيانات.' },
      { type: 'feature', icon: Sparkles, text: 'إشعارات Toast الذكية', description: 'كل العمليات صارت تعطيك تنبيه واضح بأسفل الشاشة:\n🟢 أخضر للنجاح\n🔴 أحمر للأخطاء\n🟡 أصفر للتحذيرات (مثل "فاتورة مكررة")\n🔵 أزرق للمعلومات\n\nوالأحلى إن النظام يترجم الأخطاء التقنية لرسائل عربية مفهومة. بدل "Failed to fetch" يطلع لك "فشل الاتصال — تأكد من الإنترنت"، وبدل "401" يطلع لك "مفتاح API غير صالح".' },
      { type: 'improvement', icon: Calendar, text: 'التعبئة التلقائية للتواريخ', description: 'تاريخ الفاتورة وتاريخ الاستحقاق صاروا يتعبّون بتاريخ اليوم تلقائياً أول ما تبدأ فاتورة يدوية جديدة. وفّرنا عليك الكتابة المتكررة.' },
      { type: 'improvement', icon: EyeOff, text: 'حفظ تفضيلات الفلترة', description: 'تفضيلاتك (نوع الإشعار المختار، الإشعارات الممسوحة) تنحفظ على متصفحك، فترجع للوضع نفسه لما تفتح الموقع مرة ثانية. ما تحتاج تضبطها كل مرة من جديد.' },
      { type: 'add', icon: FileText, text: 'صفحة الفواتير لمستخدمي الرفع', description: 'مستخدمو رفع الفواتير صار عندهم وصول لصفحة الفواتير — يشوفون كل الفواتير المرفوعة وحالتها. كانت قبل مقتصرة على المدير فقط.' },
      { type: 'add', icon: Megaphone, text: 'صفحة "تحديثات النظام"', description: 'صفحة جديدة (هذي اللي تقرأها الحين 👋) تعرض لك كل التحديثات والميزات بترتيب زمني. زر بأعلى الصفحة بجنب الإشعارات ينقلك لها، وفيه نقطة خضراء تظهر لما يكون فيه تحديث جديد ما قريته بعد.' },
      { type: 'fix', icon: Hash, text: 'حقل الكمية والسعر', description: 'حقول الكمية والسعر صارت تقبل الأعداد العشرية بدقة كاملة (45.4523، 11.5، إلخ)، وتقبل الفاصلة بدل النقطة وتحوّلها تلقائياً. كانت قبل ترجع للصفر لما تكتب "45." أو ترفض الفواصل — الحين تستنّاك تكمّل الكتابة بدون مشاكل.' },
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

const READ_KEY = 'rasad_updates_read_versions'
function loadRead() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')) } catch { return new Set() }
}
function saveRead(set) {
  try { localStorage.setItem(READ_KEY, JSON.stringify(Array.from(set))) } catch {}
}

function fmtArDate(d, opts = { year: 'numeric', month: 'long', day: 'numeric' }) {
  try { return new Date(d).toLocaleDateString('ar', opts) } catch { return d }
}

export default function Updates() {
  const [activeVersion, setActiveVersion] = useState(UPDATES[0].version)
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')
  const [readVersions, setReadVersions] = useState(loadRead)

  const current = UPDATES.find(u => u.version === activeVersion) || UPDATES[0]
  const isLatest = current.version === UPDATES[0].version

  // Mark as read when active changes
  useEffect(() => {
    if (!readVersions.has(activeVersion)) {
      const next = new Set(readVersions)
      next.add(activeVersion)
      setReadVersions(next)
      saveRead(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVersion])

  // Filter sidebar versions by search query
  const filteredVersions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return UPDATES
    return UPDATES.filter(u => {
      if (u.title.toLowerCase().includes(q) || u.version.toLowerCase().includes(q)) return true
      return u.items.some(i => i.text.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q))
    })
  }, [search])

  // Filter current version's items by selected type
  const filteredItems = useMemo(() => {
    return current.items.filter(i => filterType === 'all' || i.type === filterType)
  }, [current, filterType])

  const groupedByType = useMemo(() => {
    const acc = {}
    for (const item of filteredItems) {
      if (!acc[item.type]) acc[item.type] = []
      acc[item.type].push(item)
    }
    return acc
  }, [filteredItems])

  // Prev/next navigation (UPDATES is sorted newest → oldest)
  const idx = UPDATES.findIndex(u => u.version === activeVersion)
  const newer = idx > 0 ? UPDATES[idx - 1] : null
  const older = idx < UPDATES.length - 1 ? UPDATES[idx + 1] : null

  return (
    <div className="animate-page lg:grid lg:grid-cols-[270px_1fr] lg:gap-10 lg:items-start">
      {/* Versions rail (right side in RTL) — sticky within the page flow */}
      <aside className="hidden lg:flex flex-col lg:sticky lg:top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pl-5 border-l border-border-light">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-bold text-text">الإصدارات</h2>
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-border-light text-text-secondary">{UPDATES.length}</span>
        </div>

        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" strokeWidth={2} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث..."
            className="w-full bg-surface border border-border-light rounded-lg py-2 pr-9 pl-3 text-[13px] text-text placeholder-text-muted focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>

        <nav className="flex flex-col">
          {filteredVersions.map((u, i) => {
            const active = u.version === activeVersion
            const unread = !readVersions.has(u.version)
            const isLast = i === filteredVersions.length - 1
            return (
              <button
                key={u.version}
                onClick={() => setActiveVersion(u.version)}
                className={`flex gap-3 px-2.5 py-2.5 rounded-lg text-right cursor-pointer transition-all relative ${
                  active ? 'bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_var(--color-border-light)]' : 'hover:bg-surface/60'
                }`}
              >
                {/* Timeline rail */}
                <div className="relative w-3 flex-shrink-0 pt-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full border-2 border-bg relative z-10"
                    style={{
                      background: active ? 'var(--color-primary)' : (unread ? 'var(--color-primary)' : 'var(--color-text-muted)'),
                      boxShadow: '0 0 0 1px currentColor',
                    }}
                  />
                  {!isLast && <div className="absolute top-4 right-1 w-px h-full bg-border-light" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[13px] font-bold font-mono tracking-tight ${active ? 'text-primary-dark' : 'text-text'}`}>{u.version}</span>
                    {unread && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </div>
                  <div className={`text-[12px] leading-snug line-clamp-2 ${active ? 'text-text font-semibold' : 'text-text-secondary font-medium'}`}>
                    {u.title}
                  </div>
                  <div className="text-[10.5px] text-text-muted mt-0.5">
                    {fmtArDate(u.date, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </button>
            )
          })}
          {filteredVersions.length === 0 && (
            <p className="text-[12px] text-text-muted text-center py-6">لا توجد نتائج</p>
          )}
        </nav>
      </aside>

      {/* Mobile version picker (visible <lg) */}
      <div className="lg:hidden -mx-4 px-4 py-2 mb-4 border-b border-border-light overflow-x-auto">
        <div className="flex gap-2 w-max">
          {UPDATES.map(u => {
            const active = u.version === activeVersion
            const unread = !readVersions.has(u.version)
            return (
              <button
                key={u.version}
                onClick={() => setActiveVersion(u.version)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-mono font-bold whitespace-nowrap transition-colors ${
                  active ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary'
                }`}
              >
                {unread && !active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                {u.version}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="min-w-0">
        <div className="max-w-3xl pb-12">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[13px] mb-6 text-text-muted">
            <span>تحديثات النظام</span>
            <ChevronLeft className="w-3 h-3 text-border" strokeWidth={2.2} />
            <span className="text-text-secondary font-semibold font-mono">{current.version}</span>
          </div>

          {/* Header */}
          <header className="pb-7 border-b border-border-light/70 mb-7">
            <div className="flex justify-between items-center mb-4 gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary/15 text-[12px] font-semibold text-primary-dark font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                الإصدار {current.version}
                {isLatest && (
                  <span className="bg-primary text-white px-2 py-0.5 rounded-full text-[10px] font-sans">الأحدث</span>
                )}
              </div>

              <div className="flex gap-1.5">
                <CopyLinkButton version={current.version} />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-text mb-4">
              {current.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5">
              <span className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary font-medium">
                <Calendar className="w-3.5 h-3.5" strokeWidth={1.8} />
                {fmtArDate(current.date)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary font-medium">
                <FileText className="w-3.5 h-3.5" strokeWidth={1.8} />
                {current.items.length} {current.items.length === 1 ? 'تحديث' : 'تحديثات'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary font-medium">
                <Layers className="w-3.5 h-3.5" strokeWidth={1.8} />
                {Object.keys(current.items.reduce((a, i) => ((a[i.type] = 1), a), {})).length} أنواع
              </span>
            </div>

            {current.summary && (
              <p className="text-[15px] sm:text-base text-text-secondary leading-loose">
                {current.summary}
              </p>
            )}
          </header>

          {/* Filter tabs */}
          <div className="inline-flex gap-1 mb-7 bg-surface-light p-1 rounded-xl">
            {[
              { key: 'all', label: 'الكل', count: current.items.length },
              ...TYPE_ORDER.map(t => ({
                key: t,
                label: TYPES[t].label,
                count: current.items.filter(i => i.type === t).length,
              })).filter(t => t.count > 0),
            ].map(t => {
              const active = filterType === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setFilterType(t.key)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                    active ? 'bg-surface text-text font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)]' : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {t.label}
                  <span className={`text-[10.5px] font-semibold px-1.5 rounded ${
                    active ? 'bg-surface-lighter text-text-secondary' : 'bg-surface text-text-muted'
                  }`}>{t.count}</span>
                </button>
              )
            })}
          </div>

          {/* Sections by type */}
          {TYPE_ORDER.filter(t => groupedByType[t]?.length).map(typeKey => {
            const meta = TYPES[typeKey]
            const items = groupedByType[typeKey]
            const Icon = meta.icon
            return (
              <section key={typeKey} className="mb-9">
                <div className="flex items-center gap-2.5 mb-4">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                  </div>
                  <h2 className="text-[17px] font-bold text-text">{meta.label}</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-surface-light text-text-secondary rounded">{items.length}</span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: `linear-gradient(to right, transparent, ${meta.color}30)` }}
                  />
                </div>

                <div className="flex flex-col">
                  {items.map((item, i) => {
                    const ItemIcon = item.icon || meta.icon
                    return (
                      <div key={`${typeKey}-${i}`} className="flex gap-3.5 py-4 border-t border-border-light/70 first:border-t-0 group">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform group-hover:scale-105"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          <ItemIcon className="w-4 h-4" strokeWidth={1.8} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[15px] font-semibold text-text leading-snug mb-1.5">
                            {item.text}
                          </h3>
                          {item.description && (
                            <p className="text-[13.5px] text-text-secondary leading-loose whitespace-pre-line">
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

          {filteredItems.length === 0 && (
            <div className="py-14 flex flex-col items-center text-center">
              <FilterIcon className="w-8 h-8 text-text-muted/30 mb-3" />
              <p className="text-sm text-text-muted">لا توجد تحديثات بهذا النوع في {current.version}</p>
            </div>
          )}

          {/* Bottom prev/next */}
          {(newer || older) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-8 mt-8 border-t border-border-light">
              {newer ? (
                <button
                  onClick={() => setActiveVersion(newer.version)}
                  className="flex items-center gap-3 p-4 bg-surface border border-border-light rounded-xl hover:border-primary/30 hover:bg-surface-light/40 transition-all text-right"
                >
                  <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" strokeWidth={2.2} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-text-muted font-medium mb-0.5">الأحدث</div>
                    <div className="text-[13px] font-semibold text-text truncate">
                      <span className="font-mono">{newer.version}</span> · {newer.title}
                    </div>
                  </div>
                </button>
              ) : <div className="hidden sm:block" />}

              {older ? (
                <button
                  onClick={() => setActiveVersion(older.version)}
                  className="flex items-center justify-end gap-3 p-4 bg-surface border border-border-light rounded-xl hover:border-primary/30 hover:bg-surface-light/40 transition-all text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-text-muted font-medium mb-0.5">الأقدم</div>
                    <div className="text-[13px] font-semibold text-text truncate">
                      <span className="font-mono">{older.version}</span> · {older.title}
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-text-muted flex-shrink-0" strokeWidth={2.2} />
                </button>
              ) : <div className="hidden sm:block" />}
            </div>
          )}

          <div className="mt-10 text-center text-[11px] text-text-muted/60">
            صُنع بإتقان في <span className="text-[#065F46]" style={{ fontFamily: 'Rikaz', fontFeatureSettings: '"salt", "ss01", "ss02", "ss03", "calt", "liga"', fontSize: '14px', textShadow: '0 0 8px rgba(16,185,129,0.3)' }}>ركِـاز</span>
          </div>
        </div>
      </main>
    </div>
  )
}

function CopyLinkButton({ version }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#${version}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <button
      onClick={onCopy}
      title={copied ? 'تم النسخ' : 'نسخ الرابط'}
      className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
        copied ? 'border-primary text-primary bg-primary-50' : 'border-border-light text-text-muted hover:text-text-secondary hover:bg-surface-light'
      }`}
    >
      <LinkIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
    </button>
  )
}
