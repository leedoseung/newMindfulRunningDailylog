-- Backfill v2: rest days wrongly marked as pass-used by daily-pass-check cron.
-- Root cause fixed in supabase/functions/daily-pass-check/index.ts (is_rest_day added to
-- `missed` check). This migration cleans up rows corrupted between 20260624 and today's fix.
-- Identical shape to 20260624_refund_rest_day_passes.sql — idempotent re-run.

BEGIN;

WITH refunds AS (
  SELECT ml.participation_id, COUNT(*) AS n
    FROM mission_logs ml
   WHERE ml.is_rest_day = true
     AND ml.used_pass = true
   GROUP BY ml.participation_id
)
UPDATE challenge_participations cp
   SET passes_remaining = LEAST(cp.passes_remaining + r.n, c.pass_count)
  FROM refunds r, challenges c
 WHERE cp.id = r.participation_id
   AND c.id = cp.challenge_id;

UPDATE mission_logs
   SET used_pass = false,
       updated_at = now()
 WHERE is_rest_day = true
   AND used_pass = true;

COMMIT;
