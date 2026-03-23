# فاتِر — قارئ الفواتير الذكي | خطة التطوير

## نظرة عامة
ويب آب يقرأ صور الفواتير الورقية بالذكاء الاصطناعي، يطابق البنود مع بنود نظام قيود المحاسبي، ويرسلها تلقائياً عبر Qoyod API.

## الستاك التقني
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Express.js
- **Database:** Supabase (PostgreSQL)
- **AI:** Google Gemini Vision API (gemini-2.0-flash) لقراءة الفواتير
- **Accounting:** Qoyod API (https://apidoc.qoyod.com)
- **Auth:** Supabase Auth

## بنية المشروع

```
fatir/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx           # الهيكل العام + Sidebar
│   │   │   ├── UploadZone.jsx       # منطقة رفع الصور (drag & drop)
│   │   │   ├── InvoicePreview.jsx   # عرض صورة الفاتورة + البيانات المستخرجة
│   │   │   ├── ItemMatcher.jsx      # شاشة مطابقة البنود
│   │   │   ├── ReviewTable.jsx      # جدول المراجعة قبل الإرسال
│   │   │   ├── MappingManager.jsx   # إدارة قاموس المطابقة
│   │   │   └── QoyodStatus.jsx      # حالة الإرسال لقيود
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # الصفحة الرئيسية - إحصائيات
│   │   │   ├── Upload.jsx           # رفع ومعالجة الفواتير
│   │   │   ├── Mappings.jsx         # إدارة قاموس المطابقة
│   │   │   ├── History.jsx          # سجل الفواتير المرسلة
│   │   │   └── Settings.jsx         # إعدادات API Keys
│   │   ├── lib/
│   │   │   ├── supabase.js
│   │   │   └── api.js
│   │   └── App.jsx
│   └── index.html
├── server/
│   ├── index.js                     # Express server
│   ├── routes/
│   │   ├── scan.js                  # POST /api/scan - قراءة الفاتورة بالـ AI
│   │   ├── match.js                 # POST /api/match - مطابقة البنود
│   │   ├── qoyod.js                 # POST /api/qoyod/push - إرسال لقيود
│   │   └── mappings.js              # CRUD لقاموس المطابقة
│   ├── services/
│   │   ├── gemini.js                # Gemini Vision API integration
│   │   ├── qoyod.js                 # Qoyod API wrapper
│   │   └── matcher.js               # خوارزمية المطابقة الذكية
│   └── utils/
│       └── imageProcessor.js        # معالجة الصور قبل الإرسال
├── supabase/
│   └── migrations/
│       └── 001_initial.sql
├── .env
└── package.json
```

## قاعدة البيانات (Supabase)

```sql
-- جدول قاموس المطابقة
CREATE TABLE item_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_item_name TEXT NOT NULL,        -- اسم البند عند المورد
  qoyod_product_id INTEGER NOT NULL,     -- ID البند في قيود
  qoyod_product_name TEXT NOT NULL,      -- اسم البند في قيود
  vendor_name TEXT,                       -- اسم المورد (اختياري)
  confidence FLOAT DEFAULT 1.0,          -- مستوى الثقة
  times_used INTEGER DEFAULT 1,          -- عدد مرات الاستخدام
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول سجل الفواتير المعالجة
CREATE TABLE processed_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT,                          -- رابط صورة الفاتورة
  vendor_name TEXT,                        -- اسم المورد
  invoice_number TEXT,                     -- رقم الفاتورة
  invoice_date DATE,                       -- تاريخ الفاتورة
  total_amount DECIMAL(12,2),             -- المبلغ الإجمالي
  vat_amount DECIMAL(12,2),               -- مبلغ الضريبة
  extracted_data JSONB,                    -- البيانات المستخرجة كاملة
  matched_data JSONB,                      -- البيانات بعد المطابقة
  qoyod_bill_id INTEGER,                  -- ID الفاتورة في قيود بعد الإرسال
  status TEXT DEFAULT 'scanned',          -- scanned | matched | pushed | error
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول إعدادات المستخدم
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qoyod_api_key TEXT,                     -- مفتاح API قيود (مشفر)
  gemini_api_key TEXT,                    -- مفتاح Gemini API (مشفر)
  default_account_id INTEGER,            -- حساب المشتريات الافتراضي
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### 1. POST /api/scan
- يستقبل: صورة الفاتورة (multipart/form-data)
- يرسلها لـ Gemini Vision API مع البرومبت التالي
- يرجع: JSON بالبيانات المستخرجة

**برومبت Gemini المطلوب:**
```
أنت نظام متخصص في قراءة الفواتير العربية. حلل صورة الفاتورة هذه واستخرج البيانات التالية بصيغة JSON فقط بدون أي نص إضافي:

{
  "vendor_name": "اسم المورد/الشركة",
  "invoice_number": "رقم الفاتورة",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD أو null",
  "items": [
    {
      "description": "وصف البند كما هو مكتوب بالفاتورة",
      "quantity": 0,
      "unit_price": 0.00,
      "total": 0.00
    }
  ],
  "subtotal": 0.00,
  "vat_rate": 15,
  "vat_amount": 0.00,
  "total_amount": 0.00,
  "notes": "أي ملاحظات إضافية"
}

مهم:
- اكتب أسماء البنود كما هي مكتوبة بالفاتورة بالضبط
- لو فيه بند مش واضح اكتب "غير واضح" بوصفه
- المبالغ بالريال السعودي
- التاريخ بصيغة YYYY-MM-DD
```

### 2. POST /api/match
- يستقبل: البيانات المستخرجة من الفاتورة
- يسحب بنود قيود عبر GET https://api.qoyod.com/api/products (Header: API-KEY)
- يطابق كل بند مع بنود قيود عبر:
  1. **بحث دقيق** في جدول item_mappings (مطابقة سابقة)
  2. **بحث تقريبي** (fuzzy match) مع بنود قيود
  3. **AI matching** لو ما لقى تطابق — يسأل Gemini يقترح أقرب بند
- يرجع: البيانات مع اقتراحات المطابقة + confidence score

### 3. POST /api/qoyod/push
- يستقبل: الفاتورة بعد المراجعة والمطابقة
- يرسلها لـ Qoyod API:
  - أولاً: يتحقق من المورد (GET /api/vendors?q[name_cont]=NAME)
  - لو المورد مو موجود: ينشئه (POST /api/vendors)
  - يرسل الفاتورة: POST /api/bills
- يرجع: رابط الفاتورة في قيود + bill_id

**Qoyod API Headers:**
```
API-KEY: {qoyod_api_key}
Content-Type: application/json
```

**Qoyod Bill Format (POST /api/bills):**
```json
{
  "bill": {
    "vendor_id": 123,
    "bill_number": "INV-001",
    "bill_date": "2026-03-20",
    "due_date": "2026-04-20",
    "reference": "رقم الفاتورة الأصلي",
    "line_items_attributes": [
      {
        "product_id": 456,
        "description": "وصف البند",
        "quantity": 1,
        "unit_price": 100.00,
        "account_id": 789
      }
    ]
  }
}
```

### 4. CRUD /api/mappings
- GET /api/mappings — كل المطابقات المحفوظة
- POST /api/mappings — إضافة مطابقة جديدة
- PUT /api/mappings/:id — تعديل مطابقة
- DELETE /api/mappings/:id — حذف مطابقة

## واجهة المستخدم (5 صفحات)

### صفحة 1: Dashboard
- عدد الفواتير المعالجة اليوم/الشهر
- عدد البنود المطابقة تلقائياً vs يدوياً
- آخر الفواتير المرسلة
- حالة الاتصال بقيود (متصل/غير متصل)

### صفحة 2: Upload (الصفحة الرئيسية)
- **Step 1:** منطقة رفع صور (drag & drop + اختيار ملفات متعددة)
  - يقبل: JPG, PNG, HEIC, PDF
  - عرض thumbnails للصور المرفوعة
  - زر "ابدأ القراءة"
- **Step 2:** بعد القراءة — عرض صورة الفاتورة يسار + البيانات المستخرجة يمين
  - المورد، التاريخ، الرقم (قابلة للتعديل)
  - جدول البنود مع أعمدة: البند الأصلي | البند المطابق في قيود | الكمية | السعر | الإجمالي
  - لو البند مطابق ✅ أخضر
  - لو البند يحتاج مطابقة ⚠️ أصفر — dropdown يختار منه بند قيود
  - لو البند مش موجود ❌ أحمر — زر "أضف بند جديد"
  - checkbox "احفظ المطابقة للمستقبل"
- **Step 3:** زر "أرسل لقيود" — يعرض ملخص + تأكيد
- **Step 4:** رسالة نجاح + رابط الفاتورة في قيود

### صفحة 3: Mappings (قاموس المطابقة)
- جدول: اسم البند عند المورد → اسم البند في قيود | المورد | عدد الاستخدامات
- بحث وفلترة
- تعديل وحذف
- استيراد/تصدير CSV

### صفحة 4: History (السجل)
- جدول بكل الفواتير المعالجة
- الحالة: مقروءة | مطابقة | مرسلة | خطأ
- فلتر حسب التاريخ والمورد والحالة
- إعادة إرسال الفواتير الفاشلة

### صفحة 5: Settings (الإعدادات)
- حقل Qoyod API Key (مع زر "اختبار الاتصال")
- حقل Gemini API Key (مع زر "اختبار")
- حساب المشتريات الافتراضي (dropdown من حسابات قيود)
- المخزن الافتراضي (dropdown من مخازن قيود)

## التصميم

### الهوية البصرية
- **اسم:** فاتِر (Fatir)
- **اللون الرئيسي:** أخضر مالي #10B981 (emerald)
- **اللون الثانوي:** رمادي غامق #1F2937
- **الخلفية:** أبيض #FFFFFF
- **الخط العربي:** IBM Plex Sans Arabic
- **الاتجاه:** RTL بالكامل

### قواعد التصميم
- color-scheme: light only (إجباري)
- <meta name="color-scheme" content="light only">
- Mobile-first responsive
- بدون emoji — SVG icons فقط (Lucide React)
- أزرار: min-height 44px, border-radius 12px
- Cards: frosted glass effect, subtle shadows
- Loading states لكل عملية
- Toast notifications للنجاح والخطأ

## خوارزمية المطابقة الذكية (matcher.js)

```javascript
// الترتيب:
// 1. بحث في item_mappings (exact match على vendor_item_name)
// 2. بحث في item_mappings (fuzzy match — Levenshtein distance < 3)
// 3. بحث في بنود قيود (fuzzy match على product name)
// 4. AI matching — يرسل لـ Gemini:
//    "عندي بند اسمه '{vendor_item}' من مورد '{vendor_name}'
//     وعندي هالبنود في النظام: [{qoyod_products}]
//     وش أقرب بند يطابقه؟ رجع JSON: {product_id, product_name, confidence}"
// 5. لو ما لقى شي — يرجع unmatched ويخلي المستخدم يختار
```

## متغيرات البيئة (.env)

```
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Gemini
GEMINI_API_KEY=xxx

# Qoyod (يحفظها المستخدم من الواجهة)
# تتخزن مشفرة بـ Supabase

# Server
PORT=3001
```

## خطوات التنفيذ (بالترتيب)

### Sprint 1: البنية الأساسية
1. `npm create vite@latest client -- --template react` + Tailwind
2. Express server مع الـ routes الأساسية
3. Supabase schema + migrations
4. صفحة Settings — إدخال API keys + اختبار الاتصال

### Sprint 2: قراءة الفواتير
5. UploadZone component (drag & drop)
6. POST /api/scan — Gemini Vision integration
7. InvoicePreview component — عرض النتيجة
8. اختبار على 5 فواتير حقيقية وتعديل البرومبت

### Sprint 3: المطابقة
9. سحب بنود قيود (GET /api/products)
10. خوارزمية المطابقة (exact → fuzzy → AI)
11. ItemMatcher component — واجهة المطابقة
12. حفظ المطابقات في item_mappings

### Sprint 4: الإرسال لقيود
13. التحقق من/إنشاء المورد
14. إرسال الفاتورة (POST /api/bills)
15. ReviewTable + QoyodStatus components
16. سجل الفواتير المرسلة

### Sprint 5: التحسينات
17. Dashboard بالإحصائيات
18. معالجة دفعات (batch upload)
19. تصدير/استيراد قاموس المطابقة
20. معالجة الأخطاء + retry logic

## ملاحظات مهمة

1. **Qoyod API Base URL:** https://api.qoyod.com/api
2. **كل طلبات قيود تحتاج Header:** `API-KEY: {key}`
3. **الـ API يرجع JSON** — لا تحتاج Content-Type خاص للـ GET
4. **فواتير المشتريات = Bills** (مو Invoices — Invoices للمبيعات)
5. **الصور ممكن تكون كبيرة** — compress قبل الإرسال لـ Gemini (max 4MB)
6. **Gemini Vision مجاني** لـ gemini-2.0-flash مع rate limit معقول
7. **خزّن API keys مشفرة** — لا تخزنها plain text
8. **RTL everywhere** — كل النصوص والأرقام عربية
