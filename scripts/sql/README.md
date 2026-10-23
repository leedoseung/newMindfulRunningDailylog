# scripts/sql

Supabase SQL console 또는 psql 로 수동 실행하는 운영 스크립트.

## ⚠️ 배포 순서 (중요)
이번 변경은 **마이그레이션 선적용 → 코드 배포** 순서가 **필수**다.

이유: `src/infrastructure/supabase/challenge-repository.ts` 와
`src/application/use-cases/get-my-challenge-card.ts` 의 Supabase SELECT 문자열에
`season_number` 가 포함됐다. 컬럼이 없는 상태로 코드가 배포되면 Supabase 가 SELECT
파싱 단계에서 에러 반환 → 모든 챌린지 쿼리 500. 애플리케이션의 `?? 1` 폴백은 쿼리
자체가 실패하므로 **적용되지 않는다**.

**순서:**
1. Supabase SQL console 에서 `supabase/migrations/20261023_challenge_season_number.sql` 적용
   (또는 `supabase db push`).
2. `SELECT season_number FROM challenges LIMIT 1;` 로 컬럼 존재 확인.
3. **그 다음** 코드 배포 (vercel / 등).
4. 2기 론칭 시점에 아래 `launch-lunge-s2.sql` 실행.

## launch-lunge-s2.sql
런지 챌린지 2기 모집 시작.

### 선행
1. 위 "배포 순서" 완료 (`season_number` 컬럼 존재).
2. S1 row 는 default 1 로 자동 backfill 됨.

### 실행
1. 파일 복사 후 placeholder 치환:
   - `<S2_TITLE>` — 예: `'런지 챌린지 2기'`
   - `<S2_DESCRIPTION>` — 예: `'하루 100개, 30일. 다시 뛰는 가을.'`
   - `<S2_START_DATE>` — `'YYYY-MM-DD'`
   - `<S2_REGISTRATION_DEADLINE>` — `'YYYY-MM-DD'`
   - `<S2_IMAGE_URL_OR_NULL>` — `'https://...'` 또는 `NULL` (따옴표 X)
2. Supabase Dashboard → SQL Editor 에 붙여넣고 실행.
3. 결과 확인:
   ```sql
   SELECT season_number, status, title, duration_days
     FROM challenges ORDER BY season_number;
   ```

### 멱등성
- `season_number=2` row 가 이미 있으면 INSERT skip.
- S1 status 가 이미 `ended` 면 UPDATE no-op.
- 안전하게 재실행 가능.

### start_date 도달 시
```sql
UPDATE challenges
   SET status = 'active'
 WHERE season_number = 2 AND status = 'upcoming';
```
수동 또는 cron edge function.
