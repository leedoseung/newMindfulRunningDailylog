-- challenges
CREATE TABLE challenges (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                   text NOT NULL,
  description             text,
  goal_per_day            int NOT NULL DEFAULT 100,
  duration_days           int NOT NULL DEFAULT 100,
  start_date              date NOT NULL,
  registration_deadline   date NOT NULL,
  pass_count              int NOT NULL DEFAULT 5,
  status                  text NOT NULL CHECK (status IN ('upcoming','active','ended')),
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- challenge_participations
CREATE TABLE challenge_participations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id        uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  member_id           uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  joined_at           timestamptz NOT NULL DEFAULT now(),
  passes_remaining    int NOT NULL,
  completed_at        timestamptz,
  failed_at           timestamptz,
  UNIQUE (challenge_id, member_id)
);

-- mission_logs
CREATE TABLE mission_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participation_id  uuid NOT NULL REFERENCES challenge_participations(id) ON DELETE CASCADE,
  log_date          date NOT NULL,
  count             int NOT NULL DEFAULT 0,
  completed         boolean GENERATED ALWAYS AS (count >= 100) STORED,
  used_pass         boolean NOT NULL DEFAULT false,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participation_id, log_date)
);

CREATE INDEX idx_mission_logs_log_date ON mission_logs (log_date);
CREATE INDEX idx_mission_logs_participation_date ON mission_logs (participation_id, log_date DESC);
CREATE INDEX idx_challenge_participations_member ON challenge_participations (member_id);

-- RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges_read_authenticated" ON challenges
  FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE challenge_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participations_read_authenticated" ON challenge_participations
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "participations_insert_self" ON challenge_participations
  FOR INSERT WITH CHECK (
    member_id::text = (auth.jwt() -> 'user_metadata' ->> 'member_id')
  );
CREATE POLICY "participations_update_self" ON challenge_participations
  FOR UPDATE USING (
    member_id::text = (auth.jwt() -> 'user_metadata' ->> 'member_id')
  )
  WITH CHECK (
    member_id::text = (auth.jwt() -> 'user_metadata' ->> 'member_id')
  );

ALTER TABLE mission_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mission_logs_own" ON mission_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM challenge_participations p
      WHERE p.id = participation_id
        AND p.member_id::text = (auth.jwt() -> 'user_metadata' ->> 'member_id')
    )
  );
