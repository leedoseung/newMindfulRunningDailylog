CREATE TABLE notifications (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_member_id uuid        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  actor_member_id     uuid        REFERENCES members(id) ON DELETE SET NULL,
  actor_name          text        NOT NULL DEFAULT '',
  actor_avatar_url    text,
  type                text        NOT NULL CHECK (type IN ('like', 'comment')),
  run_log_id          uuid        NOT NULL REFERENCES run_logs(id) ON DELETE CASCADE,
  run_title           text,
  comment_body        text,
  is_read             boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Unique index: one like notification per actor+run+type
-- Note: partial index (WHERE type='like') is incompatible with Supabase upsert onConflict
CREATE UNIQUE INDEX notif_like_unique
  ON notifications(recipient_member_id, actor_member_id, run_log_id, type);

-- Index for fast lookup by recipient
CREATE INDEX notifications_recipient_idx ON notifications(recipient_member_id, created_at DESC);
