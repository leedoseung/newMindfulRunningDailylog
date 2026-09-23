# Plan — Lunge S1 완주 어드밴티지 (2026-09-22)

**Scope:** 4개 등급 (Platinum/Gold/Silver/Bronze) 어드밴티지를 순차 구현. 13명 완주자 대상.

## 확정된 등급

| 등급 | 인원 | 명단 |
|---|---|---|
| 💯 Platinum (그랜드마스터) | 1 | 설재영 |
| 🥇 Gold (무결점) | 1 | 신순주 |
| 🥈 Silver (패스 완주) | 6 | 이미애, 백미라, 김희은, 수Sue, 김종훈, 윤정화 |
| 🥉 Bronze (부활 완주) | 5 | 황유숙, 이훈영, 박경애, 이세영, 류순영 |

## 기존 인프라 (재활용)

- `grant_challenge_badge` RPC — jsonb 자유 스키마, tier 필드 추가 무리 없음
- `ChallengeBadge` 컴포넌트 (`src/presentation/components/profile/challenge-badge.tsx`) — 유일 표시 지점
- `GetChallengeLeaderboardUseCase` — `isCompleted` 필드로 완주자 필터
- `CertificateCard` (`src/presentation/components/mission/certificate-card.tsx`) — 티어 확장 기반
- `html2canvas` 익스포트 패턴 (`src/presentation/components/feed/detail-sheet.tsx:216-340`) — 검증됨
- `pg_cron issue-completion-badges` — 매일 KST 01:00 실행

---

## Phase 1 — 뱃지 부여 (즉시 반영)

### 1-1. `completed_at` 마크
- 오늘(9/22) = 챌린지 100일차. 크론 `issue-completion-badges`는 KST 01:00 실행 → 오늘 새벽 시점엔 아직 100일 조건 미충족 → 자동 반영은 내일(9/23) 새벽
- **수동 반영**: 스크립트로 13명 `completed_at = now()` 세팅

### 1-2. Badge 타입 확장
- `src/presentation/components/profile/challenge-badge.tsx:3-7` — Badge type
- 필드 추가: `tier: 'platinum' | 'gold' | 'silver' | 'bronze'` (as const)
- 필드 추가: `stats?: { actualRunDays, restDays, passesUsed, revived }`
- 기존 데이터 호환: `tier` optional 처리 or 기본값 'silver'

### 1-3. Badge 부여 스크립트
- 위치: `scripts/grant-lunge-s1-badges.ts` (scratchpad or 프로젝트 루트)
- 로직:
  1. 13명 참가 id 조회
  2. 등급 결정 (하드코딩 매핑 — 위 명단)
  3. `supabase.rpc('grant_challenge_badge', { p_member_id, p_badge: { challenge_id, challenge_title, completed_at, tier, stats } })`
  4. 부여 성공 로그

### 1-4. `ChallengeBadge` UI 티어 스타일
- 티어별 색상 매핑 (as const):
  - Platinum: `#7C2D92 → #1E1B4B` (milestone-toast 참조)
  - Gold: `#d4a017`
  - Silver: `#94a3b8`
  - Bronze: `#b45309`
- 티어 라벨 표기 ("💯 그랜드마스터", "🥇 무결점", "🥈 패스 완주", "🥉 부활 완주")

### 1-5. 테스트 (TDD)
- `tests/unit/components/challenge-badge.test.tsx` — 티어별 렌더 스냅샷
- 기존 배지 (tier 없는) 폴백 렌더

**Verify:** typecheck + lint + test 통과 후 프로필 페이지 육안 확인.

---

## Phase 2 — 명예의 전당 페이지 (`/hall-of-fame`)

### 2-1. 라우트
- `src/app/hall-of-fame/page.tsx` — 서버 컴포넌트, public
- `unstable_cache` + `revalidateTag('challenge-completers')` (리더보드 패턴 미러링)

### 2-2. 유스케이스
- 신규: `src/application/use-cases/get-challenge-hall-of-fame.ts`
- 입력: `challengeId`
- 출력: `{ tier: 'platinum'|..., members: [{name, avatarUrl, memberId, stats}] }[]`
- 로직:
  1. `GetChallengeLeaderboardUseCase` 재사용 or 직접 조회
  2. 완주자(`isCompleted`) 필터
  3. Tier 도출: badge에 저장된 tier 우선, 없으면 stats 기반 재계산

### 2-3. UI
- 4 섹션 (Platinum → Gold → Silver → Bronze)
- 각 섹션: 티어 헤더 (컬러 그라디언트) + 참가자 카드 그리드
- Platinum 섹션: 단독 포디움 스타일 (leaderboard `PodItem` 참조)
- Gold/Silver/Bronze: 아바타 그리드 + 이름 + 미니 스탯
- 다기 완주자 표시: `generation` 뱃지 추가 (신순주 3·4·5기, 백미라 4·5기)

### 2-4. 진입점
- 홈 배너 (`H1DashboardBanner` 옆에 신규 `HallOfFameBanner` 추가)
  - 게이팅: 챌린지 종료 후 N일간 노출 (e.g. `todayKst <= '2026-10-15'`)
- (옵션) `bottom-nav.tsx` 추가 여부 — 상시 진입은 과할 수 있음. 배너만 추천

### 2-5. 테스트
- 유스케이스 단위 테스트: 등급별 그룹핑
- 페이지 통합 테스트: SSR 렌더 스냅샷

---

## Phase 3 — 완주 인증 카드 (셰어러블)

### 3-1. 티어 컴포넌트
- `src/presentation/components/mission/certificate-card.tsx` — 티어 variant prop 추가
- 4 variant: 그라디언트 프레임 + 티어 라벨 + 스탯 요약

### 3-2. 셰어 버튼
- 신규: `src/presentation/components/mission/certificate-share-button.tsx`
- 로직: `feed/detail-sheet.tsx:216-340` `handleSaveImage()` 발췌
- 오프스크린 ref → html2canvas → `navigator.share({files})` + download fallback

### 3-3. 인증 페이지 확장
- `src/app/mission/certificate/[participationId]/page.tsx`
- Tier 계산: 해당 참가자의 badge에서 tier 읽기 (or stats 재계산)
- CertificateCard에 variant 전달 + 셰어 버튼 배치

### 3-4. OG 이미지
- `opengraph-image.tsx` 티어별 색상 반영 (선택)

### 3-5. 테스트
- CertificateCard 스냅샷 4종
- 셰어 버튼 통합 테스트 (html2canvas 모킹)

---

## Phase 4 — 시즌2 사전등록 권한

**전제:** 시즌2 챌린지 데이터 확정 (별도 결정 필요).

### 4-1. 스키마
- 옵션 A: `challenges` 테이블에 `early_access_deadline` + `regular_deadline` 컬럼 추가
- 옵션 B: 신규 테이블 `challenge_early_access` (challenge_id, member_id)
- **권장: A** — 마이그레이션 최소

### 4-2. Enroll 유스케이스 확장
- `src/application/use-cases/enroll-challenge.ts:29`
- 로직 추가: `today > early_access_deadline` 이면 badge 확인 → 이전 시즌 완주 badge 있으면 통과
- 실패 시 `EARLY_ACCESS_ONLY` reason 리턴

### 4-3. UI 반영
- 챌린지 등록 페이지에 "사전 등록 가능" / "일반 등록" 배지 표시
- 완주자에게만 "사전 등록" 버튼 노출

### 4-4. 테스트
- 유스케이스: 사전 등록 기간에 뱃지 있/없 케이스
- 통합 테스트: 뱃지 없는 유저 차단 확인

---

## Phase 5 — 시즌2 부활권 상속

**전제:** Phase 4 완료.

### 5-1. Enroll 시 초기 pass 계산
- `enroll-challenge.ts` 확장
- 로직: 신규 참가자에게 tier 기반 bonus pass
  - Platinum: `passCount + 3`
  - Gold: `passCount + 2`
  - Silver: `passCount + 0`
  - Bronze: `passCount + 0`
- 기존 참가자엔 영향 없음

### 5-2. 도메인 상수
- `src/domain/entities/challenge-tier-bonus.ts` — as const 매핑

### 5-3. 테스트
- 각 tier별 초기 pass 값 검증
- Tier 없는 유저 = 기본 passCount

---

## 리스크 & 확인 사항

1. **`completed_at` 미세팅**: 오늘 크론이 아직 안 돌아서 자동 반영은 내일 새벽. 수동 반영 스크립트로 바로 처리 (Phase 1-1).
2. **부활 이력 유실**: 첫부활자(박경애, 이세영, 류순영, 정남C 등)는 `revived_at`이 null. 등급 재계산 시 이 데이터로 판별 불가 → **하드코딩 매핑** 사용 (Phase 1-3).
3. **다기 완주자 표시**: 신순주, 백미라 — Phase 2 UI에서만 반영. 뱃지 자체에는 별도 필드 X.
4. **Season2 미확정**: Phase 4/5는 시즌2 챌린지 스펙(시작일, registration_deadline, 등록 흐름) 확정 전엔 진행 불가. Phase 3까지 완료 후 Season2 브레인스토밍 세션 필요.

## 순서 확정

1. **Phase 1** (뱃지 부여) — 즉시, 이번 세션 완료 가능
2. **Phase 2** (명예의 전당) — 이어서, 이번 세션 or 다음 세션
3. **Phase 3** (인증 카드) — Phase 2 후
4. **Phase 4/5** (시즌2) — 시즌2 스펙 확정 후 별도 세션

---

## 커밋 계획

- Phase 1: `feat(challenge): grant tier badges to lunge S1 completers` (스크립트) + `feat(profile): render tier badges` (UI)
- Phase 2: `feat(hall-of-fame): add lunge S1 hall of fame page`
- Phase 3: `feat(certificate): add tier-based cert card with share`
- Phase 4: `feat(challenges): early enrollment for prior-season completers`
- Phase 5: `feat(challenges): tier-based initial pass bonus`

각 커밋: pre-commit 훅 (lint + typecheck + tests) 통과 필수.
