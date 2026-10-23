-- Launch Lunge Challenge Season 2.
--
-- 실행 전 체크리스트:
--   1. 2026-10-23 마이그레이션 (`20261023_challenge_season_number.sql`) 적용 완료 여부
--   2. 코드 배포 완료 (challenge-repository / get-my-challenge-card 가 season_number SELECT)
--   3. Supabase SQL console (또는 psql SERVICE_ROLE) 에서 실행
--
-- 멱등성: season_number=2 가 이미 존재하면 INSERT skip.
--         S1 'active' → 'ended' 는 조건부 UPDATE 이므로 이미 ended 면 no-op.
--
-- 2기 세팅:
--   title                 : 마인드풀러닝 런지 챌린지 2기
--   description           : 엉덩이의 꽃을 다시 피워보자 30일 런지 챌린지
--   start_date            : 2026-10-26 (월)
--   registration_deadline : 2026-10-25 (일) ← date 컬럼이라 '10/26 00:00 까지' = '10/25 마감'
--   goal_per_day          : 100
--   duration_days         : 30
--   pass_count            : 5
--   goal_min              : 10
--   rest_days_per_week    : 1
--   image_url             : NULL (추후 UPDATE)

BEGIN;

-- 1) 1기 종료.
UPDATE challenges
   SET status = 'ended'
 WHERE season_number = 1
   AND status = 'active';

-- 2) 2기 insert (upcoming 상태로 모집 시작).
--    start_date 도달 시 별도 UPDATE 로 'active' 전환하거나,
--    schedule/cron edge function 으로 자동화.
INSERT INTO challenges (
  title,
  description,
  goal_per_day,
  duration_days,
  start_date,
  registration_deadline,
  pass_count,
  status,
  image_url,
  goal_min,
  rest_days_per_week,
  season_number
)
SELECT
  '마인드풀러닝 런지 챌린지 2기',
  '엉덩이의 꽃을 다시 피워보자 30일 런지 챌린지',
  100,                              -- goal_per_day
  30,                               -- duration_days
  '2026-10-26'::date,               -- start_date (월)
  '2026-10-25'::date,               -- registration_deadline (일 자정 마감)
  5,                                -- pass_count
  'upcoming',
  NULL,                             -- image_url (추후 UPDATE)
  10,                               -- goal_min
  1,                                -- rest_days_per_week
  2                                 -- season_number
WHERE NOT EXISTS (
  SELECT 1 FROM challenges WHERE season_number = 2
);

COMMIT;

-- 검증 쿼리 (별도 실행):
-- SELECT id, title, status, season_number, duration_days, goal_per_day,
--        start_date, registration_deadline
--   FROM challenges
--  ORDER BY season_number ASC;
