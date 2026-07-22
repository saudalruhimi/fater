-- 003_users_roles.sql
-- System users, roles, and dynamic per-role permissions

-- ─── Roles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_roles (
  key         TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT,
  is_admin    BOOLEAN NOT NULL DEFAULT FALSE,  -- if true, has access to ALL routes regardless of permissions
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,  -- system roles cannot be deleted
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Users ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_users (
  id            BIGSERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_key      TEXT NOT NULL REFERENCES system_roles(key) ON UPDATE CASCADE,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  is_system     BOOLEAN NOT NULL DEFAULT FALSE,  -- system users cannot be deleted
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_users_username_lower ON system_users (LOWER(username));

-- ─── Role permissions (route allowlist) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  role_key   TEXT NOT NULL REFERENCES system_roles(key) ON DELETE CASCADE ON UPDATE CASCADE,
  route_path TEXT NOT NULL,
  PRIMARY KEY (role_key, route_path)
);

-- ─── Seed roles ──────────────────────────────────────────────────────────
INSERT INTO system_roles (key, label, description, is_admin, is_system) VALUES
  ('ADMIN',    'مدير النظام',  'صلاحية كاملة للوصول لكل صفحات النظام، إدارة المستخدمين، والتحكم بكل الإعدادات.', TRUE,  TRUE),
  ('UPLOADER', 'رافع فواتير', 'صلاحيات محدودة على رفع الفواتير، عرضها، وإدارة الموردين والبنود فقط.',         FALSE, TRUE)
ON CONFLICT (key) DO NOTHING;

-- ─── Seed permissions for UPLOADER ───────────────────────────────────────
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
-- Note: ADMIN roles have is_admin=TRUE so they get all routes regardless of role_permissions.

-- ─── updated_at triggers ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_system_users_updated_at ON system_users;
CREATE TRIGGER trg_system_users_updated_at BEFORE UPDATE ON system_users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_system_roles_updated_at ON system_roles;
CREATE TRIGGER trg_system_roles_updated_at BEFORE UPDATE ON system_roles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
