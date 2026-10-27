-- S2 late-signup window: 모집 마감일을 11/02로 연장.
-- 챌린지는 이미 active 상태(10/26 시작). ChallengeAnnouncementBanner의
-- isLateRecruit UI와 EnrollChallengeUseCase의 소급 pass burn이 함께 동작한다.

UPDATE challenges
   SET registration_deadline = '2026-11-02'::date
 WHERE season_number = 2
   AND registration_deadline = '2026-10-25'::date;
