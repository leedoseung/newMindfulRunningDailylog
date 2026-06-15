-- Mission logs were locked down to the row owner via mission_logs_own. That
-- prevents the challenge roster from seeing other participants' progress.
-- Add a read-only policy that lets any participant of the same challenge
-- read mission logs in that challenge.

DROP POLICY IF EXISTS mission_logs_same_challenge_read ON mission_logs;

CREATE POLICY mission_logs_same_challenge_read
  ON mission_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM challenge_participations target
        JOIN challenge_participations viewer
          ON viewer.challenge_id = target.challenge_id
       WHERE target.id = mission_logs.participation_id
         AND viewer.member_id::text = (auth.jwt() -> 'user_metadata' ->> 'member_id')
    )
  );
