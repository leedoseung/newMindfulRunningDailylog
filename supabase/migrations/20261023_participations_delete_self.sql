-- Fix: cancel enroll (DELETE /api/challenges/enroll) silently returned {ok:true}
-- but did nothing because challenge_participations had no DELETE RLS policy.
-- With RLS enabled and no matching policy, Postgres silently affects 0 rows and
-- returns no error — the client code reads success and never knows.
--
-- Scope: user may delete ONLY their own participation. Business constraint
--        (today < start_date) is enforced in CancelEnrollUseCase, not here.

DROP POLICY IF EXISTS participations_delete_self ON challenge_participations;

CREATE POLICY participations_delete_self ON challenge_participations
  FOR DELETE
  USING (member_id::text = (auth.jwt() -> 'user_metadata' ->> 'member_id'));
