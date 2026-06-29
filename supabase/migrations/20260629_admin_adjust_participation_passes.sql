CREATE OR REPLACE FUNCTION admin_adjust_participation_passes(
  p_participation_id uuid,
  p_delta int
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_value int;
  max_passes int;
BEGIN
  IF p_delta NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'delta must be -1 or 1';
  END IF;

  SELECT c.pass_count INTO max_passes
  FROM challenge_participations p
  JOIN challenges c ON c.id = p.challenge_id
  WHERE p.id = p_participation_id;

  IF max_passes IS NULL THEN
    RAISE EXCEPTION 'participation not found';
  END IF;

  UPDATE challenge_participations
  SET passes_remaining = LEAST(GREATEST(passes_remaining + p_delta, 0), max_passes)
  WHERE id = p_participation_id
  RETURNING passes_remaining INTO new_value;

  RETURN new_value;
END;
$$;
