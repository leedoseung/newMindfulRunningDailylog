ALTER TABLE members
  ADD COLUMN IF NOT EXISTS challenge_badges jsonb NOT NULL DEFAULT '[]'::jsonb;

-- helper: append badge atomically; idempotent on challenge_id duplicate
CREATE OR REPLACE FUNCTION grant_challenge_badge(p_member_id uuid, p_badge jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE members
     SET challenge_badges = challenge_badges || jsonb_build_array(p_badge)
   WHERE id = p_member_id
     AND NOT (
       challenge_badges @> jsonb_build_array(
         jsonb_build_object('challenge_id', p_badge -> 'challenge_id')
       )
     );
END;
$$;

GRANT EXECUTE ON FUNCTION grant_challenge_badge(uuid, jsonb) TO service_role;
