-- جدول قاموس المطابقة
CREATE TABLE item_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_item_name TEXT NOT NULL,
  qoyod_product_id INTEGER NOT NULL,
  qoyod_product_name TEXT NOT NULL,
  vendor_name TEXT DEFAULT '',
  confidence FLOAT DEFAULT 1.0,
  times_used INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول سجل الفواتير المعالجة
CREATE TABLE processed_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT,
  vendor_name TEXT,
  invoice_number TEXT,
  invoice_date DATE,
  total_amount DECIMAL(12,2),
  vat_amount DECIMAL(12,2),
  extracted_data JSONB,
  matched_data JSONB,
  qoyod_bill_id INTEGER,
  status TEXT DEFAULT 'scanned',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول إعدادات المستخدم
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qoyod_api_key TEXT,
  gemini_api_key TEXT,
  default_inventory_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS but allow all for now (no auth)
ALTER TABLE item_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on item_mappings" ON item_mappings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on processed_invoices" ON processed_invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on user_settings" ON user_settings FOR ALL USING (true) WITH CHECK (true);
