-- absolute set mission_log count for the given date; idempotent edit
CREATE OR REPLACE FUNCTION set_mission_log_count(
  p_participation_id uuid,
  p_log_date date,
  p_count int
)
RETURNS mission_logs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result mission_logs;
BEGIN
  IF p_count < 0 THEN
    RAISE EXCEPTION 'negative count not allowed';
  END IF;

  INSERT INTO mission_logs (participation_id, log_date, count, updated_at)
  VALUES (p_participation_id, p_log_date, p_count, now())
  ON CONFLICT (participation_id, log_date)
  DO UPDATE SET
    count = EXCLUDED.count,
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION set_mission_log_count(uuid, date, int) TO authenticated;
