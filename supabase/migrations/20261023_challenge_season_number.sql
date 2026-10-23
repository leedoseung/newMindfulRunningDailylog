-- Lunge Challenge season identifier.
-- 1 = S1 (여름의 100일), 2 = S2 (가을의 30일), ...
-- UI uses SEASON {NN} label and gates S1-only cards/wraps.

ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS season_number int NOT NULL DEFAULT 1;

COMMENT ON COLUMN challenges.season_number IS
  '시즌 번호. 1=런지 챌린지 1기, 2=2기, …. UI 라벨/시즌 분기의 단일 소스.';
