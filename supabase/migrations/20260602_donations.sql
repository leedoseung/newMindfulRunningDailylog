-- donations table: 월별 기부 기록
CREATE TABLE donations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  year_month  text NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  duration_min integer NOT NULL,
  amount      integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, year_month)
);

-- Public read RLS (writes handled via service_role in API routes)
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "donations_select_public" ON donations FOR SELECT USING (true);
