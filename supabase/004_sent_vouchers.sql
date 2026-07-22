-- جدول سندات الصرف المرسلة من رصد
CREATE TABLE sent_vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qoyod_receipt_id INTEGER,
  bill_id INTEGER,
  vendor_name TEXT,
  invoice_number TEXT,
  amount DECIMAL(12,2),
  payment_date DATE,
  account_id INTEGER,
  account_name TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sent_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on sent_vouchers" ON sent_vouchers FOR ALL USING (true) WITH CHECK (true);
