-- إضافة أعمدة الإعدادات
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS profile_name TEXT DEFAULT '';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS profile_email TEXT DEFAULT '';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS profile_phone TEXT DEFAULT '';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS profile_role TEXT DEFAULT '';

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS company_name TEXT DEFAULT '';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS company_cr TEXT DEFAULT '';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS company_vat TEXT DEFAULT '';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS company_city TEXT DEFAULT '';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS company_address TEXT DEFAULT '';

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notif_email_success BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notif_email_fail BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notif_email_digest BOOLEAN DEFAULT false;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notif_browser BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notif_sound BOOLEAN DEFAULT false;

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS appearance_lang TEXT DEFAULT 'ar';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS appearance_density TEXT DEFAULT 'comfortable';
