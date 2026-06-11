# 100일 런지 챌린지 — 디자인 스펙

**Date:** 2026-06-11
**Author:** brainstorm session
**Status:** approved (pending user spec review)

## 요약

매일 런지 100개 미션을 100일 동안 수행하는 시즌제 챌린지. 달성한 날에는 마인드풀러닝 로고가 빨강 인주로 찍힌 도장이 100칸 벽에 누적된다. 면죄권 5장으로 0개 한 날 자동 보완. 면죄권 소진 후 0개 = 챌린지 실패. 100일 완주 시 인증서 + 영구 프로필 뱃지.

## 핵심 결정

| 항목 | 결정 |
|---|---|
| 목적 | 런닝 보조운동 (코어/하체 보강) |
| 빈도 | 매일 무조건 100개 (런 여부 무관) |
| 카운트 방식 | 빠른 버튼 (+10/+20/+50) 누적, 100 초과 입력 허용 (판정은 cap 100) |
| 부분 달성 | 진행률 표시 + streak 유지 (관대) |
| streak 유지 기준 | 1개 이상 = 유지. 0개 = 면죄권 자동 차감 후 유지. 면죄권 0 + 0개 = 실패 |
| 챌린지 구조 | 시즌제 (앱 공식, 운영자 1행씩 생성, 모두 동일 시작/종료) |
| 시즌 진입 | 공지 → 사전 모집 → 시작일 일제 시작 |
| 합류 윈도우 | 시작일 + 3일 이내 |
| 면죄권 | 시즌 동안 총 5장. 0개 입력 일 = 자정 cron이 자동 차감 |
| 진입점 | 하단 탭 추가 (5번째 — 미션) |
| 메인 시각화 | 100칸 도장 벽 (10×10). 검정 원 테두리 + 빨강 R 로고 |
| 입력 UX | 큰 카운터 + 진행 링 + (+10/+20/+50) 버튼 |
| 소셜 | 알림 피드 ("X님이 47일 달성") |
| 완주 보상 | 공유 인증서 + 영구 프로필 뱃지 |
| 푸시 알림 | 매일 KST 20:00 미달성 사용자 OS 푸시 (Web Push, PWA) |
| 인프라 | Supabase 중심 (Edge Functions + pg_cron + web-push) |
| 접근 권한 | RLS, member_id = auth.uid() |

## 데이터 모델

### 신규 테이블 (Supabase)

```sql
-- 시즌 (운영자 생성)
create table challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  goal_per_day int not null default 100,
  duration_days int not null default 100,
  start_date date not null,
  registration_deadline date not null,
  pass_count int not null default 5,
  status text not null check (status in ('upcoming','active','ended')),
  created_at timestamptz not null default now()
);

-- 멤버 참가
create table challenge_participations (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  joined_at timestamptz not null default now(),
  passes_remaining int not null,
  completed_at timestamptz,
  failed_at timestamptz,
  unique (challenge_id, member_id)
);

-- 일별 미션 로그
create table mission_logs (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references challenge_participations(id) on delete cascade,
  log_date date not null,
  count int not null default 0,
  completed boolean generated always as (count >= 100) stored,
  used_pass boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (participation_id, log_date)
);

-- Web Push 구독
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (member_id, endpoint)
);

create index on mission_logs (log_date);
create index on mission_logs (participation_id, log_date desc);
create index on challenge_participations (member_id);
```

### RLS

```sql
alter table challenges enable row level security;
create policy read_challenges on challenges
  for select using (auth.uid() is not null);
create policy write_challenges on challenges
  for all using (auth.jwt() ->> 'role' = 'admin');

alter table challenge_participations enable row level security;
create policy read_participations on challenge_participations
  for select using (auth.uid() is not null);
create policy insert_own_participation on challenge_participations
  for insert with check (member_id = auth.uid());
create policy update_own_participation on challenge_participations
  for update using (member_id = auth.uid()) with check (member_id = auth.uid());

alter table mission_logs enable row level security;
create policy own_mission_logs on mission_logs
  for all using (
    exists (select 1 from challenge_participations p
            where p.id = participation_id and p.member_id = auth.uid())
  );

alter table push_subscriptions enable row level security;
create policy own_push_sub on push_subscriptions
  for all using (member_id = auth.uid());
```

### 핵심 로직 정의

- **셀 상태 (도장 벽)**: 시즌 시작일 기준 N일차 셀
  - `today` — 오늘 날짜
  - `done` — `count >= 100`
  - `partial` — `count > 0 AND count < 100`
  - `pass` — `used_pass = true`
  - `empty` — 시작일 ~ 오늘 사이 log row 없음 + 미래 시작일 이전이 아닌 경우 (= miss로 분류)
  - `future` — 시작일 이후 미래 일자
- **streak** — 오늘 또는 어제부터 역순 스캔, `count > 0 OR used_pass = true` 인 연속 일수
- **completed 판정** — 시즌 종료 시 `count >= 100 OR used_pass = true` 인 일수가 `duration_days(=100)` 와 같은 참가자 → `completed_at` 기록 → 영구 뱃지 부여
- **failed 판정** — 자정 cron이 `passes_remaining = 0` 상태에서 0개 입력 일을 감지하면 `failed_at` 기록 → 이후 read-only
- **부분 달성 일 (1~99개)** — streak 유지에는 카운트. 면죄권 차감 X. **그러나 100일 완주 판정에는 미달 일로 카운트** (count >= 100 조건 미충족). 결과: 부분 달성으로 streak는 유지되더라도 시즌 종료 시 100일 완주 뱃지는 못 받는 시나리오 존재. UI에서 사용자에게 명확히 안내 ("오늘 100개 채워야 완주 카운트").
- **합류 윈도우 경계** — `registration_deadline = start_date + INTERVAL '3 days'` (시작일 D+0, D+1, D+2, D+3 까지 합류 가능 = 총 4일). 마감일 24:00 KST 이후 차단.

## 아키텍처

기존 클린 아키텍처 패턴 따름 (domain → application → infrastructure → presentation).

### 디렉토리 추가

```
src/domain/entities/
  challenge.ts
  challenge-participation.ts
  mission-log.ts
  mission-day-cell.ts

src/domain/repositories/
  challenge-repository.ts
  challenge-participation-repository.ts
  mission-log-repository.ts
  push-subscription-repository.ts

src/application/use-cases/
  get-active-challenge.ts
  enroll-challenge.ts
  log-mission-count.ts
  get-mission-board.ts
  get-challenge-feed.ts
  run-daily-pass-check.ts
  issue-completion-badge.ts
  subscribe-push.ts

src/infrastructure/supabase/
  challenge-repository.ts
  challenge-participation-repository.ts
  mission-log-repository.ts
  push-subscription-repository.ts

src/presentation/components/mission/
  mission-board.tsx
  stamp-cell.tsx
  today-counter.tsx
  challenge-header.tsx
  challenge-feed.tsx
  enroll-card.tsx
  ios-install-guide-sheet.tsx
  completion-sheet.tsx
  certificate-card.tsx

src/app/mission/
  page.tsx
  enroll/page.tsx
  certificate/[id]/page.tsx

src/app/api/challenges/
  active/route.ts                  GET
  enroll/route.ts                  POST
  feed/route.ts                    GET
  mission/route.ts                 POST  (카운트 입력)
  mission/board/route.ts           GET

src/app/api/push/
  subscribe/route.ts               POST
  unsubscribe/route.ts             POST

supabase/migrations/
  20260611_challenge_tables.sql
  20260611_challenge_rls.sql
  20260611_push_subscriptions.sql

supabase/functions/
  mission-reminder/index.ts        Edge Function (KST 20:00 푸시)
  daily-pass-check/index.ts        Edge Function (KST 00:00 면죄권 차감)

public/sw.js                       Service Worker (push, click)
```

### Cron (Supabase pg_cron)

```sql
-- KST 00:00 = UTC 15:00
select cron.schedule(
  'mission-daily-pass-check',
  '0 15 * * *',
  $$ select net.http_post(url := '<edge-fn-url>/daily-pass-check', headers := jsonb_build_object('Authorization', 'Bearer <service-role-jwt>')) $$
);

-- KST 20:00 = UTC 11:00
select cron.schedule(
  'mission-reminder',
  '0 11 * * *',
  $$ select net.http_post(url := '<edge-fn-url>/mission-reminder', headers := jsonb_build_object('Authorization', 'Bearer <service-role-jwt>')) $$
);
```

### Web Push 흐름

1. 사용자가 챌린지 참가 클릭
2. (iOS && PWA 미설치) → `ios-install-guide-sheet`
3. `Notification.requestPermission()` → granted 시 `PushManager.subscribe({applicationServerKey: VAPID_PUBLIC_KEY})`
4. 결과를 `/api/push/subscribe` 로 POST → `push_subscriptions` 저장
5. KST 20:00 Edge Function이 오늘 count=0 참가자의 구독을 조회 → `web-push` (Deno 호환 fork) 로 발송
6. `sw.js` `push` 이벤트 → `showNotification("오늘 런지 0개", { body: "면죄권 N장 남음", data: { url: "/mission" } })`
7. 알림 클릭 → `clients.openWindow('/mission')`

## UI 사양

### 디자인 토큰 (기존 유지)
- 표면 `#F7F7F5`
- 카드 `#ffffff`
- 텍스트 `#111111`
- 보조 `#888888`
- 보더 `#EBEBEB`
- 폰트 Pretendard Variable
- 빨강 인주 `#b8231f` (도장 로고 색)

### 100칸 도장 벽
- 10열 × 10행 그리드, 셀 gap 6~8px
- 셀 = `aspect-ratio: 1`
- `done` — 검정 1.5px 원 테두리 + 빨강 R 로고 (background-image, 75% size, center). 미세 회전 `(seed=date)`.
- `today` — 검정 점선 2px 원 테두리
- `partial` — 회색 1.5px 원 테두리 + 옅은 R 로고
- `pass` — 회색 빗금 원
- `empty/future` — 점선 회색 placeholder

### TodayCounter
- 상단 진행 링 (`<svg>` conic-gradient or stroke-dasharray) — 현재 카운트 / 100
- 중앙 큰 숫자 (예: `47`)
- 하단 `+10` / `+20` / `+50` 버튼 + 직접 입력 옵션 (작은 버튼)
- 100 도달 시 도장 찍히는 애니메이션 (scale 0→1, opacity 0→1, rotate seed, 0.6s)

### ChallengeHeader
- 좌: `Day 47 / 100`
- 우: `streak 12🔥` · `면죄권 4/5`

### ChallengeFeed
- Supabase Realtime subscribe `mission_logs` upsert
- 최근 20건, "X님이 47일째 달성", 시간순 desc
- 아바타 + 이름 + 일수

### 하단 탭 (5개)
`홈 / 기록 / 미션 / 리더보드 / 프로필`
- `IconStamp` 신규 (간단 원 + R)
- `width: 62 * 5 = 310` 폭 검증 OK

### 인증서 카드 (Certificate)
- `share-card.tsx` 패턴 차용
- 멤버 이름 + 챌린지 명 + 완주일 + 100칸 풀 도장 + 사인
- 공유 시 og 이미지 (Next.js OG generator)

### 가이드 시트 (iOS PWA 설치)
- Safari 감지 + `standalone` 미감지 → 시트 표시
- 단계: 공유 버튼 → "홈 화면에 추가"
- 이미지 가이드 3장

## 에러 / 엣지케이스

(섹션 4/5 표 참조 — spec에 인라인됨)

| 케이스 | 처리 |
|---|---|
| 시작일 전 입력 | API 400 `BEFORE_START` |
| 합류 마감 후 | API 400 `REGISTRATION_CLOSED` |
| 중복 enroll | unique → idempotent 200 |
| 미래 날짜 입력 | API 400 `INVALID_DATE` |
| 시즌 종료 후 입력 | API 400 `SEASON_ENDED` |
| 동시 +10 두 번 | upsert atomic increment |
| 100 초과 입력 | DB 저장, UI cap 100, 판정 `>= 100` |
| 자정 cron 중복 | upsert idempotent, used_pass 한 번만 |
| 자정 cron 누락 | 다음 cron이 지난 N일 윈도우 백필 |
| 면죄권 0 + 0개 | failed_at, read-only |
| 면죄권 0 + 1개 이상 | streak 유지, 차감 X |
| 푸시 거부 | 인앱 알림(notifications) 폴백 |
| iOS PWA 미설치 | 가이드 시트, 인앱만 동작 |
| Realtime 끊김 | focus refetch + 30s 폴백 |
| 시간대 | KST `Asia/Seoul`, 모든 비교 timezone-aware |
| 멤버 탈퇴 | cascade |
| 인증서 OG 실패 | fallback 카드 |

## 테스트 전략

- **Unit (vitest)** — domain entity, use-case 로직, 컴포넌트 props 분기
- **Integration (supabase)** — repository, RLS, atomic increment
- **E2E (playwright)** — 공지→참가→입력→도장→cron→완주→인증서, 면죄권 5장 소진→실패, iOS PWA 가이드
- **TDD 순서**: 도메인 → use-case → infrastructure → API → 컴포넌트 → E2E
- **엣지 강제**: KST 자정 경계, DST 없음 확인, 동시 +10 atomic, cron 중복, 면죄권 경계값, 100 도달 경계

## 환경 변수

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY    # 클라이언트 노출
VAPID_PRIVATE_KEY               # Edge Function 전용
VAPID_SUBJECT                   # mailto:admin@...
```

## 마이그레이션 순서

1. `20260611_challenge_tables.sql` — challenges, challenge_participations, mission_logs, push_subscriptions
2. `20260611_challenge_rls.sql` — RLS 정책
3. pg_cron 스케줄 등록
4. Edge Function 배포 (mission-reminder, daily-pass-check)
5. seed: 운영자가 challenges 첫 row 생성 (시작일 명시)

## 향후 확장 (out of scope MVP)

- 다른 미션 종류 (플랭크, 스쿼트) — `mission_logs` 에 `exercise_type` 추가하면 일반화 가능
- 친구 단위 비교 / 챌린지룸
- 카카오톡 알림톡 (도달률 강화)
- 런 완료 후 자연스러운 카운트 prompt (Approach C 통합 UX)
- 시즌 종료 후 다음 시즌 자동 등록

## 미해결 (구현 시 확인)

- Edge Function 의 web-push Deno 호환 라이브러리 선정 (`https://deno.land/x/webpush` 등 검증 필요)
- 운영자(admin) 역할 부여 메커니즘 — JWT custom claim vs members 테이블 컬럼
- 인증서 OG 이미지 생성 라이브러리 (Next.js `ImageResponse` + Satori 추천)
- IconStamp SVG 디자인 시안
- Edge Function URL + service-role JWT — Supabase 프로젝트 배포 후 결정. pg_cron 등록 SQL의 `<edge-fn-url>`, `<service-role-jwt>` 자리표시자는 마이그레이션 시점에 실제 값으로 치환.
- 부분 달성 일 정책: 현재 spec = "streak 유지하되 완주 판정엔 미달". UX 회고 후 V2에서 "50개 이상이면 완주 일로 인정" 같은 완화 옵션 도입 검토.
