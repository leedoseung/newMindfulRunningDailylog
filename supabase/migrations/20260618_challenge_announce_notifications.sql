-- Extend notifications for system announcements (no actor / no run_log).
-- payload jsonb carries challenge-specific fields (challenge_id, title, start_date, url, etc.)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS payload jsonb;

-- Existing schema reserves NOT NULL on actor_member_id / actor_name? Verify and relax for system-level rows.
-- (No-op if already nullable.)
ALTER TABLE notifications ALTER COLUMN actor_member_id DROP NOT NULL;
ALTER TABLE notifications ALTER COLUMN actor_name DROP NOT NULL;
ALTER TABLE notifications ALTER COLUMN run_log_id DROP NOT NULL;
ALTER TABLE notifications ALTER COLUMN run_title DROP NOT NULL;

CREATE OR REPLACE FUNCTION fanout_challenge_announcement(p_challenge_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_inserted int;
  ch RECORD;
BEGIN
  SELECT id, title, start_date INTO ch FROM challenges WHERE id = p_challenge_id;
  IF ch IS NULL THEN RAISE EXCEPTION 'challenge not found'; END IF;

  INSERT INTO notifications (recipient_member_id, type, payload, is_read, created_at)
  SELECT
    m.id,
    'challenge_announcement',
    jsonb_build_object(
      'challenge_id', ch.id,
      'title', ch.title,
      'start_date', ch.start_date,
      'url', '/mission'
    ),
    false,
    now()
  FROM members m;

  GET DIAGNOSTICS count_inserted = ROW_COUNT;
  RETURN count_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION fanout_challenge_announcement(uuid) TO service_role;
