-- B+D+E: mindful challenge — daily minimum + bonus, weekly rest budget, optional note

ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS goal_min int NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS rest_days_per_week int NOT NULL DEFAULT 1;

ALTER TABLE mission_logs
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS is_rest_day boolean NOT NULL DEFAULT false;

-- mark today as a rest day, enforcing the weekly budget (Mon-Sun KST window).
-- Counts existing rest days inside the same ISO week against the budget.
CREATE OR REPLACE FUNCTION mark_mission_rest_day(
  p_participation_id uuid,
  p_log_date date
)
RETURNS mission_logs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge_id uuid;
  v_budget int;
  v_week_start date;
  v_week_end date;
  v_used int;
  v_row mission_logs;
BEGIN
  -- ISO week range (Mon-Sun) anchored at the requested log_date
  v_week_start := p_log_date - ((EXTRACT(ISODOW FROM p_log_date)::int) - 1);
  v_week_end := v_week_start + 6;

  SELECT cp.challenge_id INTO v_challenge_id
    FROM challenge_participations cp
   WHERE cp.id = p_participation_id;
  IF v_challenge_id IS NULL THEN
    RAISE EXCEPTION 'participation not found';
  END IF;

  SELECT c.rest_days_per_week INTO v_budget
    FROM challenges c WHERE c.id = v_challenge_id;
  IF v_budget IS NULL THEN
    v_budget := 1;
  END IF;

  -- exclude the current day so re-marking the same day stays idempotent
  SELECT COUNT(*) INTO v_used
    FROM mission_logs ml
   WHERE ml.participation_id = p_participation_id
     AND ml.is_rest_day = true
     AND ml.log_date BETWEEN v_week_start AND v_week_end
     AND ml.log_date <> p_log_date;

  IF v_used >= v_budget THEN
    RAISE EXCEPTION 'weekly rest budget exhausted (%/% used)', v_used, v_budget;
  END IF;

  INSERT INTO mission_logs (participation_id, log_date, count, is_rest_day, updated_at)
  VALUES (p_participation_id, p_log_date, 0, true, now())
  ON CONFLICT (participation_id, log_date)
  DO UPDATE SET
    is_rest_day = true,
    count = 0,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_mission_rest_day(uuid, date) TO authenticated;

-- extend set_mission_log_count to write optional note while keeping signature stable
CREATE OR REPLACE FUNCTION set_mission_log_count(
  p_participation_id uuid,
  p_log_date date,
  p_count int,
  p_note text DEFAULT NULL
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

  INSERT INTO mission_logs (participation_id, log_date, count, note, is_rest_day, updated_at)
  VALUES (p_participation_id, p_log_date, p_count, p_note, false, now())
  ON CONFLICT (participation_id, log_date)
  DO UPDATE SET
    count = EXCLUDED.count,
    note = COALESCE(EXCLUDED.note, mission_logs.note),
    is_rest_day = false,
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;
