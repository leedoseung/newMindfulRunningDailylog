# Challenge Revive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one-shot "revive" capability for challenge participants who failed before the halfway date. Restore pass count to full, reset streak to 0, label them on the leaderboard.

**Architecture:** Add a `revived_at timestamptz` column to `challenge_participations`. Eligibility is a pure function shared client+server. Backend: new use case + POST route. Frontend: a `RevivalCta` block on the mission page with a confirmation modal; leaderboard surfaces a ★재도전 badge and greys out pre-revival calendar cells. `daily-pass-check` edge function is **not** modified — it continues to work because revive clears `failed_at` and refills `passes_remaining`.

**Tech Stack:** Next.js App Router (POST route handler), Supabase JS client, Vitest, TypeScript, React (no framework switch).

**Spec:** [`docs/superpowers/specs/2026-06-24-challenge-revive-design.md`](../specs/2026-06-24-challenge-revive-design.md)

## Global Constraints

- All KST date handling uses existing `kstToday()` from `src/lib/kst.ts`. Never introduce new date helpers; reuse `addDays` from `src/application/use-cases/get-challenge-leaderboard.ts` when adding days to a YYYY-MM-DD string.
- Challenge field names: `passCount` (not `maxPasses`), `durationDays` (not `endDate`), `startDate` is `YYYY-MM-DD` string. Verify field names against `src/infrastructure/supabase/challenge-repository.ts:toChallenge`.
- Use case file naming: `<verb>-<noun>.ts` under `src/application/use-cases/` (e.g. `enroll-challenge.ts`, so this one is `revive-challenge-participation.ts`).
- Repository methods that mutate must include a race-guard `is`/`not`/`eq` chain so concurrent calls do not double-apply.
- Tests follow the `makeRepos()` pattern from `tests/unit/use-cases/enroll-challenge.test.ts`: mock `IChallengeRepository` and `IChallengeParticipationRepository` with `vi.fn()`; tests assert both the result and which repo methods were called with which args.
- The mission page lives at `src/app/mission/page.tsx` and renders through `src/presentation/components/mission/mission-page-client.tsx`. There is no `[challengeId]` dynamic route — the active challenge is implicit.
- Commits use the existing conventional-commit style visible in `git log` (e.g. `feat(...)`, `fix(...)`, `perf(...)`).

---

## File Structure

### New files
- `supabase/migrations/20260624_challenge_revive.sql` — add `revived_at` column
- `src/domain/entities/challenge-halfway.ts` — `halfwayDate(c)` + `canRevive(p, c, today)` shared predicates
- `tests/unit/domain/entities/challenge-halfway.test.ts` — predicate unit tests
- `src/application/use-cases/revive-challenge-participation.ts` — use case
- `tests/unit/use-cases/revive-challenge-participation.test.ts` — use case unit tests
- `src/app/api/challenges/[id]/revive/route.ts` — POST handler
- `tests/unit/api/challenges-revive.test.ts` — API handler tests
- `src/presentation/components/mission/revival-cta.tsx` — UI card + confirm modal

### Modified files
- `src/domain/entities/challenge-participation.ts` — add `revivedAt: string | null` to `ChallengeParticipation`
- `src/infrastructure/supabase/challenge-participation-repository.ts` — extend `SELECT`, `toEntity`, add `revive()` method
- `src/application/use-cases/get-challenge-leaderboard.ts` — read `revived_at`, anchor streak/maxStreak from revival date, expose `revivedAt` on `ChallengeLeaderRow`
- `tests/unit/use-cases/get-challenge-leaderboard.test.ts` — revived-participant test cases
- `src/presentation/components/mission/challenge-roster.tsx` — `StatusBadge` ★재도전 variant
- `src/presentation/components/mission/day-detail-sheet.tsx` — pre-revival date label
- `src/presentation/components/mission/mission-page-client.tsx` — mount `RevivalCta`

### Not modified
- `supabase/functions/daily-pass-check/index.ts`
- `src/presentation/components/home/diary-entry-banner.tsx`
- `src/presentation/components/home/challenge-announcement-banner.tsx`

---

## Task 1: DB migration + domain type + repository SELECT/toEntity

**Files:**
- Create: `supabase/migrations/20260624_challenge_revive.sql`
- Modify: `src/domain/entities/challenge-participation.ts` (add `revivedAt` field)
- Modify: `src/infrastructure/supabase/challenge-participation-repository.ts:1-30` (extend `SELECT` + `toEntity`)

**Interfaces:**
- Consumes: (nothing — first task)
- Produces: `ChallengeParticipation.revivedAt: string | null` available to all downstream tasks.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260624_challenge_revive.sql
ALTER TABLE challenge_participations
  ADD COLUMN IF NOT EXISTS revived_at timestamptz NULL;

COMMENT ON COLUMN challenge_participations.revived_at IS
  'When set, participant used their one-shot revive after a failed_at. failed_at is cleared and passes_remaining is refilled at that moment.';
```

- [ ] **Step 2: Update domain type**

Open `src/domain/entities/challenge-participation.ts`. Locate `ChallengeParticipation`. Add `revivedAt: string | null` as the last field, preserving existing ordering.

```ts
export interface ChallengeParticipation {
  id: string
  challengeId: string
  memberId: string
  joinedAt: string
  passesRemaining: number
  completedAt: string | null
  failedAt: string | null
  revivedAt: string | null
}
```

- [ ] **Step 3: Update repository SELECT and toEntity**

In `src/infrastructure/supabase/challenge-participation-repository.ts`:

```ts
// Top of file — extend SELECT to include revived_at
const SELECT = 'id, challenge_id, member_id, joined_at, passes_remaining, completed_at, failed_at, revived_at'

// Row type — add revived_at
type Row = {
  id: string
  challenge_id: string
  member_id: string
  joined_at: string
  passes_remaining: number
  completed_at: string | null
  failed_at: string | null
  revived_at: string | null
}

function toEntity(row: Row): ChallengeParticipation {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    memberId: row.member_id,
    joinedAt: row.joined_at,
    passesRemaining: row.passes_remaining,
    completedAt: row.completed_at,
    failedAt: row.failed_at,
    revivedAt: row.revived_at,
  }
}
```

Verify by `rg "SELECT|toEntity" src/infrastructure/supabase/challenge-participation-repository.ts` — both should now include `revived_at` / `revivedAt`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

If tests that build `ChallengeParticipation` fixtures fail compilation, add `revivedAt: null` to those fixtures inline as part of this commit (search `tests/.*\.test\.ts` for object literals containing `passesRemaining:`).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260624_challenge_revive.sql \
        src/domain/entities/challenge-participation.ts \
        src/infrastructure/supabase/challenge-participation-repository.ts \
        tests
git commit -m "feat(challenge): add revived_at column + domain field for one-shot revive"
```

---

## Task 2: Halfway + canRevive predicates

**Files:**
- Create: `src/domain/entities/challenge-halfway.ts`
- Create: `tests/unit/domain/entities/challenge-halfway.test.ts`

**Interfaces:**
- Consumes: `ChallengeParticipation` from Task 1 (`src/domain/entities/challenge-participation.ts`), `Challenge` from `src/domain/entities/challenge.ts` (existing).
- Produces:
  - `halfwayDate(c: Challenge): string` — returns YYYY-MM-DD (KST), inclusive last revive-eligible day
  - `canRevive(p: ChallengeParticipation, c: Challenge, today: string): boolean`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/domain/entities/challenge-halfway.test.ts
import { describe, it, expect } from 'vitest'
import { halfwayDate, canRevive } from '@/domain/entities/challenge-halfway'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

const challenge: Challenge = {
  id: 'c1',
  title: 't',
  description: '',
  goalPerDay: 1,
  durationDays: 30,
  startDate: '2026-06-01',
  registrationDeadline: '2026-05-31',
  passCount: 3,
  status: 'active',
  imageUrl: null,
  goalMin: 10,
  restDaysPerWeek: 1,
  createdAt: '2026-05-01T00:00:00Z',
}

function part(over: Partial<ChallengeParticipation> = {}): ChallengeParticipation {
  return {
    id: 'p1',
    challengeId: 'c1',
    memberId: 'm1',
    joinedAt: '2026-06-01T00:00:00Z',
    passesRemaining: 0,
    completedAt: null,
    failedAt: '2026-06-05T00:00:00Z',
    revivedAt: null,
    ...over,
  }
}

describe('halfwayDate', () => {
  it('returns startDate + floor((durationDays-1)/2) for even duration', () => {
    // 30 days: floor(29/2)=14 → 2026-06-01 + 14 = 2026-06-15
    expect(halfwayDate(challenge)).toBe('2026-06-15')
  })

  it('returns the midpoint for odd duration', () => {
    // 7 days: floor(6/2)=3 → start + 3
    expect(halfwayDate({ ...challenge, durationDays: 7 })).toBe('2026-06-04')
  })

  it('returns startDate when durationDays is 1', () => {
    expect(halfwayDate({ ...challenge, durationDays: 1 })).toBe('2026-06-01')
  })
})

describe('canRevive', () => {
  it('true when failed, not completed, not revived, today <= halfway', () => {
    expect(canRevive(part(), challenge, '2026-06-10')).toBe(true)
  })

  it('true at exactly halfway date (inclusive boundary)', () => {
    expect(canRevive(part(), challenge, '2026-06-15')).toBe(true)
  })

  it('false one day past halfway', () => {
    expect(canRevive(part(), challenge, '2026-06-16')).toBe(false)
  })

  it('false when failed_at is null (still active)', () => {
    expect(canRevive(part({ failedAt: null }), challenge, '2026-06-10')).toBe(false)
  })

  it('false when completed_at set', () => {
    expect(canRevive(part({ completedAt: '2026-06-09T00:00:00Z' }), challenge, '2026-06-10')).toBe(false)
  })

  it('false when revivedAt already set (one-shot)', () => {
    expect(canRevive(part({ revivedAt: '2026-06-06T00:00:00Z' }), challenge, '2026-06-10')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/domain/entities/challenge-halfway.test.ts`
Expected: FAIL with "Cannot find module '@/domain/entities/challenge-halfway'" or similar.

- [ ] **Step 3: Write the implementation**

```ts
// src/domain/entities/challenge-halfway.ts
import type { Challenge } from './challenge'
import type { ChallengeParticipation } from './challenge-participation'

// startDate is YYYY-MM-DD (KST). durationDays >= 1.
// Halfway day index = floor((durationDays - 1) / 2). Inclusive — today equal to this is still eligible.
export function halfwayDate(c: Challenge): string {
  const offset = Math.floor((c.durationDays - 1) / 2)
  return addDaysKst(c.startDate, offset)
}

export function canRevive(
  p: ChallengeParticipation,
  c: Challenge,
  today: string,
): boolean {
  return (
    p.failedAt !== null &&
    p.completedAt === null &&
    p.revivedAt === null &&
    today <= halfwayDate(c)
  )
}

// Local copy of the addDays pattern used elsewhere (see get-challenge-leaderboard.ts:addDays).
// Kept private to this module so the domain layer has no cross-layer import.
function addDaysKst(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/domain/entities/challenge-halfway.test.ts`
Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain/entities/challenge-halfway.ts tests/unit/domain/entities/challenge-halfway.test.ts
git commit -m "feat(challenge): halfwayDate + canRevive shared predicates"
```

---

## Task 3: ReviveChallengeParticipationUseCase + tests

**Files:**
- Create: `src/application/use-cases/revive-challenge-participation.ts`
- Create: `tests/unit/use-cases/revive-challenge-participation.test.ts`
- Modify: `src/domain/repositories/challenge-participation-repository.ts` — add `revive` method signature to `IChallengeParticipationRepository`

**Interfaces:**
- Consumes: `canRevive` from Task 2, `IChallengeRepository.getById`, existing `IChallengeParticipationRepository.getByMember`.
- Produces:
  - Class `ReviveChallengeParticipationUseCase` with `execute({ challengeId, memberId, today }): Promise<ReviveResult>`
  - `type ReviveResult = { ok: true } | { ok: false, reason: 'CHALLENGE_NOT_FOUND' | 'NOT_PARTICIPATING' | 'NOT_ELIGIBLE' }`
  - New repo method signature `revive(participationId: string, passCount: number): Promise<void>` on `IChallengeParticipationRepository`

- [ ] **Step 1: Extend the repository interface**

In `src/domain/repositories/challenge-participation-repository.ts`, locate `IChallengeParticipationRepository` and add:

```ts
revive(participationId: string, passCount: number): Promise<void>
```

(Implementation comes in Task 4. This step exists so the use case typechecks against the interface in Step 3.)

- [ ] **Step 2: Write failing tests**

```ts
// tests/unit/use-cases/revive-challenge-participation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReviveChallengeParticipationUseCase } from '@/application/use-cases/revive-challenge-participation'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'

const challenge: Challenge = {
  id: 'c1', title: 't', description: '', goalPerDay: 1, durationDays: 30,
  startDate: '2026-06-01', registrationDeadline: '2026-05-31', passCount: 3,
  status: 'active', imageUrl: null, goalMin: 10, restDaysPerWeek: 1,
  createdAt: '2026-05-01T00:00:00Z',
}

const failedPart: ChallengeParticipation = {
  id: 'p1', challengeId: 'c1', memberId: 'm1',
  joinedAt: '2026-06-01T00:00:00Z',
  passesRemaining: 0,
  completedAt: null,
  failedAt: '2026-06-05T00:00:00Z',
  revivedAt: null,
}

function makeRepos(over: { challenge?: Challenge | null; part?: ChallengeParticipation | null } = {}) {
  const cRepo = {
    getById: vi.fn().mockResolvedValue(over.challenge === undefined ? challenge : over.challenge),
    getActive: vi.fn(),
    getUpcoming: vi.fn(),
  } as unknown as IChallengeRepository
  const pRepo = {
    getByMember: vi.fn().mockResolvedValue(over.part === undefined ? failedPart : over.part),
    enroll: vi.fn(),
    decrementPass: vi.fn(),
    markFailed: vi.fn(),
    markCompleted: vi.fn(),
    listForChallenge: vi.fn(),
    delete: vi.fn(),
    revive: vi.fn().mockResolvedValue(undefined),
  } as unknown as IChallengeParticipationRepository
  return { cRepo, pRepo }
}

describe('ReviveChallengeParticipationUseCase', () => {
  let repos: ReturnType<typeof makeRepos>
  let uc: ReviveChallengeParticipationUseCase

  beforeEach(() => {
    repos = makeRepos()
    uc = new ReviveChallengeParticipationUseCase(repos.cRepo, repos.pRepo)
  })

  it('revives when failed + before halfway + revivedAt null', async () => {
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-10' })
    expect(r).toEqual({ ok: true })
    expect(repos.pRepo.revive).toHaveBeenCalledWith('p1', 3) // passCount=3
  })

  it('returns CHALLENGE_NOT_FOUND when challenge missing', async () => {
    repos = makeRepos({ challenge: null })
    uc = new ReviveChallengeParticipationUseCase(repos.cRepo, repos.pRepo)
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-10' })
    expect(r).toEqual({ ok: false, reason: 'CHALLENGE_NOT_FOUND' })
    expect(repos.pRepo.revive).not.toHaveBeenCalled()
  })

  it('returns NOT_PARTICIPATING when no participation row', async () => {
    repos = makeRepos({ part: null })
    uc = new ReviveChallengeParticipationUseCase(repos.cRepo, repos.pRepo)
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-10' })
    expect(r).toEqual({ ok: false, reason: 'NOT_PARTICIPATING' })
  })

  it('returns NOT_ELIGIBLE when already revived', async () => {
    repos = makeRepos({ part: { ...failedPart, revivedAt: '2026-06-06T00:00:00Z' } })
    uc = new ReviveChallengeParticipationUseCase(repos.cRepo, repos.pRepo)
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-10' })
    expect(r).toEqual({ ok: false, reason: 'NOT_ELIGIBLE' })
  })

  it('returns NOT_ELIGIBLE when failedAt is null (still active)', async () => {
    repos = makeRepos({ part: { ...failedPart, failedAt: null } })
    uc = new ReviveChallengeParticipationUseCase(repos.cRepo, repos.pRepo)
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-10' })
    expect(r).toEqual({ ok: false, reason: 'NOT_ELIGIBLE' })
  })

  it('returns NOT_ELIGIBLE when completedAt set', async () => {
    repos = makeRepos({ part: { ...failedPart, completedAt: '2026-06-09T00:00:00Z' } })
    uc = new ReviveChallengeParticipationUseCase(repos.cRepo, repos.pRepo)
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-10' })
    expect(r).toEqual({ ok: false, reason: 'NOT_ELIGIBLE' })
  })

  it('returns NOT_ELIGIBLE one day past halfway', async () => {
    // halfway for durationDays=30 starting 2026-06-01 is 2026-06-15
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-16' })
    expect(r).toEqual({ ok: false, reason: 'NOT_ELIGIBLE' })
  })

  it('succeeds at exactly halfway date', async () => {
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-15' })
    expect(r).toEqual({ ok: true })
    expect(repos.pRepo.revive).toHaveBeenCalledWith('p1', 3)
  })
})
```

- [ ] **Step 3: Write the use case**

```ts
// src/application/use-cases/revive-challenge-participation.ts
import { canRevive } from '@/domain/entities/challenge-halfway'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'

export type ReviveResult =
  | { ok: true }
  | { ok: false; reason: 'CHALLENGE_NOT_FOUND' | 'NOT_PARTICIPATING' | 'NOT_ELIGIBLE' }

export interface ReviveInput {
  challengeId: string
  memberId: string
  today: string
}

export class ReviveChallengeParticipationUseCase {
  constructor(
    private readonly challengeRepo: IChallengeRepository,
    private readonly participationRepo: IChallengeParticipationRepository,
  ) {}

  async execute(input: ReviveInput): Promise<ReviveResult> {
    const challenge = await this.challengeRepo.getById(input.challengeId)
    if (!challenge) return { ok: false, reason: 'CHALLENGE_NOT_FOUND' }

    const p = await this.participationRepo.getByMember(input.challengeId, input.memberId)
    if (!p) return { ok: false, reason: 'NOT_PARTICIPATING' }

    if (!canRevive(p, challenge, input.today)) {
      return { ok: false, reason: 'NOT_ELIGIBLE' }
    }

    await this.participationRepo.revive(p.id, challenge.passCount)
    return { ok: true }
  }
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx vitest run tests/unit/use-cases/revive-challenge-participation.test.ts`
Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain/repositories/challenge-participation-repository.ts \
        src/application/use-cases/revive-challenge-participation.ts \
        tests/unit/use-cases/revive-challenge-participation.test.ts
git commit -m "feat(challenge): ReviveChallengeParticipationUseCase with eligibility matrix"
```

---

## Task 4: Repository `revive()` implementation

**Files:**
- Modify: `src/infrastructure/supabase/challenge-participation-repository.ts` (add `revive` method below `markCompleted`)

**Interfaces:**
- Consumes: existing supabase client field, `Row` type from Task 1.
- Produces: `SupabaseChallengeParticipationRepository.revive(id, passCount)` matching the interface signature added in Task 3.

- [ ] **Step 1: Add the method**

```ts
// src/infrastructure/supabase/challenge-participation-repository.ts
// Append below markCompleted:

async revive(participationId: string, passCount: number): Promise<void> {
  const { error } = await this.supabase
    .from('challenge_participations')
    .update({
      revived_at: new Date().toISOString(),
      failed_at: null,
      passes_remaining: passCount,
    })
    .eq('id', participationId)
    .is('revived_at', null)              // race guard: no double revive
    .not('failed_at', 'is', null)        // race guard: must currently be failed
  if (error) throw new Error(`revive failed: ${error.message}`)
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors. (The interface signature added in Task 3 now has its implementation.)

- [ ] **Step 3: Re-run use case tests to confirm nothing regressed**

Run: `npx vitest run tests/unit/use-cases/revive-challenge-participation.test.ts`
Expected: 8 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/supabase/challenge-participation-repository.ts
git commit -m "feat(challenge): SupabaseChallengeParticipationRepository.revive with race guards"
```

---

## Task 5: POST /api/challenges/[id]/revive route + tests

**Files:**
- Create: `src/app/api/challenges/[id]/revive/route.ts`
- Create: `tests/unit/api/challenges-revive.test.ts`

**Interfaces:**
- Consumes: `ReviveChallengeParticipationUseCase` from Task 3, existing `createServerClient`, existing `SupabaseChallengeRepository` + `SupabaseChallengeParticipationRepository`, existing `kstToday` from `src/lib/kst.ts`.
- Produces: HTTP route at `POST /api/challenges/[id]/revive` returning `{ ok: true }` (200) or `{ ok: false, reason }` (400/403/404), and `{ error: 'Unauthorized' }` (401) for unauth requests.

- [ ] **Step 1: Write failing tests**

Pattern reference: `tests/unit/api/challenges-enroll.test.ts` (already in repo — open it for the `authedSupabase()` helper shape and mock module pattern).

```ts
// tests/unit/api/challenges-revive.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const executeMock = vi.fn()
vi.mock('@/application/use-cases/revive-challenge-participation', () => ({
  ReviveChallengeParticipationUseCase: vi.fn(() => ({ execute: executeMock })),
}))
vi.mock('@/infrastructure/supabase/challenge-repository', () => ({
  SupabaseChallengeRepository: vi.fn(),
}))
vi.mock('@/infrastructure/supabase/challenge-participation-repository', () => ({
  SupabaseChallengeParticipationRepository: vi.fn(),
}))

const createServerClient = vi.fn()
vi.mock('@/infrastructure/supabase/client', () => ({
  createServerClient: (...args: unknown[]) => createServerClient(...args),
}))

import { POST } from '@/app/api/challenges/[id]/revive/route'

function authed(memberId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: memberId ? { user_metadata: { member_id: memberId } } : null },
      }),
    },
  }
}

beforeEach(() => {
  executeMock.mockReset()
  createServerClient.mockReset()
})

describe('POST /api/challenges/[id]/revive', () => {
  it('returns 401 when not authenticated', async () => {
    createServerClient.mockResolvedValue(authed(null))
    const res = await POST(new Request('http://x/api/challenges/c1/revive', { method: 'POST' }), {
      params: Promise.resolve({ id: 'c1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no member link', async () => {
    createServerClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { user_metadata: {} } } }) },
    })
    const res = await POST(new Request('http://x/api/challenges/c1/revive', { method: 'POST' }), {
      params: Promise.resolve({ id: 'c1' }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 200 + ok:true on success', async () => {
    createServerClient.mockResolvedValue(authed('m1'))
    executeMock.mockResolvedValue({ ok: true })
    const res = await POST(new Request('http://x/api/challenges/c1/revive', { method: 'POST' }), {
      params: Promise.resolve({ id: 'c1' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(executeMock).toHaveBeenCalledWith({
      challengeId: 'c1', memberId: 'm1', today: expect.any(String),
    })
  })

  it('returns 404 for CHALLENGE_NOT_FOUND', async () => {
    createServerClient.mockResolvedValue(authed('m1'))
    executeMock.mockResolvedValue({ ok: false, reason: 'CHALLENGE_NOT_FOUND' })
    const res = await POST(new Request('http://x/api/challenges/c1/revive', { method: 'POST' }), {
      params: Promise.resolve({ id: 'c1' }),
    })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ ok: false, reason: 'CHALLENGE_NOT_FOUND' })
  })

  it('returns 400 for NOT_PARTICIPATING and NOT_ELIGIBLE', async () => {
    createServerClient.mockResolvedValue(authed('m1'))
    for (const reason of ['NOT_PARTICIPATING', 'NOT_ELIGIBLE'] as const) {
      executeMock.mockResolvedValueOnce({ ok: false, reason })
      const res = await POST(new Request('http://x/api/challenges/c1/revive', { method: 'POST' }), {
        params: Promise.resolve({ id: 'c1' }),
      })
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ ok: false, reason })
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/api/challenges-revive.test.ts`
Expected: FAIL with "Cannot find module '@/app/api/challenges/[id]/revive/route'".

- [ ] **Step 3: Write the route**

```ts
// src/app/api/challenges/[id]/revive/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { ReviveChallengeParticipationUseCase } from '@/application/use-cases/revive-challenge-participation'
import { kstToday } from '@/lib/kst'

const STATUS: Record<string, number> = {
  CHALLENGE_NOT_FOUND: 404,
  NOT_PARTICIPATING: 400,
  NOT_ELIGIBLE: 400,
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) return NextResponse.json({ error: 'NO_MEMBER_LINK' }, { status: 403 })

  const cRepo = new SupabaseChallengeRepository(supabase)
  const pRepo = new SupabaseChallengeParticipationRepository(supabase)
  const uc = new ReviveChallengeParticipationUseCase(cRepo, pRepo)
  const result = await uc.execute({ challengeId: id, memberId, today: kstToday() })

  if (result.ok) return NextResponse.json({ ok: true }, { status: 200 })
  return NextResponse.json(result, { status: STATUS[result.reason] ?? 400 })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/api/challenges-revive.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/challenges/[id]/revive/route.ts \
        tests/unit/api/challenges-revive.test.ts
git commit -m "feat(challenge): POST /api/challenges/[id]/revive route"
```

---

## Task 6: Leaderboard streak adjusted for revivedAt

**Files:**
- Modify: `src/application/use-cases/get-challenge-leaderboard.ts:57-142` (the `execute` method)
- Modify: `tests/unit/use-cases/get-challenge-leaderboard.test.ts`

**Interfaces:**
- Consumes: `revived_at` column from Task 1's migration.
- Produces: `ChallengeLeaderRow.revivedAt: string | null` (new field, optional in shape). Streak and maxStreak for revived participants are anchored at `kstDate(revived_at)` instead of `input.startDate`.

- [ ] **Step 1: Write failing tests**

Open `tests/unit/use-cases/get-challenge-leaderboard.test.ts` and add (in the existing describe block):

```ts
it('anchors streak/maxStreak from revivedAt date when participant revived', async () => {
  // Pre-revival: 3 consecutive done days (would normally give maxStreak=3).
  // Post-revival anchor (2026-06-08): 2 consecutive done days.
  // Expected maxStreak = 2 (pre-revival logs excluded).
  const supabase = makeSupabase({
    parts: [{
      id: 'p1', member_id: 'm1', passes_remaining: 3,
      joined_at: '2026-06-01T00:00:00Z',
      failed_at: null,                        // cleared by revive
      completed_at: null,
      revived_at: '2026-06-08T00:00:00Z',     // anchor (KST equivalent: 2026-06-08)
      members: { name: 'A', avatar_url: null },
    }],
    logs: [
      // Pre-revival — must be ignored
      { participation_id: 'p1', log_date: '2026-06-02', count: 30, used_pass: false, is_rest_day: false },
      { participation_id: 'p1', log_date: '2026-06-03', count: 30, used_pass: false, is_rest_day: false },
      { participation_id: 'p1', log_date: '2026-06-04', count: 30, used_pass: false, is_rest_day: false },
      // Post-revival — counted
      { participation_id: 'p1', log_date: '2026-06-08', count: 30, used_pass: false, is_rest_day: false },
      { participation_id: 'p1', log_date: '2026-06-09', count: 30, used_pass: false, is_rest_day: false },
    ],
  })
  const uc = new GetChallengeLeaderboardUseCase(supabase)
  const rows = await uc.execute({
    challengeId: 'c1', today: '2026-06-09', startDate: '2026-06-01', goalMin: 10,
  })
  expect(rows[0].maxStreak).toBe(2)
  expect(rows[0].completedDays).toBe(2)    // also excludes pre-revival logs
  expect(rows[0].revivedAt).toBe('2026-06-08T00:00:00Z')
})

it('exposes revivedAt: null on non-revived participants', async () => {
  const supabase = makeSupabase({
    parts: [{
      id: 'p1', member_id: 'm1', passes_remaining: 3,
      joined_at: '2026-06-01T00:00:00Z',
      failed_at: null, completed_at: null, revived_at: null,
      members: { name: 'A', avatar_url: null },
    }],
    logs: [],
  })
  const uc = new GetChallengeLeaderboardUseCase(supabase)
  const rows = await uc.execute({
    challengeId: 'c1', today: '2026-06-09', startDate: '2026-06-01', goalMin: 10,
  })
  expect(rows[0].revivedAt).toBeNull()
})
```

If `makeSupabase` doesn't exist or has a different shape, mirror the helper already used in this test file. Open the file once and align fixture shape to what's already there.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/use-cases/get-challenge-leaderboard.test.ts`
Expected: new tests FAIL (revivedAt field missing / streak not anchored).

- [ ] **Step 3: Modify the use case**

In `src/application/use-cases/get-challenge-leaderboard.ts`:

**3a.** Extend the SELECT and PartRow type to include `revived_at`:

```ts
// In the supabase select:
.select('id, member_id, passes_remaining, joined_at, failed_at, completed_at, revived_at, members ( name, avatar_url )')

// In the PartRow type (top of file):
type PartRow = {
  id: string
  member_id: string
  passes_remaining: number
  joined_at: string
  failed_at: string | null
  completed_at: string | null
  revived_at: string | null
  members: { name: string | null; avatar_url: string | null } | null
}
```

**3b.** Add the `ChallengeLeaderRow.revivedAt` field. Find the `ChallengeLeaderRow` type and add:

```ts
revivedAt: string | null
```

**3c.** Compute a per-participant `anchorDate` and use it as the streak walk start. Inside the `rows = partRows.map((p) => { ... })` block, replace the maxStreak walk:

```ts
// Compute the streak anchor: from revived_at (KST date) if revived, else input.startDate.
const anchorDate = p.revived_at
  ? p.revived_at.slice(0, 10)   // ISO timestamp → YYYY-MM-DD (already UTC, KST same date for our usage)
  : input.startDate

// completedDays excludes pre-anchor logs too:
let completedDays = 0
for (const l of myLogs) {
  if (l.log_date < anchorDate) continue
  if (isKept(l, input.goalMin)) completedDays++
}

let maxStreak = 0
let run = 0
for (let cursor = anchorDate; cursor <= input.today; cursor = addDays(cursor, 1)) {
  const l = byDate.get(cursor)
  if (isStreakKept(l, input.goalMin)) {
    run++
    if (run > maxStreak) maxStreak = run
  } else {
    run = 0
  }
}
```

**3d.** Add `revivedAt: p.revived_at` to the returned row object inside the same `map`.

> **Note on KST conversion**: `revived_at` is stored as a UTC `timestamptz`. For revives happening in the KST evening (after 15:00 UTC), the UTC date and KST date differ. To stay correct, convert before slicing:
>
> ```ts
> const anchorDate = p.revived_at
>   ? new Date(new Date(p.revived_at).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
>   : input.startDate
> ```
>
> Use this longer form. Update the test fixture (`revived_at: '2026-06-07T16:00:00Z'` → anchorDate `2026-06-08`) to assert the conversion.

- [ ] **Step 4: Run all leaderboard tests**

Run: `npx vitest run tests/unit/use-cases/get-challenge-leaderboard.test.ts`
Expected: All pass (existing tests still green because `anchorDate` defaults to `input.startDate` when `revived_at` is null).

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/get-challenge-leaderboard.ts \
        tests/unit/use-cases/get-challenge-leaderboard.test.ts
git commit -m "feat(leaderboard): anchor streak from revived_at when participant revived"
```

---

## Task 7: RevivalCta component (visual + confirm modal + POST)

**Files:**
- Create: `src/presentation/components/mission/revival-cta.tsx`

**Interfaces:**
- Consumes: route from Task 5 (via `fetch`), `canRevive` from Task 2 (for client-side gating).
- Produces:
  - `<RevivalCta participation={...} challenge={...} today={kstToday()} />` — renders nothing for participants who are not in States 1 or 2; renders the appropriate card otherwise.

- [ ] **Step 1: Write the component**

```tsx
// src/presentation/components/mission/revival-cta.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { canRevive, halfwayDate } from '@/domain/entities/challenge-halfway'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

interface Props {
  participation: ChallengeParticipation
  challenge: Challenge
  today: string
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const aMs = Date.UTC(ay, am - 1, ad)
  const bMs = Date.UTC(by, bm - 1, bd)
  return Math.round((bMs - aMs) / (1000 * 60 * 60 * 24))
}

export function RevivalCta({ participation, challenge, today }: Props) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Already revived or never failed — render nothing.
  if (!participation.failedAt || participation.revivedAt) return null

  const eligible = canRevive(participation, challenge, today)
  const halfway = halfwayDate(challenge)

  if (!eligible) {
    // State 2: failed, halfway passed.
    return (
      <div style={{
        margin: '12px 16px', padding: '14px 16px', borderRadius: 12,
        background: '#F1F1EF', color: '#666', fontSize: '0.85rem',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>중도이탈 · 재도전 기한 만료</div>
        <div>다음 챌린지에서 만나요</div>
      </div>
    )
  }

  // State 1: eligible.
  const daysLeft = Math.max(0, daysBetween(today, halfway))

  async function handleRevive() {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/challenges/${challenge.id}/revive`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.reason ?? 'UNKNOWN')
        return
      }
      setConfirmOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <div style={{
        margin: '12px 16px', padding: '16px 18px', borderRadius: 16,
        background: 'linear-gradient(135deg,#FEF3C7 0%,#FDE68A 100%)',
        boxShadow: '0 4px 14px rgba(245,158,11,0.18)',
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: 2, color: '#92400E', textTransform: 'uppercase', marginBottom: 6 }}>
          😢 챌린지 중도이탈
        </div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1F2937', marginBottom: 6 }}>
          아직 절반 안 지났어요. 한 번 더 도전할 수 있어요.
        </div>
        <ul style={{ margin: '0 0 12px', padding: '0 0 0 18px', fontSize: '0.82rem', color: '#374151', lineHeight: 1.6 }}>
          <li>패스 {challenge.passCount}개 새로 받음</li>
          <li>streak 0부터 다시 시작</li>
          <li>남은 일수 {daysLeft}일</li>
        </ul>
        <button
          onClick={() => setConfirmOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', borderRadius: 999,
            background: '#1F2937', color: '#FEF3C7', border: 'none',
            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          재도전 시작 →
        </button>
      </div>

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !isPending && setConfirmOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, padding: '20px 22px',
              width: 'min(360px, 90vw)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 10 }}>
              재도전 시작할까요?
            </div>
            <ul style={{ margin: '0 0 16px', padding: '0 0 0 18px', fontSize: '0.85rem', color: '#374151', lineHeight: 1.7 }}>
              <li>1회만 가능 (되돌릴 수 없음)</li>
              <li>오늘부터 streak 0으로 새로 시작</li>
              <li>패스 {challenge.passCount}개 충전</li>
              <li>리더보드에 ★재도전 라벨 표시</li>
            </ul>
            {error && (
              <div style={{ marginBottom: 12, padding: '8px 10px', background: '#FEE2E2', color: '#991B1B', borderRadius: 8, fontSize: '0.8rem' }}>
                실패: {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                disabled={isPending}
                onClick={() => setConfirmOpen(false)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                disabled={isPending}
                onClick={handleRevive}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#1F2937', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                {isPending ? '시작 중…' : '시작하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/mission/revival-cta.tsx
git commit -m "feat(mission): RevivalCta card + confirm modal + POST"
```

---

## Task 8: Mount RevivalCta + StatusBadge ★재도전 variant + pre-revival grey-out

**Files:**
- Modify: `src/presentation/components/mission/mission-page-client.tsx` (mount `RevivalCta` near the top of the active-challenge section)
- Modify: `src/presentation/components/mission/challenge-roster.tsx:19-39` (extend `StatusBadge` to render ★재도전 when participant has `revivedAt`)
- Modify: `src/presentation/components/mission/day-detail-sheet.tsx` (add small "pre" label and reduced opacity when the date is before participant's `failedAt`)

**Interfaces:**
- Consumes: `RevivalCta` from Task 7, `revivedAt` field from Task 6's leaderboard row, `failedAt` already exposed.
- Produces: visible CTA on mission page when state matches; ★재도전 badge next to the row in roster; greyed-out cells for pre-revival dates in the day-detail-sheet.

- [ ] **Step 1: Mount RevivalCta on mission page**

Open `src/presentation/components/mission/mission-page-client.tsx`. The component already receives the active challenge and the current member's participation. Near the top of the rendered tree (above the roster, below the header), add:

```tsx
{myParticipation && (
  <RevivalCta
    participation={myParticipation}
    challenge={activeChallenge}
    today={today}
  />
)}
```

Add the import at top: `import { RevivalCta } from './revival-cta'`.

If `today` is not already in scope, lift it from the server component or compute via `kstToday()` (already used elsewhere in the client surface).

If `myParticipation` is not yet exposed to the client, search for how the roster receives data (`leaderboard rows` likely includes the viewer's own row — find the row where `memberId === viewerMemberId` and reconstruct a minimal `ChallengeParticipation` from it, OR add a separate prop from the parent server component that already calls `pRepo.getByMember(challengeId, memberId)`).

- [ ] **Step 2: Extend `StatusBadge` for ★재도전**

In `src/presentation/components/mission/challenge-roster.tsx`, find `StatusBadge` and add a branch for revived participants. The badge prop signature should be extended to receive `revivedAt: string | null`. Render `★재도전` (color: `#7C3AED`, background: `#EDE9FE`) when set, and continue to render the existing FAILED/COMPLETED states with their existing styles.

Update the `ChallengeRoster` mapping that feeds `StatusBadge` to pass `revivedAt: row.revivedAt`.

- [ ] **Step 3: Pre-revival grey-out in day-detail-sheet**

In `src/presentation/components/mission/day-detail-sheet.tsx`, where each day cell is rendered, accept a new prop `failedAt: string | null` for the viewer's own participation. For dates strictly less than `failedAt.slice(0, 10)`, render with `opacity: 0.4` and a small `pre` chip in the corner.

Skip the chip entirely when `failedAt` is null (no participation history to dim). This makes the change a no-op for participants who never failed.

- [ ] **Step 4: Manual smoke test (cannot be unit-tested cheaply)**

Run: `npm run dev`

In the browser, as an admin user, manually mark your own participation as failed via Supabase Studio (`UPDATE challenge_participations SET failed_at = now(), passes_remaining = 0 WHERE id = '<your-id>'`), then visit `/mission`. Confirm:
1. State 1 card appears at the top
2. Clicking "재도전 시작 →" opens the modal
3. Confirming POST succeeds → page refresh → CTA disappears
4. ★재도전 badge appears on your roster row
5. Pre-failure dates in day-detail-sheet show reduced opacity + "pre" chip

If state 1 does not appear, check that `failed_at > halfway` did not happen (use a `failed_at` near the current date).

- [ ] **Step 5: Typecheck + run all tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 type errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/presentation/components/mission/mission-page-client.tsx \
        src/presentation/components/mission/challenge-roster.tsx \
        src/presentation/components/mission/day-detail-sheet.tsx
git commit -m "feat(mission): mount RevivalCta + roster ★재도전 badge + pre-revival grey-out"
```

---

## Verification Checklist (run after all tasks)

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npx vitest run` → all tests pass
- [ ] `npm run lint` → clean (or pre-existing baseline)
- [ ] Supabase migration applied successfully (`supabase db push` against staging if available, else local stack)
- [ ] Manual smoke test in Task 8 step 4 confirmed
