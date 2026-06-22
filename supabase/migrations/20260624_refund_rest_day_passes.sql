-- Backfill: rest days that were wrongly counted as pass-used by the daily pass check.
-- Two effects on existing data:
--   1) mission_logs rows where is_rest_day=true AND used_pass=true (rest day got marked as pass-used)
--   2) challenge_participations.passes_remaining was decremented by 1 per such row
-- Fix: refund passes_remaining (capped by challenges.pass_count), clear used_pass on rest-day rows.

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
