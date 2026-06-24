# Challenge Revive (중도이탈 재도전) — Design

**Date**: 2026-06-24
**Status**: Approved, ready for implementation plan
**Author**: 이두승 + Claude

## Problem

챌린지 중도이탈자(`challenge_participations.failed_at` set)에게 1회 한정 재도전 기회를 제공한다. 기존에는 한 번 fail되면 챌린지 종료까지 복귀 경로가 없다.

## Goals

- 이탈자에게 의미 있는 두 번째 기회 (단, 게임성 보존)
- 리더보드 공정성 유지 (재도전자는 명시적으로 라벨)
- 최소 모델 변경, 기존 daily-pass-check 로직 무수정

## Non-Goals

- 2회 이상 재도전
- 별도 "comeback 챌린지" 생성
- 패스 환불 (필요 시 별도 기능)
- 재도전 후 다시 실패 시 추가 회복 (이번 범위에서는 일반 failed 처리)

## Decisions (clarifying answers)

| 항목 | 결정 |
|---|---|
| 재도전 가능 시간 창 | 챌린지 절반 시점까지 (`today <= halfwayDate`) |
| 재도전 횟수 | 한 챌린지당 1회만 |
| Streak 처리 | revivedAt 기준 0부터 리셋, 리더보드에 ★재도전 라벨 |
| 진입점 | 챌린지 상세/로스터 페이지 상단 CTA |
| 패스 정책 | 원래 `challenge.passCount` 전액 복원 |
| 이탈 이전 mission_logs | 캘린더/로스터에서 회색 + "pre-revival" 라벨 |

## §1. 데이터 모델

```sql
-- supabase/migrations/<YYYYMMDD>_challenge_revive.sql
ALTER TABLE challenge_participations
  ADD COLUMN revived_at timestamptz NULL;
```

- `revived_at IS NULL` = 미사용
- `revived_at IS NOT NULL` = 1회 소진 (재도전 진행중 또는 종료)

**Halfway date** (KST 기준). Challenge 엔티티는 `endDate`가 없고 `startDate + durationDays`로 끝일을 구성:
```ts
function halfwayDate(c: Challenge): string {
  // startDate = "YYYY-MM-DD" (KST). 챌린지 day index 0..durationDays-1.
  // halfway = startDate + floor((durationDays - 1) / 2)
  return addDaysKst(c.startDate, Math.floor((c.durationDays - 1) / 2))
}
```
- `durationDays=30` → halfway = day index 14 (startDate +14일). today가 이 날짜 이하면 revive 가능.
- 단일 날짜 함수로 추출, server + client 공유 (`src/domain/challenge/halfway.ts`).

**Revive eligibility** (client + server 공유 predicate):
```ts
function canRevive(p: ChallengeParticipation, c: Challenge, today: string): boolean {
  return (
    p.failedAt !== null &&
    p.completedAt === null &&
    p.revivedAt === null &&
    today <= halfwayDate(c)
  )
}
```

## §2. UI/Flow

### 진입점
챌린지 상세/로스터 페이지 (`/mission/[challengeId]`) 상단 CTA. 자기 자신의 참가자 상태로만 노출. 홈 배너/day-detail-sheet에는 노출하지 않음.

### State 1 — Failed + eligible (revive 가능)
상단 강조 카드:
```
😢 챌린지 중도이탈
아직 절반 안 지났어요. 한 번 더 도전할 수 있어요.
・패스 {passCount}개 새로 받음
・streak 0부터 다시 시작
・남은 일수 {daysLeft}일
[재도전 시작 →]
```

### State 2 — Failed + halfway 지남 (revive 불가)
회색 info 카드:
```
중도이탈 · 재도전 기한 만료
다음 챌린지에서 만나요
```

### State 3 — Revived
- CTA 제거
- 로스터 자기 행에 `★재도전` 뱃지 (StatusBadge variant)
- 캘린더 grid: `date < failedAt` 셀은 opacity 0.4 + 작은 `pre` 라벨

### Confirm modal (CTA tap 시)
```
재도전 시작할까요?
・1회만 가능 (되돌릴 수 없음)
・오늘부터 streak 0으로 새로 시작
・패스 {passCount}개 충전
・리더보드에 ★재도전 라벨 표시

[취소]  [시작하기]
```
[시작하기] → `POST /api/challenges/[id]/revive` → 성공 시 페이지 refresh.

## §3. API + 서버 로직

### Route
`POST /api/challenges/[id]/revive`
- 인증된 세션 필수, 세션의 `memberId` 사용 (request body에서 받지 않음)
- 응답: `{ ok: true } | { ok: false, reason: 'NOT_ELIGIBLE' | 'CHALLENGE_NOT_FOUND' | 'NOT_PARTICIPATING' }`

### Use case
`src/application/use-cases/revive-challenge-participation.ts`:
```ts
class ReviveChallengeParticipationUseCase {
  async execute({ challengeId, memberId, today }): Promise<Result> {
    const challenge = await this.challengeRepo.get(challengeId)
    if (!challenge) return { ok: false, reason: 'CHALLENGE_NOT_FOUND' }

    const p = await this.participationRepo.getByMemberAndChallenge(memberId, challengeId)
    if (!p) return { ok: false, reason: 'NOT_PARTICIPATING' }

    if (!canRevive(p, challenge, today)) {
      return { ok: false, reason: 'NOT_ELIGIBLE' }
    }

    await this.participationRepo.revive(p.id, challenge.passCount)
    return { ok: true }
  }
}
```

### Repo method
`SupabaseChallengeParticipationRepository.revive(participationId, passCount)`:
```ts
async revive(id: string, passCount: number): Promise<void> {
  const { error } = await this.supabase
    .from('challenge_participations')
    .update({
      revived_at: new Date().toISOString(),
      failed_at: null,
      passes_remaining: passCount,
    })
    .eq('id', id)
    .is('revived_at', null)        // race guard
    .not('failed_at', 'is', null)  // race guard
  if (error) throw new Error(`revive failed: ${error.message}`)
}
```

### daily-pass-check
**변경 없음.** revive 후 `failed_at` null, `passes_remaining > 0` → 기존 로직 그대로 작동. 재도전 후 다시 미수행이 누적되면 정상적으로 패스 차감 → 0 도달 시 다시 markFailed (이번엔 진짜 종료).

### Leaderboard streak
`src/application/use-cases/get-challenge-leaderboard.ts`:
- 참가자에 `revivedAt` 있으면, streak/maxStreak 계산 시 `mission_logs` 중 `date >= kstDate(revivedAt)` 만 포함
- pre-revival 로그는 보존하되 streak 카운트에서 제외
- 로스터 응답에 `revivedAt: string | null` 노출 → 클라이언트에서 `★재도전` 뱃지 렌더

## §4. 테스트 + 엣지케이스

### Unit tests
`tests/unit/use-cases/revive-challenge-participation.test.ts`:

| Case | Expected |
|---|---|
| Happy: failed + halfway 이전 + revivedAt null | ok, repo.revive 호출 |
| 이미 revivedAt set | NOT_ELIGIBLE |
| failed_at null | NOT_ELIGIBLE |
| completed_at set | NOT_ELIGIBLE |
| today > halfway | NOT_ELIGIBLE |
| today == halfway (경계) | ok |
| 참가 안 함 | NOT_PARTICIPATING |
| 챌린지 없음 | CHALLENGE_NOT_FOUND |

### Leaderboard tests
`tests/unit/use-cases/get-challenge-leaderboard.test.ts` 확장:
- revivedAt 있는 참가자: pre-revival 로그 무시, streak는 revivedAt 이후만
- maxStreak도 revivedAt 이후 구간만 (Streak 0 리셋 정책 반영)

### daily-pass-check regression
- revive 직후 첫날 미수행 → passes_remaining 감소, failed_at NULL 유지
- revive 후 패스 소진 + 미수행 → markFailed 재호출, revivedAt 그대로 → canRevive false (재재도전 차단)

### Timezone
- `today`, `halfwayDate`, `revivedAt → date` 모두 KST 기준
- 기존 `kstToday()` / KST 변환 헬퍼 일관 사용

### Race conditions
- 동시 2탭 [시작하기] → repo.revive의 조건절(`is(revived_at, null)`)로 두 번째 update affected=0
- HTTP 응답은 200 + refresh, latest state로 자연 수렴

### Failed → revive → 다시 failed
- 두 번째 fail은 일반 failed로 처리
- canRevive false (revivedAt not null) → CTA 노출 안 됨
- 별도 "재도전 실패" UI는 본 범위 밖, 데이터 보고 추가 검토

## §5. 변경 파일 목록

### 신규
- `supabase/migrations/<YYYYMMDD>_challenge_revive.sql`
- `src/domain/challenge/halfway.ts` — `halfwayDate(c)` + `canRevive(p, c, today)` shared predicates
- `src/application/use-cases/revive-challenge-participation.ts`
- `src/app/api/challenges/[id]/revive/route.ts`
- `src/presentation/components/mission/revival-cta.tsx`
- `tests/unit/use-cases/revive-challenge-participation.test.ts`
- `tests/unit/domain/challenge/halfway.test.ts`

### 수정
- `src/domain/challenge/types.ts` — `ChallengeParticipation.revivedAt: string | null`
- `src/infrastructure/supabase/challenge-participation-repository.ts` — `toEntity` 매핑 + `revive()` 메소드
- `src/application/use-cases/get-challenge-leaderboard.ts` — revivedAt 기준 streak 재계산
- `src/presentation/components/mission/challenge-roster.tsx` — `★재도전` StatusBadge variant, pre-revival 셀 회색
- `src/presentation/components/mission/day-detail-sheet.tsx` — pre-revival 날짜 라벨
- `src/app/mission/[challengeId]/page.tsx` (또는 roster 컨테이너) — `RevivalCta` 마운트
- `tests/unit/use-cases/get-challenge-leaderboard.test.ts` — revivedAt 케이스 추가

### 미변경
- `supabase/functions/daily-pass-check/index.ts`
- `src/presentation/components/home/challenge-announcement-banner.tsx`
- `src/presentation/components/home/diary-entry-banner.tsx`

## Open Questions (구현 단계에서 결정)

1. 마이그레이션 파일명 정확한 날짜 prefix (실제 commit 시점 기준)
2. `RevivalCta` 컴포넌트의 정확한 마운트 위치 (페이지 상단 sticky vs roster 헤더 inline) — 실제 페이지 구조 보고 결정
3. State 1 카드의 일러스트/이모지 톤 (😢 vs 🌱 vs ✨)
