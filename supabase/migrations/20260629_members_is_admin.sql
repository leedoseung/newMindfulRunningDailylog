-- supabase/migrations/20260629_members_is_admin.sql
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_members_is_admin ON members (is_admin) WHERE is_admin = true;

UPDATE members
SET is_admin = true
WHERE auth_user_id = 'e2cc184c-c089-4447-9994-b56954c002d1'; -- 이두승
