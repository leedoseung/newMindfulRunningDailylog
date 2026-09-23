# Plan — 런지 S1 마무리 대시보드 + 성취 뱃지 조합 (2026-09-23)

**Vision:** 마인드풀 커뮤니티에 어울리는 감동적 마무리. 우열 대신 각자의 여정을 인정. 44명 전원이 자기 이야기를 갖는 페이지.

## 결정된 방향

1. **뱃지 시스템 B**: 기본 완주 뱃지 + 여러 성취 뱃지 조합 (등급 대신)
2. **대시보드 페이지**: 기존 `/mission` 확장 → ended 모드. 44명 전원 + 데일리 메시지 벽
3. **감동적 톤**: voice-card 인용문 스타일, 부드러운 색조

---

## 성취 뱃지 카탈로그

**모두 획득 가능한 기본:**
- 🌱 `finisher`: 100일 완주자 (13명)

**연속 성취 (최상위만 부여):**
- 🔥 `streak_90`: 90일 이상 연속 (설재영, 이미애)
- 🔥 `streak_60`: 60~89일 연속 (백미라)
- 🔥 `streak_30`: 30~59일 연속 (신순주, 김희은, 수Sue)

**단독 성취:**
- 💯 `perfect_100`: 100/100 도장 + 모든 도장 100회+ + rest만 대체 (설재영 단독)
- ✨ `no_pass`: 패스 안 씀 (설재영, 신순주)
- 💪 `revived`: 부활 후 완주 (5명)
- 🎯 `all_100_reps`: 모든 도장 100회 이상 (설재영, 이미애 외)
- 👥 `multi_gen`: 다기 완주 (신순주 3·4·5기, 백미라 4·5기)

각 참가자는 여러 개 획득 가능. 위계 없음.

---

## 기존 인프라 (재사용)

| 요소 | 위치 | 확장 여부 |
|---|---|---|
| `grant_challenge_badge` RPC | `supabase/migrations/20260617_member_badges.sql` | **마이그레이션 필요**: dedupe 키를 `challenge_id` → `(challenge_id, code)` |
| `Badge` 타입 | `challenge-badge.tsx:3` | `code?: string` 추가 |
| `computeMaxStreak` | `src/domain/diary/wrapped-stats.ts:33` | 그대로 재사용 |
| `GetChallengeLeaderboardUseCase` | 44명 풀 데이터 반환 | 그대로 재사용 |
| `voice-card` 스타일 | `src/presentation/components/diary/wrapped-cards/voice-card.tsx` | 메시지 카드 원형 |
| `challenge-roster.tsx` | 44명 로스터 렌더 | 확장 |
| `mission-page-client.tsx` | 모드별 라우팅 | `ended` 모드 추가 |

---

## Phase A — 뱃지 시스템 확장

### A-1. 마이그레이션: 복합 dedupe 키
- 새 파일: `supabase/migrations/20260923_composite_badge_dedupe.sql`
- 기존 `grant_challenge_badge` 함수 재정의: dedupe on `(challenge_id, coalesce(code, 'finisher'))`
- 기존 badge (code 없음) → 'finisher'로 취급 = 하위 호환

### A-2. 성취 카탈로그
- 새 파일: `src/domain/badges/achievement-catalog.ts`
- `ACHIEVEMENTS = { FINISHER: {...}, PERFECT_100: {...}, ... } as const`
- 타입: `AchievementCode = typeof ACHIEVEMENTS[keyof]['code']`

### A-3. Badge 타입 확장
- `src/presentation/components/profile/challenge-badge.tsx:3-7`
- `Badge = { challenge_id, challenge_title, completed_at, code?, stats? }`
- 렌더링 key: `${challenge_id}-${code ?? 'finisher'}`

### A-4. 성취 도출 유틸
- 새 파일: `src/domain/badges/derive-achievements.ts`
- 순수 함수: `deriveLungeS1Achievements(participation, logs) → AchievementCode[]`
- 입력: participation + mission_logs
- 로직: streak/pass/revived/all_100_reps 검사

### A-5. TDD
- `tests/unit/domain/badges/derive-achievements.test.ts`
- 13명 스냅샷 검증

---

## Phase B — 뱃지 부여 (13명)

### B-1. 부여 스크립트
- 새 파일: `scripts/grant-lunge-s1-badges.mjs` (스크래치)
- 로직:
  1. 13 완주자 로드
  2. 각자 achievements 도출
  3. base finisher + achievements 각각 RPC 호출
  4. multi_gen 하드코딩 매핑 (신순주, 백미라)
  5. revived 하드코딩 (부활 이력이 revived_at에 없어서)

### B-2. 실행 & 검증
- DB에서 각 멤버 challenge_badges 확인
- 뱃지 개수/코드 확인

---

## Phase C — 프로필 UI 확장

### C-1. ChallengeBadge 컴포넌트 리팩터
- 기본 뱃지 + 성취 뱃지 그룹 렌더
- 아이콘 + 라벨 (아카이빙 카드 스타일)
- 카드 스타일: 부드러운 그라디언트, 아이콘 크게, 라벨 작게

### C-2. 프로필 페이지 반영
- 성취 뱃지 섹션 신규
- 기존 completed_at 표시는 finisher 뱃지 아래로

### C-3. TDD
- 컴포넌트 스냅샷 테스트 (여러 뱃지 조합)

---

## Phase D — 대시보드 페이지 (`/mission` ended 모드)

### D-1. Repo 확장
- `SupabaseChallengeRepository.getEnded()`: `status='ended'` 필터로 최근 챌린지 반환

### D-2. `mission/page.tsx` 분기
- 순서: getActive → 없으면 getEnded → 있으면 wrap 모드
- getEnded 있을 때 44명 leaderboard + 메시지 + 스탯 로드

### D-3. `mission-page-client.tsx`
- `mode='ended'` 추가 (기존 active/no-challenge/ended)

### D-4. 페이지 구성 (감동적 톤)

**섹션 순서:**
1. **히어로**: "런지 100일 시즌1 · 우리의 여정" + 시즌 요약 통계 (44명, 총 런지 N회, 총 도장 N개)
2. **완주자 명예 (13명)**: 각자 카드 (아바타 + 이름 + 성취 뱃지들 + 짧은 스탯)
3. **함께한 사람들 (31명)**: 실패했지만 여정을 함께한 참가자들. 부드럽게 인정
4. **데일리 메시지 벽**: mission_logs.note 있는 로그를 voice-card 스타일로 스크롤 (전체 44명 대상)
5. **시즌 아카이브**: 총 런지 횟수, 총 도장 수, 최장 연속, 단체 성취
6. **다음 시즌 CTA** (있으면)

### D-5. 컴포넌트
- 새: `LungeS1WrapHero` — 히어로 카드
- 새: `LungeS1FinisherRoster` — 완주자 그리드
- 새: `LungeS1JourneyRoster` — 미완주자 부드럽게
- 새: `LungeS1MessageWall` — 메시지 벽
- 새: `LungeS1SeasonStats` — 통계 카드

### D-6. TDD
- 유스케이스 단위 테스트 (aggregation, filter)
- 페이지 SSR 테스트 (기본 렌더)

---

## Phase E — 데일리 메시지 벽 (Phase D 내부)

### E-1. 유스케이스
- 새 파일: `src/application/use-cases/get-challenge-messages.ts`
- 로직:
  - mission_logs where challenge_id + note is not null + not empty
  - 최신순 정렬
  - 페이지네이션 (예: 20개씩)
  - 조인: member 이름/아바타

### E-2. 컴포넌트
- `LungeS1MessageWall`:
  - 각 메시지 = 카드 (아바타 + 이름 + 날짜 + 인용문)
  - voice-card 스타일 (italic serif, `#FFF6F5` bg, `‟…"`)
  - 스크롤 or "더보기" 버튼

### E-3. TDD
- 유스케이스: note 있는 로그만 필터
- 컴포넌트: 메시지 렌더

---

## Phase F — 홈 진입점

### F-1. 신규 배너: `SeasonWrapBanner`
- 위치: `home-feed.tsx`, H1DashboardBanner와 병렬
- 게이팅: 시즌 종료 후 N일 (예: `todayKst >= '2026-09-23' && todayKst <= '2026-10-15'`)
- 링크: `/mission` (ended 모드로 라우팅)
- 톤: "우리의 100일이 담긴 이야기"

---

## 리스크 & 결정 사항

1. **부활 이력 유실**: 이번 세션 첫부활 5명 (박경애/이세영/류순영/이훈영/황유숙/이훈영 중 재부활은 revived_at 있음)의 데이터가 revived_at에 없음 → 하드코딩 매핑 유지
2. **미완주자 (31명) 노출**: 감정적으로 부담될 수 있음 → 이름만 or 아바타만, 스탯 표시 X
3. **메시지 벽 프라이버시**: mission_logs.note는 원래 개인 공간이었음 → 커뮤니티 공개는 정책 결정
   - 옵션: opt-in (본인이 공개 표시) or 전체 공개 or 완주자만
   - **권장: 전체 공개** (마인드풀 커뮤니티 = 서로 응원). 단 첫 배포 전 카톡 공지
4. **JW 미결**: 아직 JW 미확인 → 뱃지 부여 전 확정 필요

---

## 우선순위 & 순서

**이번 세션 (Phase A~C):**
1. A-1: 마이그레이션 (composite dedupe)
2. A-2~A-4: 카탈로그 + 타입 + 도출 유틸
3. A-5: TDD
4. B-1~B-2: 뱃지 부여 실행
5. C-1~C-3: 프로필 UI + TDD
6. 커밋 3개 (마이그레이션 / 카탈로그+로직 / UI)

**다음 세션 (Phase D~F):**
7. D-1~D-6: 대시보드 페이지
8. E-1~E-3: 메시지 벽
9. F-1: 홈 배너
10. 커밋 3개

---

## 커밋 계획

- `feat(badges): composite dedupe for multi-badge grants (migration)`
- `feat(badges): achievement catalog + derivation for lunge S1`
- `chore(script): grant lunge S1 achievement badges to 13 finishers`
- `feat(profile): render achievement badges alongside base badge`
- `feat(mission): ended-mode wrap-up dashboard for finished seasons`
- `feat(mission): daily message wall from mission_logs notes`
- `feat(home): season wrap banner linking to /mission`

각 커밋: pre-commit 훅 (lint + typecheck + tests) 통과.
