-- 005_fix_rls_and_seed.sql
-- Fixes the auth tables on databases where RLS is enabled but the allow-all
-- policies (and role seed) from 003 never got applied. Safe to run repeatedly.

-- ─── Allow-all RLS policies for the auth tables ──────────────────────────
ALTER TABLE system_roles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on system_roles" ON system_roles;
CREATE POLICY "Allow all on system_roles" ON system_roles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on system_users" ON system_users;
CREATE POLICY "Allow all on system_users" ON system_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on role_permissions" ON role_permissions;
CREATE POLICY "Allow all on role_permissions" ON role_permissions FOR ALL USING (true) WITH CHECK (true);

-- ─── Re-seed roles (in case 003's seed never ran) ────────────────────────
INSERT INTO system_roles (key, label, description, is_admin, is_system) VALUES
  ('ADMIN',    'مدير النظام',  'صلاحية كاملة للوصول لكل صفحات النظام، إدارة المستخدمين، والتحكم بكل الإعدادات.', TRUE,  TRUE),
  ('UPLOADER', 'رافع فواتير', 'صلاحيات محدودة على رفع الفواتير، عرضها، وإدارة الموردين والبنود فقط.',         FALSE, TRUE)
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_key, route_path) VALUES
  ('UPLOADER', '/'),
  ('UPLOADER', '/upload'),
  ('UPLOADER', '/invoices'),
  ('UPLOADER', '/vendors'),
  ('UPLOADER', '/products'),
  ('UPLOADER', '/dictionary'),
  ('UPLOADER', '/vendor-dictionary'),
  ('UPLOADER', '/settings'),
  ('UPLOADER', '/updates')
ON CONFLICT DO NOTHING;
