-- extend upsert_mission_log_count to accept optional p_note, preserving existing one if NULL

CREATE OR REPLACE FUNCTION upsert_mission_log_count(
  p_participation_id uuid,
  p_log_date date,
  p_delta int,
  p_note text DEFAULT NULL
)
RETURNS mission_logs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result mission_logs;
BEGIN
  IF p_delta < 0 THEN
    RAISE EXCEPTION 'negative delta not allowed';
  END IF;

  INSERT INTO mission_logs (participation_id, log_date, count, note, updated_at)
  VALUES (p_participation_id, p_log_date, p_delta, p_note, now())
  ON CONFLICT (participation_id, log_date)
  DO UPDATE SET
    count = mission_logs.count + EXCLUDED.count,
    note = COALESCE(EXCLUDED.note, mission_logs.note),
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;
