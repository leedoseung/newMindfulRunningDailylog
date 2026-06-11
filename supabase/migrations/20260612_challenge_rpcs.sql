-- atomic pass decrement
CREATE OR REPLACE FUNCTION decrement_participation_pass(participation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE challenge_participations
     SET passes_remaining = GREATEST(passes_remaining - 1, 0)
   WHERE id = participation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION decrement_participation_pass(uuid) TO authenticated, service_role;
