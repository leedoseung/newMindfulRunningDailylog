-- atomic upsert count: insert if missing, else add delta. cap not enforced (store raw count).
CREATE OR REPLACE FUNCTION upsert_mission_log_count(
  p_participation_id uuid,
  p_log_date date,
  p_delta int
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

  INSERT INTO mission_logs (participation_id, log_date, count, updated_at)
  VALUES (p_participation_id, p_log_date, p_delta, now())
  ON CONFLICT (participation_id, log_date)
  DO UPDATE SET
    count = mission_logs.count + EXCLUDED.count,
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_mission_log_count(uuid, date, int) TO authenticated;

-- mark pass (idempotent: only set true if currently false)
CREATE OR REPLACE FUNCTION mark_mission_log_pass(
  p_participation_id uuid,
  p_log_date date
)
RETURNS mission_logs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result mission_logs;
BEGIN
  INSERT INTO mission_logs (participation_id, log_date, count, used_pass, updated_at)
  VALUES (p_participation_id, p_log_date, 0, true, now())
  ON CONFLICT (participation_id, log_date)
  DO UPDATE SET
    used_pass = true,
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_mission_log_pass(uuid, date) TO service_role;
