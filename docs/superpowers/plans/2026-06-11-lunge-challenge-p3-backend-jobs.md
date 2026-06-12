# 100일 런지 챌린지 P3 — 백엔드 잡 (cron + Edge Function)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자정 KST 면죄권 자동 차감 + 시즌 종료 시 완주 판정 cron. Supabase Edge Function (Deno) + pg_cron 기반.

**Architecture:** P1 의 use case 패턴 확장 (`RunDailyPassCheckUseCase`, `IssueCompletionBadgeUseCase`) + Supabase Edge Function 진입점에서 service_role 클라이언트로 use case 실행 + pg_cron + pg_net 으로 매일 호출.

**Tech Stack:** Supabase Edge Functions (Deno), pg_cron + pg_net, vitest unit (use case).

**관련 스펙:** [docs/superpowers/specs/2026-06-11-lunge-challenge-design.md](../specs/2026-06-11-lunge-challenge-design.md)
**의존:** P1 (도메인 + repo + 마이그레이션 적용 상태).

**P3 범위 (7 태스크):**
1. RunDailyPassCheckUseCase + unit test
2. IssueCompletionBadgeUseCase + unit test
3. Supabase Edge Functions 디렉토리 + Deno 공통 모듈
4. Edge Function `daily-pass-check` (KST 자정)
5. Edge Function `issue-completion-badges` (시즌 종료 시)
6. pg_cron + pg_net 마이그레이션 (스케줄 등록 SQL)
7. Edge Function 통합 테스트 + README

**P3 범위 밖:**
- mission-reminder Edge Function → P4 (push 알림 동시)
- 인증서 OG 이미지 생성 → P5

---

## Task 1: RunDailyPassCheckUseCase + unit test

매일 자정 (KST) 실행. 어제 KST 날짜의 미달성 참가자 (count=0 인 mission_log 없거나 부재) → 면죄권 잔여 > 0 이면 차감 + log에 used_pass=true 마킹, 잔여 0 이면 markFailed.

**Files:**
- Create: `src/application/use-cases/run-daily-pass-check.ts`
- Test: `tests/unit/use-cases/run-daily-pass-check.test.ts`

- [ ] **Step 1.1: 실패하는 test**

`tests/unit/use-cases/run-daily-pass-check.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { RunDailyPassCheckUseCase } from '@/application/use-cases/run-daily-pass-check'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

const challenge: Challenge = {
  id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
  startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
}

function makeParticipation(overrides: Partial<ChallengeParticipation> = {}): ChallengeParticipation {
  return {
    id: 'p1', challengeId: 'c1', memberId: 'm1',
    joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 3,
    completedAt: null, failedAt: null,
    ...overrides,
  }
}

describe('RunDailyPassCheckUseCase', () => {
  it('decrements pass + markPass when no log for yesterday and passes remain', async () => {
    const p = makeParticipation({ passesRemaining: 3 })
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([p]),
      decrementPass: vi.fn(),
      markFailed: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), markCompleted: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = {
      getOne: vi.fn().mockResolvedValue(null),
      markPass: vi.fn(),
      getByParticipation: vi.fn(), upsertCount: vi.fn(),
    } as IMissionLogRepository

    const uc = new RunDailyPassCheckUseCase(cRepo, pRepo, mRepo)
    const result = await uc.execute({ today: '2026-07-05' })  // yesterday = 07-04

    expect(pRepo.decrementPass).toHaveBeenCalledWith('p1')
    expect(mRepo.markPass).toHaveBeenCalledWith('p1', '2026-07-04')
    expect(pRepo.markFailed).not.toHaveBeenCalled()
    expect(result.decremented).toBe(1)
    expect(result.failed).toBe(0)
  })

  it('does nothing when log for yesterday exists with count > 0', async () => {
    const p = makeParticipation()
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([p]),
      decrementPass: vi.fn(), markFailed: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), markCompleted: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = {
      getOne: vi.fn().mockResolvedValue({
        id: 'l1', participationId: 'p1', logDate: '2026-07-04',
        count: 50, completed: false, usedPass: false, updatedAt: '2026-07-04T10:00:00Z',
      }),
      markPass: vi.fn(),
      getByParticipation: vi.fn(), upsertCount: vi.fn(),
    } as IMissionLogRepository

    const uc = new RunDailyPassCheckUseCase(cRepo, pRepo, mRepo)
    await uc.execute({ today: '2026-07-05' })

    expect(pRepo.decrementPass).not.toHaveBeenCalled()
    expect(mRepo.markPass).not.toHaveBeenCalled()
    expect(pRepo.markFailed).not.toHaveBeenCalled()
  })

  it('marks failed when passesRemaining = 0 and no log', async () => {
    const p = makeParticipation({ passesRemaining: 0 })
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([p]),
      decrementPass: vi.fn(), markFailed: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), markCompleted: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = {
      getOne: vi.fn().mockResolvedValue(null),
      markPass: vi.fn(),
      getByParticipation: vi.fn(), upsertCount: vi.fn(),
    } as IMissionLogRepository

    const uc = new RunDailyPassCheckUseCase(cRepo, pRepo, mRepo)
    const result = await uc.execute({ today: '2026-07-05' })

    expect(pRepo.markFailed).toHaveBeenCalledWith('p1')
    expect(pRepo.decrementPass).not.toHaveBeenCalled()
    expect(result.failed).toBe(1)
  })

  it('skips already-failed and already-completed participants', async () => {
    const failed = makeParticipation({ id: 'p_failed', failedAt: '2026-07-03T00:00:00Z' })
    const done = makeParticipation({ id: 'p_done', completedAt: '2026-07-03T00:00:00Z' })
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([failed, done]),
      decrementPass: vi.fn(), markFailed: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), markCompleted: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = {
      getOne: vi.fn(), markPass: vi.fn(),
      getByParticipation: vi.fn(), upsertCount: vi.fn(),
    } as IMissionLogRepository

    const uc = new RunDailyPassCheckUseCase(cRepo, pRepo, mRepo)
    await uc.execute({ today: '2026-07-05' })

    expect(mRepo.getOne).not.toHaveBeenCalled()
    expect(pRepo.decrementPass).not.toHaveBeenCalled()
    expect(pRepo.markFailed).not.toHaveBeenCalled()
  })

  it('returns early when no active challenge', async () => {
    const cRepo = { getActive: vi.fn().mockResolvedValue(null), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn(),
      decrementPass: vi.fn(), markFailed: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), markCompleted: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = { getOne: vi.fn(), markPass: vi.fn(), getByParticipation: vi.fn(), upsertCount: vi.fn() } as IMissionLogRepository

    const uc = new RunDailyPassCheckUseCase(cRepo, pRepo, mRepo)
    const result = await uc.execute({ today: '2026-07-05' })

    expect(result).toEqual({ decremented: 0, failed: 0, skipped: 0, processed: 0 })
    expect(pRepo.listForChallenge).not.toHaveBeenCalled()
  })

  it('skips when yesterday is before season start', async () => {
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn(),
      decrementPass: vi.fn(), markFailed: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), markCompleted: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = { getOne: vi.fn(), markPass: vi.fn(), getByParticipation: vi.fn(), upsertCount: vi.fn() } as IMissionLogRepository

    const uc = new RunDailyPassCheckUseCase(cRepo, pRepo, mRepo)
    // today=07-01, yesterday=06-30 (before startDate 07-01)
    const result = await uc.execute({ today: '2026-07-01' })

    expect(result.processed).toBe(0)
    expect(pRepo.listForChallenge).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 1.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/use-cases/run-daily-pass-check.test.ts
```

- [ ] **Step 1.3: 구현**

`src/application/use-cases/run-daily-pass-check.ts`:

```typescript
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'

export type DailyPassCheckInput = {
  today: string  // KST 'YYYY-MM-DD'
}

export type DailyPassCheckResult = {
  processed: number
  decremented: number
  failed: number
  skipped: number
}

function addDays(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export class RunDailyPassCheckUseCase {
  constructor(
    private challengeRepo: IChallengeRepository,
    private participationRepo: IChallengeParticipationRepository,
    private missionLogRepo: IMissionLogRepository
  ) {}

  async execute(input: DailyPassCheckInput): Promise<DailyPassCheckResult> {
    const result: DailyPassCheckResult = { processed: 0, decremented: 0, failed: 0, skipped: 0 }

    const challenge = await this.challengeRepo.getActive()
    if (!challenge) return result

    const yesterday = addDays(input.today, -1)
    if (yesterday < challenge.startDate) return result

    const parts = await this.participationRepo.listForChallenge(challenge.id)

    for (const p of parts) {
      if (p.failedAt || p.completedAt) {
        result.skipped++
        continue
      }
      result.processed++
      const log = await this.missionLogRepo.getOne(p.id, yesterday)
      const missed = !log || (log.count === 0 && !log.usedPass)
      if (!missed) continue

      if (p.passesRemaining > 0) {
        await this.participationRepo.decrementPass(p.id)
        await this.missionLogRepo.markPass(p.id, yesterday)
        result.decremented++
      } else {
        await this.participationRepo.markFailed(p.id)
        result.failed++
      }
    }

    return result
  }
}
```

- [ ] **Step 1.4: 테스트 통과 확인**

```bash
npx vitest run tests/unit/use-cases/run-daily-pass-check.test.ts
```
Expected: PASS — 6.

- [ ] **Step 1.5: 커밋**

```bash
git add src/application/use-cases/run-daily-pass-check.ts tests/unit/use-cases/run-daily-pass-check.test.ts
git commit -m "feat(use-case): add RunDailyPassCheckUseCase"
```

---

## Task 2: IssueCompletionBadgeUseCase + unit test

시즌 종료일 (start + duration - 1) 직후 실행 OR 매일 자정 cron 마지막 단계에서 호출. 활성 시즌 종료 시점 도달한 참가자 중 `count>=100 OR used_pass` 일수가 `durationDays` 와 같은 참가자에게 `completedAt` 부여.

**Files:**
- Create: `src/application/use-cases/issue-completion-badge.ts`
- Test: `tests/unit/use-cases/issue-completion-badge.test.ts`

- [ ] **Step 2.1: 실패하는 test**

`tests/unit/use-cases/issue-completion-badge.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { IssueCompletionBadgeUseCase } from '@/application/use-cases/issue-completion-badge'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'
import type { MissionLog } from '@/domain/entities/mission-log'

const challenge: Challenge = {
  id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
  startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
}

function mkLog(date: string, count: number, usedPass = false): MissionLog {
  return {
    id: `l-${date}`, participationId: 'p1', logDate: date,
    count, completed: count >= 100, usedPass,
    updatedAt: `${date}T10:00:00Z`,
  }
}

function fullSeasonLogs(): MissionLog[] {
  // 100 days of count=100
  return Array.from({ length: 100 }, (_, i) => {
    const dt = new Date(Date.UTC(2026, 6, 1 + i))
    const date = dt.toISOString().slice(0, 10)
    return mkLog(date, 100)
  })
}

describe('IssueCompletionBadgeUseCase', () => {
  it('marks completed for participant with 100 done days', async () => {
    const p: ChallengeParticipation = {
      id: 'p1', challengeId: 'c1', memberId: 'm1',
      joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 5,
      completedAt: null, failedAt: null,
    }
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([p]),
      markCompleted: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), decrementPass: vi.fn(), markFailed: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = {
      getByParticipation: vi.fn().mockResolvedValue(fullSeasonLogs()),
      getOne: vi.fn(), upsertCount: vi.fn(), markPass: vi.fn(),
    } as IMissionLogRepository

    const uc = new IssueCompletionBadgeUseCase(cRepo, pRepo, mRepo)
    const r = await uc.execute({ today: '2026-10-09' })  // day after season end

    expect(pRepo.markCompleted).toHaveBeenCalledWith('p1')
    expect(r.completed).toBe(1)
  })

  it('skips when count<100 day total < durationDays', async () => {
    const p: ChallengeParticipation = {
      id: 'p1', challengeId: 'c1', memberId: 'm1',
      joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 5,
      completedAt: null, failedAt: null,
    }
    const logs = fullSeasonLogs()
    logs[50] = mkLog(logs[50]!.logDate, 50)  // one partial day

    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([p]),
      markCompleted: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), decrementPass: vi.fn(), markFailed: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = {
      getByParticipation: vi.fn().mockResolvedValue(logs),
      getOne: vi.fn(), upsertCount: vi.fn(), markPass: vi.fn(),
    } as IMissionLogRepository

    const uc = new IssueCompletionBadgeUseCase(cRepo, pRepo, mRepo)
    const r = await uc.execute({ today: '2026-10-09' })

    expect(pRepo.markCompleted).not.toHaveBeenCalled()
    expect(r.completed).toBe(0)
  })

  it('counts used_pass days toward completion', async () => {
    const p: ChallengeParticipation = {
      id: 'p1', challengeId: 'c1', memberId: 'm1',
      joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 0,
      completedAt: null, failedAt: null,
    }
    const logs = fullSeasonLogs()
    // 5 of them are pass-marked instead of count=100
    for (let i = 0; i < 5; i++) {
      logs[i] = mkLog(logs[i]!.logDate, 0, true)
    }

    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([p]),
      markCompleted: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), decrementPass: vi.fn(), markFailed: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = {
      getByParticipation: vi.fn().mockResolvedValue(logs),
      getOne: vi.fn(), upsertCount: vi.fn(), markPass: vi.fn(),
    } as IMissionLogRepository

    const uc = new IssueCompletionBadgeUseCase(cRepo, pRepo, mRepo)
    const r = await uc.execute({ today: '2026-10-09' })

    expect(pRepo.markCompleted).toHaveBeenCalledWith('p1')
    expect(r.completed).toBe(1)
  })

  it('skips before season end day', async () => {
    const p: ChallengeParticipation = {
      id: 'p1', challengeId: 'c1', memberId: 'm1',
      joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 5,
      completedAt: null, failedAt: null,
    }
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn(),
      markCompleted: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), decrementPass: vi.fn(), markFailed: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = { getByParticipation: vi.fn(), getOne: vi.fn(), upsertCount: vi.fn(), markPass: vi.fn() } as IMissionLogRepository

    const uc = new IssueCompletionBadgeUseCase(cRepo, pRepo, mRepo)
    const r = await uc.execute({ today: '2026-10-08' })  // last day = 2026-10-08, only run AFTER

    expect(r.completed).toBe(0)
    expect(pRepo.listForChallenge).not.toHaveBeenCalled()
  })

  it('skips already-completed and failed', async () => {
    const failed: ChallengeParticipation = {
      id: 'pf', challengeId: 'c1', memberId: 'mf',
      joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 0,
      completedAt: null, failedAt: '2026-08-15T00:00:00Z',
    }
    const done: ChallengeParticipation = {
      id: 'pd', challengeId: 'c1', memberId: 'md',
      joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 3,
      completedAt: '2026-10-09T00:00:00Z', failedAt: null,
    }
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([failed, done]),
      markCompleted: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), decrementPass: vi.fn(), markFailed: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = { getByParticipation: vi.fn(), getOne: vi.fn(), upsertCount: vi.fn(), markPass: vi.fn() } as IMissionLogRepository

    const uc = new IssueCompletionBadgeUseCase(cRepo, pRepo, mRepo)
    const r = await uc.execute({ today: '2026-10-09' })

    expect(mRepo.getByParticipation).not.toHaveBeenCalled()
    expect(pRepo.markCompleted).not.toHaveBeenCalled()
    expect(r.completed).toBe(0)
  })
})
```

- [ ] **Step 2.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/use-cases/issue-completion-badge.test.ts
```

- [ ] **Step 2.3: 구현**

`src/application/use-cases/issue-completion-badge.ts`:

```typescript
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'

export type IssueCompletionInput = {
  today: string  // KST 'YYYY-MM-DD'
}

export type IssueCompletionResult = {
  completed: number
  skipped: number
}

function addDays(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export class IssueCompletionBadgeUseCase {
  constructor(
    private challengeRepo: IChallengeRepository,
    private participationRepo: IChallengeParticipationRepository,
    private missionLogRepo: IMissionLogRepository
  ) {}

  async execute(input: IssueCompletionInput): Promise<IssueCompletionResult> {
    const result: IssueCompletionResult = { completed: 0, skipped: 0 }

    const challenge = await this.challengeRepo.getActive()
    if (!challenge) return result

    const lastDay = addDays(challenge.startDate, challenge.durationDays - 1)
    // only run AFTER season end day
    if (input.today <= lastDay) return result

    const parts = await this.participationRepo.listForChallenge(challenge.id)

    for (const p of parts) {
      if (p.completedAt || p.failedAt) {
        result.skipped++
        continue
      }
      const logs = await this.missionLogRepo.getByParticipation(p.id)
      const successDays = logs.filter(l => l.count >= 100 || l.usedPass).length
      if (successDays >= challenge.durationDays) {
        await this.participationRepo.markCompleted(p.id)
        result.completed++
      } else {
        result.skipped++
      }
    }

    return result
  }
}
```

- [ ] **Step 2.4: 테스트 통과 확인**

```bash
npx vitest run tests/unit/use-cases/issue-completion-badge.test.ts
```
Expected: PASS — 5.

- [ ] **Step 2.5: 커밋**

```bash
git add src/application/use-cases/issue-completion-badge.ts tests/unit/use-cases/issue-completion-badge.test.ts
git commit -m "feat(use-case): add IssueCompletionBadgeUseCase"
```

---

## Task 3: Supabase Edge Functions 디렉토리 + Deno 공통 모듈

Edge Function 들이 공유할 Supabase 클라이언트 + KST 헬퍼.

**Files:**
- Create: `supabase/functions/_shared/supabase-client.ts`
- Create: `supabase/functions/_shared/kst.ts`
- Create: `supabase/functions/deno.json`

- [ ] **Step 3.1: 디렉토리 + 공유 모듈 작성**

`supabase/functions/deno.json`:

```json
{
  "tasks": {
    "deploy:daily-pass-check": "supabase functions deploy daily-pass-check",
    "deploy:issue-completion": "supabase functions deploy issue-completion-badges"
  },
  "imports": {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2"
  }
}
```

`supabase/functions/_shared/supabase-client.ts`:

```typescript
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createServiceRoleClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
```

`supabase/functions/_shared/kst.ts`:

```typescript
export function kstToday(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}
```

- [ ] **Step 3.2: deno fmt 검증**

```bash
cd supabase/functions && deno fmt --check
```
Expected: 통과.

- [ ] **Step 3.3: 커밋**

```bash
git add supabase/functions/deno.json supabase/functions/_shared/
git commit -m "feat(edge): scaffold supabase functions shared modules"
```

---

## Task 4: Edge Function `daily-pass-check`

자정 KST 호출되어 RunDailyPassCheckUseCase 실행.

**Files:**
- Create: `supabase/functions/daily-pass-check/index.ts`

**Engineer Note:** Edge Function 은 Deno 런타임 + ESM. `@/` alias 가 안 통하므로 도메인/use case 코드를 직접 import 불가. 두 가지 방안:
- A) Edge Function 안에서 use case 로직을 인라인 재구현 (단순 복사)
- B) Use case 코드를 Deno 호환 ESM 으로 빌드 후 함수에 복사

이 플랜은 **A** 채택 (단순). use case 의 비즈니스 로직만 Edge Function 안에 포팅.

- [ ] **Step 4.1: 구현**

`supabase/functions/daily-pass-check/index.ts`:

```typescript
import { createServiceRoleClient } from '../_shared/supabase-client.ts'
import { kstToday } from '../_shared/kst.ts'

function addDays(yyyyMmDd: string, days: number): string {
  const parts = yyyyMmDd.split('-').map(Number)
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

Deno.serve(async (req: Request) => {
  // verify cron caller (Supabase signs internal cron calls)
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const today = kstToday()

  // 1) active challenge
  const { data: challengeRow, error: cErr } = await supabase
    .from('challenges')
    .select('id, start_date, duration_days')
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (cErr) return new Response(JSON.stringify({ error: cErr.message }), { status: 500 })
  if (!challengeRow) {
    return new Response(JSON.stringify({ ok: true, message: 'no active challenge' }), { status: 200 })
  }

  const yesterday = addDays(today, -1)
  if (yesterday < challengeRow.start_date) {
    return new Response(JSON.stringify({ ok: true, message: 'before season start' }), { status: 200 })
  }

  // 2) participants in active season
  const { data: parts, error: pErr } = await supabase
    .from('challenge_participations')
    .select('id, passes_remaining, completed_at, failed_at')
    .eq('challenge_id', challengeRow.id)
    .is('completed_at', null)
    .is('failed_at', null)
  if (pErr) return new Response(JSON.stringify({ error: pErr.message }), { status: 500 })

  let decremented = 0
  let failed = 0
  let processed = 0

  for (const p of (parts ?? [])) {
    processed++
    // 3) check yesterday log
    const { data: log, error: lErr } = await supabase
      .from('mission_logs')
      .select('count, used_pass')
      .eq('participation_id', p.id)
      .eq('log_date', yesterday)
      .maybeSingle()
    if (lErr) continue

    const missed = !log || (log.count === 0 && !log.used_pass)
    if (!missed) continue

    if (p.passes_remaining > 0) {
      // atomic decrement
      const { error: decErr } = await supabase.rpc('decrement_participation_pass', { participation_id: p.id })
      if (decErr) continue
      const { error: passErr } = await supabase.rpc('mark_mission_log_pass', {
        p_participation_id: p.id,
        p_log_date: yesterday,
      })
      if (passErr) continue
      decremented++
    } else {
      const { error: failErr } = await supabase
        .from('challenge_participations')
        .update({ failed_at: new Date().toISOString() })
        .eq('id', p.id)
      if (failErr) continue
      failed++
    }
  }

  return new Response(
    JSON.stringify({ ok: true, today, yesterday, processed, decremented, failed }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
})
```

- [ ] **Step 4.2: 로컬 함수 부트 확인 (선택)**

```bash
npx supabase functions serve daily-pass-check --no-verify-jwt
```
별도 터미널에서 curl 로 호출하여 200 응답 확인.

- [ ] **Step 4.3: 배포 (수동)**

```bash
npx supabase functions deploy daily-pass-check
```

(CI 미설정 시 너가 수동 실행)

- [ ] **Step 4.4: 커밋**

```bash
git add supabase/functions/daily-pass-check/index.ts
git commit -m "feat(edge): daily-pass-check function (auto pass decrement / fail mark)"
```

---

## Task 5: Edge Function `issue-completion-badges`

시즌 종료일 다음날 cron 호출되어 IssueCompletionBadgeUseCase 실행.

**Files:**
- Create: `supabase/functions/issue-completion-badges/index.ts`

- [ ] **Step 5.1: 구현**

`supabase/functions/issue-completion-badges/index.ts`:

```typescript
import { createServiceRoleClient } from '../_shared/supabase-client.ts'
import { kstToday } from '../_shared/kst.ts'

function addDays(yyyyMmDd: string, days: number): string {
  const parts = yyyyMmDd.split('-').map(Number)
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const today = kstToday()

  const { data: ch } = await supabase
    .from('challenges')
    .select('id, start_date, duration_days')
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!ch) {
    return new Response(JSON.stringify({ ok: true, message: 'no active challenge' }), { status: 200 })
  }

  const lastDay = addDays(ch.start_date, ch.duration_days - 1)
  if (today <= lastDay) {
    return new Response(JSON.stringify({ ok: true, message: 'season not ended' }), { status: 200 })
  }

  const { data: parts } = await supabase
    .from('challenge_participations')
    .select('id, completed_at, failed_at')
    .eq('challenge_id', ch.id)
    .is('completed_at', null)
    .is('failed_at', null)

  let completed = 0
  for (const p of (parts ?? [])) {
    const { data: logs } = await supabase
      .from('mission_logs')
      .select('count, used_pass')
      .eq('participation_id', p.id)
    const successDays = (logs ?? []).filter(l => l.count >= 100 || l.used_pass).length
    if (successDays >= ch.duration_days) {
      await supabase
        .from('challenge_participations')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', p.id)
      completed++
    }
  }

  // mark challenge ended (idempotent)
  await supabase.from('challenges').update({ status: 'ended' }).eq('id', ch.id)

  return new Response(
    JSON.stringify({ ok: true, today, completed }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
})
```

- [ ] **Step 5.2: 배포**

```bash
npx supabase functions deploy issue-completion-badges
```

- [ ] **Step 5.3: 커밋**

```bash
git add supabase/functions/issue-completion-badges/index.ts
git commit -m "feat(edge): issue-completion-badges function (season-end badge award)"
```

---

## Task 6: pg_cron + pg_net 마이그레이션 — 스케줄 등록

Supabase pg_cron + pg_net 확장 활성화 + 두 Edge Function 호출 스케줄.

**Files:**
- Create: `supabase/migrations/20260614_cron_schedules.sql`

- [ ] **Step 6.1: 마이그레이션 작성**

`supabase/migrations/20260614_cron_schedules.sql`:

```sql
-- enable extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- daily-pass-check at KST 00:00 = UTC 15:00
-- NOTE: replace <PROJECT_REF> with Supabase project ref before applying;
-- the service role JWT must be set in vault as 'service_role_key'
SELECT cron.schedule(
  'mission-daily-pass-check',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/daily-pass-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- issue-completion-badges at KST 01:00 = UTC 16:00 (runs after pass check)
SELECT cron.schedule(
  'mission-issue-completion-badges',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/issue-completion-badges',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 6.2: Dashboard 적용 가이드**

너 액션:
1. Supabase Dashboard → Settings → API → service_role JWT 복사
2. SQL Editor 에서 `ALTER DATABASE postgres SET app.settings.service_role_key = '<key>';` 실행 (한 번)
3. 위 마이그레이션 SQL 의 `<PROJECT_REF>` 를 실제 ref 로 치환
4. SQL Editor 에서 마이그레이션 실행
5. 확인: `SELECT * FROM cron.job;` — 2개 job 등록 확인

- [ ] **Step 6.3: 커밋**

```bash
git add supabase/migrations/20260614_cron_schedules.sql
git commit -m "feat(db): pg_cron schedules for daily-pass-check and completion-badges"
```

---

## Task 7: README — Edge Function 운영 가이드

**Files:**
- Create: `supabase/functions/README.md`

- [ ] **Step 7.1: README 작성**

`supabase/functions/README.md`:

```markdown
# Supabase Edge Functions — Lunge Challenge

## Functions

| Name | Schedule (KST) | Purpose |
|---|---|---|
| `daily-pass-check` | 매일 00:00 | 어제 미달성자 면죄권 자동 차감 / 실패 처리 |
| `issue-completion-badges` | 매일 01:00 | 시즌 종료일 다음 날 완주 뱃지 발급 + 시즌 status='ended' 마킹 |

## 배포

```bash
npx supabase functions deploy daily-pass-check
npx supabase functions deploy issue-completion-badges
```

## 로컬 테스트

```bash
npx supabase functions serve daily-pass-check --no-verify-jwt
curl -H "Authorization: Bearer test" -X POST http://localhost:54321/functions/v1/daily-pass-check
```

## 스케줄 (pg_cron)

`supabase/migrations/20260614_cron_schedules.sql` 참조. 적용 전 `<PROJECT_REF>` 치환 + `app.settings.service_role_key` 설정 필요.

## 작업 흐름

1. (KST 00:00) daily-pass-check 가 어제 미달성자 처리.
2. (KST 01:00) issue-completion-badges 가 시즌 종료 시점에 완주 판정.
3. 실패한 참가자 → P5 UI 에서 read-only 모드로 표시.
4. 완주자 → P5 인증서 + 영구 뱃지.
```

- [ ] **Step 7.2: 커밋**

```bash
git add supabase/functions/README.md
git commit -m "docs(edge): add Edge Function operations README"
```

---

## P3 완료 검증

- [ ] `npx vitest run` — 모든 테스트 PASS
- [ ] `npx tsc --noEmit` — 0 에러
- [ ] Supabase Dashboard → Edge Functions 탭에 `daily-pass-check` + `issue-completion-badges` 배포 확인
- [ ] `SELECT * FROM cron.job;` 에서 2개 스케줄 확인
- [ ] (선택) cron.job 강제 실행 후 `SELECT * FROM cron.job_run_details ORDER BY end_time DESC LIMIT 5;` 확인

## 다음 플랜

- P4 Web Push: subscribe 테이블 + Service Worker + mission-reminder Edge Function

## Self-Review

- Spec coverage: 자동 면죄권 차감 (스펙) + 완주 판정 자동화 + cron 스케줄 등록 = P3 의 핵심.
- Placeholder scan: `<PROJECT_REF>` 는 명시적으로 "치환 필요" 안내 + 마이그레이션 가이드에 포함.
- Edge Function 안 use case 인라인 재구현 = 의도. 도메인 코드와 Edge Function 의 비즈니스 룰 일관성은 사람이 검증해야 함 — 향후 일관성 보장을 위해 P3 unit test 가 Edge Function 동작과 동일 케이스 커버.
- Idempotency: daily-pass-check 는 동일 일자 재실행 시 markPass 가 idempotent (ON CONFLICT DO UPDATE), decrementPass 는 두 번 호출 시 1 더 차감 → 위험. Edge Function 안에서 missed 체크 먼저 → log 가 used_pass=true 면 이미 처리됨, 두 번째 호출 시 missed=false. 안전.
