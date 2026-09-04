-- أرشيف المطابقات: كل فحص يُحفظ بملفيه الأصليين ونتيجته.
--
-- الملفان بأصلهما لا بنص مستخرج — لأن بعد سنتين، حين يأتي خلاف، لا ينفع
-- جدولٌ قرأه الذكاء الاصطناعي، بل الورقة التي وصلت من المورد نفسه.
--
-- والفحوصات تتراكم ولا تُستبدل: تُقرأ القصة كاملة — فُحص، ظهر فرق، صحّح
-- المورد، الفحص الثاني مطابق.
CREATE TABLE reconciliations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  vendor_name   TEXT NOT NULL,
  period_from   DATE,
  period_to     DATE,

  -- الملفان الأصليان في التخزين
  ours_url      TEXT,
  theirs_url    TEXT,
  ours_name     TEXT,
  theirs_name   TEXT,

  -- الخلاصة، للعرض في القوائم بلا فتح النتيجة الكاملة
  clean         BOOLEAN NOT NULL DEFAULT false,
  our_closing   DECIMAL(14,2),
  their_closing DECIMAL(14,2),
  closing_gap   DECIMAL(14,2),
  opening_gap   DECIMAL(14,2),
  matched_count INTEGER DEFAULT 0,
  diff_count    INTEGER DEFAULT 0,

  -- النتيجة الكاملة كما أنتجها المحرك
  result        JSONB,

  checked_by    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reconciliations_vendor ON reconciliations (vendor_name, created_at DESC);

ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on reconciliations" ON reconciliations FOR ALL USING (true) WITH CHECK (true);
