# 100일 런지 챌린지 P1 — 코어 데이터 / 도메인 / API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 챌린지/참가/미션로그 데이터 모델 + 도메인 entity + Supabase 리포지토리 + 핵심 use-case (active/enroll/log/board) + 4개 API 라우트 구축.

**Architecture:** 기존 클린 아키텍처 패턴 그대로 (domain → application → infrastructure → app). DB는 Supabase. RLS로 본인 데이터 격리, 챌린지/참가 조회는 인증된 모든 사용자 허용. 사용자 인증은 `auth.uid()` + `user_metadata.member_id` 매칭 (기존 record route 패턴 따름).

**Tech Stack:** Next.js App Router (이미 사용 중), TypeScript strict, Supabase (postgres + RLS), Vitest unit + integration, @supabase/ssr.

**관련 스펙:** [docs/superpowers/specs/2026-06-11-lunge-challenge-design.md](../specs/2026-06-11-lunge-challenge-design.md)

**P1 범위 (15 태스크):**
1. DB 마이그레이션 (3 테이블 + RLS + 인덱스)
2. 도메인 entity 4개
3. 도메인 repo 인터페이스 3개
4. Supabase repo 구현 3개 (각 integration test 포함)
5. 4 use-case + unit test
6. 4 API 라우트

**P1 범위 밖 (다음 플랜):**
- 미션 UI 컴포넌트 → P2
- Edge Function / pg_cron / daily-pass-check → P3
- Web Push / Service Worker → P4
- 완주 인증 / 피드 Realtime → P5
- 공지 / Enroll 페이지 UI → P6

---

## Task 1: DB 마이그레이션 — challenges + participations + mission_logs (RLS + 인덱스 포함)

**Files:**
- Create: `supabase/migrations/20260611_challenge_tables.sql`

- [ ] **Step 1.1: 마이그레이션 SQL 작성**

`supabase/migrations/20260611_challenge_tables.sql`:

```sql
-- challenges
CREATE TABLE challenges (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                   text NOT NULL,
  description             text,
  goal_per_day            int NOT NULL DEFAULT 100,
  duration_days           int NOT NULL DEFAULT 100,
  start_date              date NOT NULL,
  registration_deadline   date NOT NULL,
  pass_count              int NOT NULL DEFAULT 5,
  status                  text NOT NULL CHECK (status IN ('upcoming','active','ended')),
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- challenge_participations
CREATE TABLE challenge_participations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id        uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  member_id           uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  joined_at           timestamptz NOT NULL DEFAULT now(),
  passes_remaining    int NOT NULL,
  completed_at        timestamptz,
  failed_at           timestamptz,
  UNIQUE (challenge_id, member_id)
);

-- mission_logs
CREATE TABLE mission_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participation_id  uuid NOT NULL REFERENCES challenge_participations(id) ON DELETE CASCADE,
  log_date          date NOT NULL,
  count             int NOT NULL DEFAULT 0,
  completed         boolean GENERATED ALWAYS AS (count >= 100) STORED,
  used_pass         boolean NOT NULL DEFAULT false,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participation_id, log_date)
);

CREATE INDEX idx_mission_logs_log_date ON mission_logs (log_date);
CREATE INDEX idx_mission_logs_participation_date ON mission_logs (participation_id, log_date DESC);
CREATE INDEX idx_challenge_participations_member ON challenge_participations (member_id);

-- RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges_read_authenticated" ON challenges
  FOR SELECT USING (auth.uid() IS NOT NULL);
-- 운영자 write 는 service_role 키 사용하는 admin 라우트에서 처리. 일반 정책 없음.

ALTER TABLE challenge_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participations_read_authenticated" ON challenge_participations
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "participations_insert_self" ON challenge_participations
  FOR INSERT WITH CHECK (
    member_id::text = (auth.jwt() -> 'user_metadata' ->> 'member_id')
  );
CREATE POLICY "participations_update_self" ON challenge_participations
  FOR UPDATE USING (
    member_id::text = (auth.jwt() -> 'user_metadata' ->> 'member_id')
  )
  WITH CHECK (
    member_id::text = (auth.jwt() -> 'user_metadata' ->> 'member_id')
  );

ALTER TABLE mission_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mission_logs_own" ON mission_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM challenge_participations p
      WHERE p.id = participation_id
        AND p.member_id::text = (auth.jwt() -> 'user_metadata' ->> 'member_id')
    )
  );
```

- [ ] **Step 1.2: 로컬 supabase 에 적용**

Run:
```bash
npx supabase db reset --linked
```
또는 staging DB 에 적용:
```bash
npx supabase db push --linked
```
Expected: `Applied migration 20260611_challenge_tables.sql`

- [ ] **Step 1.3: 테이블 확인**

Run:
```bash
npx supabase db diff --schema public
```
Expected: no diff (마이그레이션이 깨끗하게 적용됨).

- [ ] **Step 1.4: 커밋**

```bash
git add supabase/migrations/20260611_challenge_tables.sql
git commit -m "feat(db): add challenges, challenge_participations, mission_logs tables with RLS"
```

---

## Task 2: 도메인 entity — Challenge / ChallengeParticipation / MissionLog (단순 type)

**Files:**
- Create: `src/domain/entities/challenge.ts`
- Create: `src/domain/entities/challenge-participation.ts`
- Create: `src/domain/entities/mission-log.ts`

- [ ] **Step 2.1: Challenge entity**

`src/domain/entities/challenge.ts`:

```typescript
export type ChallengeStatus = 'upcoming' | 'active' | 'ended'

export type Challenge = {
  id: string
  title: string
  description: string
  goalPerDay: number
  durationDays: number
  startDate: string            // 'YYYY-MM-DD'
  registrationDeadline: string // 'YYYY-MM-DD'
  passCount: number
  status: ChallengeStatus
  createdAt: string            // ISO timestamptz
}
```

- [ ] **Step 2.2: ChallengeParticipation entity**

`src/domain/entities/challenge-participation.ts`:

```typescript
export type ChallengeParticipation = {
  id: string
  challengeId: string
  memberId: string
  joinedAt: string             // ISO timestamptz
  passesRemaining: number
  completedAt: string | null   // ISO timestamptz
  failedAt: string | null      // ISO timestamptz
}
```

- [ ] **Step 2.3: MissionLog entity**

`src/domain/entities/mission-log.ts`:

```typescript
export type MissionLog = {
  id: string
  participationId: string
  logDate: string              // 'YYYY-MM-DD'
  count: number
  completed: boolean           // count >= 100 (DB generated)
  usedPass: boolean
  updatedAt: string            // ISO timestamptz
}
```

- [ ] **Step 2.4: 타입 체크**

Run:
```bash
npx tsc --noEmit
```
Expected: 에러 없음.

- [ ] **Step 2.5: 커밋**

```bash
git add src/domain/entities/challenge.ts src/domain/entities/challenge-participation.ts src/domain/entities/mission-log.ts
git commit -m "feat(domain): add Challenge, ChallengeParticipation, MissionLog entities"
```

---

## Task 3: 도메인 entity — MissionDayCell (셀 상태 derive 로직)

100칸 도장 벽 셀 1개의 표현 + 상태 판정 함수.

**Files:**
- Create: `src/domain/entities/mission-day-cell.ts`
- Test: `tests/unit/domain/mission-day-cell.test.ts`

- [ ] **Step 3.1: 실패하는 테스트 작성**

`tests/unit/domain/mission-day-cell.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeMissionDayCell } from '@/domain/entities/mission-day-cell'
import type { MissionLog } from '@/domain/entities/mission-log'

const log = (overrides: Partial<MissionLog> = {}): MissionLog => ({
  id: 'log1',
  participationId: 'p1',
  logDate: '2026-06-11',
  count: 0,
  completed: false,
  usedPass: false,
  updatedAt: '2026-06-11T10:00:00Z',
  ...overrides,
})

describe('computeMissionDayCell', () => {
  it('returns future when cellDate > today', () => {
    const cell = computeMissionDayCell({
      dayIndex: 50,
      cellDate: '2026-12-31',
      today: '2026-06-11',
      log: null,
    })
    expect(cell.state).toBe('future')
  })

  it('returns today when cellDate == today and no log', () => {
    const cell = computeMissionDayCell({
      dayIndex: 0,
      cellDate: '2026-06-11',
      today: '2026-06-11',
      log: null,
    })
    expect(cell.state).toBe('today')
    expect(cell.count).toBe(0)
  })

  it('returns done when log.count >= 100', () => {
    const cell = computeMissionDayCell({
      dayIndex: 0,
      cellDate: '2026-06-10',
      today: '2026-06-11',
      log: log({ count: 100, completed: true }),
    })
    expect(cell.state).toBe('done')
  })

  it('caps display count at 100 when log.count > 100', () => {
    const cell = computeMissionDayCell({
      dayIndex: 0,
      cellDate: '2026-06-10',
      today: '2026-06-11',
      log: log({ count: 150, completed: true }),
    })
    expect(cell.state).toBe('done')
    expect(cell.count).toBe(100)
  })

  it('returns partial when 0 < count < 100', () => {
    const cell = computeMissionDayCell({
      dayIndex: 0,
      cellDate: '2026-06-10',
      today: '2026-06-11',
      log: log({ count: 50 }),
    })
    expect(cell.state).toBe('partial')
    expect(cell.count).toBe(50)
  })

  it('returns pass when used_pass = true', () => {
    const cell = computeMissionDayCell({
      dayIndex: 0,
      cellDate: '2026-06-10',
      today: '2026-06-11',
      log: log({ count: 0, usedPass: true }),
    })
    expect(cell.state).toBe('pass')
  })

  it('returns miss for past date without log', () => {
    const cell = computeMissionDayCell({
      dayIndex: 0,
      cellDate: '2026-06-09',
      today: '2026-06-11',
      log: null,
    })
    expect(cell.state).toBe('miss')
  })

  it('returns miss for past date with count = 0 and no pass', () => {
    const cell = computeMissionDayCell({
      dayIndex: 0,
      cellDate: '2026-06-09',
      today: '2026-06-11',
      log: log({ count: 0, usedPass: false }),
    })
    expect(cell.state).toBe('miss')
  })
})
```

- [ ] **Step 3.2: 테스트 실패 확인**

Run:
```bash
npx vitest run tests/unit/domain/mission-day-cell.test.ts
```
Expected: FAIL — `computeMissionDayCell` not exported.

- [ ] **Step 3.3: 구현 작성**

`src/domain/entities/mission-day-cell.ts`:

```typescript
import type { MissionLog } from './mission-log'

export type MissionDayCellState =
  | 'today'
  | 'done'
  | 'partial'
  | 'pass'
  | 'empty'   // reserved for non-active states (e.g., pre-start)
  | 'miss'
  | 'future'

export type MissionDayCell = {
  dayIndex: number             // 0~99
  date: string                 // 'YYYY-MM-DD'
  state: MissionDayCellState
  count: number                // display, capped at 100
  usedPass: boolean
}

type ComputeArgs = {
  dayIndex: number
  cellDate: string
  today: string
  log: MissionLog | null
}

export function computeMissionDayCell({
  dayIndex,
  cellDate,
  today,
  log,
}: ComputeArgs): MissionDayCell {
  const displayCount = log ? Math.min(log.count, 100) : 0
  const usedPass = log?.usedPass ?? false

  let state: MissionDayCellState

  if (cellDate > today) {
    state = 'future'
  } else if (cellDate === today) {
    state = log && log.count >= 100 ? 'done' : 'today'
  } else if (usedPass) {
    state = 'pass'
  } else if (log && log.count >= 100) {
    state = 'done'
  } else if (log && log.count > 0) {
    state = 'partial'
  } else {
    state = 'miss'
  }

  return {
    dayIndex,
    date: cellDate,
    state,
    count: displayCount,
    usedPass,
  }
}
```

- [ ] **Step 3.4: 테스트 통과 확인**

Run:
```bash
npx vitest run tests/unit/domain/mission-day-cell.test.ts
```
Expected: PASS — 8 tests.

- [ ] **Step 3.5: 커밋**

```bash
git add src/domain/entities/mission-day-cell.ts tests/unit/domain/mission-day-cell.test.ts
git commit -m "feat(domain): add MissionDayCell with state derive logic"
```

---

## Task 4: 도메인 repo 인터페이스 3개

**Files:**
- Create: `src/domain/repositories/challenge-repository.ts`
- Create: `src/domain/repositories/challenge-participation-repository.ts`
- Create: `src/domain/repositories/mission-log-repository.ts`

- [ ] **Step 4.1: IChallengeRepository**

`src/domain/repositories/challenge-repository.ts`:

```typescript
import type { Challenge } from '@/domain/entities/challenge'

export interface IChallengeRepository {
  getActive(): Promise<Challenge | null>
  getById(id: string): Promise<Challenge | null>
  getUpcoming(): Promise<Challenge[]>
}
```

- [ ] **Step 4.2: IChallengeParticipationRepository**

`src/domain/repositories/challenge-participation-repository.ts`:

```typescript
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

export type EnrollInput = {
  challengeId: string
  memberId: string
  passesRemaining: number
}

export interface IChallengeParticipationRepository {
  enroll(input: EnrollInput): Promise<ChallengeParticipation>
  getByMember(challengeId: string, memberId: string): Promise<ChallengeParticipation | null>
  decrementPass(participationId: string): Promise<void>
  markFailed(participationId: string): Promise<void>
  markCompleted(participationId: string): Promise<void>
  listForChallenge(challengeId: string): Promise<ChallengeParticipation[]>
}
```

- [ ] **Step 4.3: IMissionLogRepository**

`src/domain/repositories/mission-log-repository.ts`:

```typescript
import type { MissionLog } from '@/domain/entities/mission-log'

export type UpsertCountInput = {
  participationId: string
  logDate: string   // 'YYYY-MM-DD'
  delta: number     // +N (negative not allowed)
}

export interface IMissionLogRepository {
  getByParticipation(participationId: string): Promise<MissionLog[]>
  getOne(participationId: string, logDate: string): Promise<MissionLog | null>
  upsertCount(input: UpsertCountInput): Promise<MissionLog>
  markPass(participationId: string, logDate: string): Promise<MissionLog>
}
```

- [ ] **Step 4.4: 타입 체크**

Run:
```bash
npx tsc --noEmit
```
Expected: 에러 없음.

- [ ] **Step 4.5: 커밋**

```bash
git add src/domain/repositories/challenge-repository.ts src/domain/repositories/challenge-participation-repository.ts src/domain/repositories/mission-log-repository.ts
git commit -m "feat(domain): add challenge/participation/mission-log repository interfaces"
```

---

## Task 5: SupabaseChallengeRepository + integration test

**Files:**
- Create: `src/infrastructure/supabase/challenge-repository.ts`
- Test: `tests/integration/supabase/challenge-repository.test.ts`

- [ ] **Step 5.1: 실패하는 integration test 작성**

`tests/integration/supabase/challenge-repository.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

describe('SupabaseChallengeRepository (integration)', () => {
  it('getActive returns Challenge or null', async () => {
    const repo = new SupabaseChallengeRepository(supabase)
    const c = await repo.getActive()
    if (c === null) {
      expect(c).toBeNull()
    } else {
      expect(typeof c.id).toBe('string')
      expect(typeof c.title).toBe('string')
      expect(c.status).toBe('active')
      expect(typeof c.goalPerDay).toBe('number')
      expect(typeof c.durationDays).toBe('number')
    }
  })

  it('getUpcoming returns array', async () => {
    const repo = new SupabaseChallengeRepository(supabase)
    const list = await repo.getUpcoming()
    expect(Array.isArray(list)).toBe(true)
    list.forEach(c => expect(c.status).toBe('upcoming'))
  })
})
```

- [ ] **Step 5.2: 테스트 실패 확인**

Run:
```bash
npx vitest run --config vitest.integration.config.ts tests/integration/supabase/challenge-repository.test.ts
```
Expected: FAIL — class not exported.

- [ ] **Step 5.3: 구현 작성**

`src/infrastructure/supabase/challenge-repository.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { Challenge, ChallengeStatus } from '@/domain/entities/challenge'

type ChallengeRow = {
  id: string
  title: string
  description: string | null
  goal_per_day: number
  duration_days: number
  start_date: string
  registration_deadline: string
  pass_count: number
  status: ChallengeStatus
  created_at: string
}

function toChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    goalPerDay: row.goal_per_day,
    durationDays: row.duration_days,
    startDate: row.start_date,
    registrationDeadline: row.registration_deadline,
    passCount: row.pass_count,
    status: row.status,
    createdAt: row.created_at,
  }
}

const SELECT = 'id, title, description, goal_per_day, duration_days, start_date, registration_deadline, pass_count, status, created_at'

export class SupabaseChallengeRepository implements IChallengeRepository {
  constructor(private supabase: SupabaseClient) {}

  async getActive(): Promise<Challenge | null> {
    const { data, error } = await this.supabase
      .from('challenges')
      .select(SELECT)
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`getActive failed: ${error.message}`)
    return data ? toChallenge(data as unknown as ChallengeRow) : null
  }

  async getById(id: string): Promise<Challenge | null> {
    const { data, error } = await this.supabase
      .from('challenges')
      .select(SELECT)
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(`getById failed: ${error.message}`)
    return data ? toChallenge(data as unknown as ChallengeRow) : null
  }

  async getUpcoming(): Promise<Challenge[]> {
    const { data, error } = await this.supabase
      .from('challenges')
      .select(SELECT)
      .eq('status', 'upcoming')
      .order('start_date', { ascending: true })

    if (error) throw new Error(`getUpcoming failed: ${error.message}`)
    return (data as unknown as ChallengeRow[]).map(toChallenge)
  }
}
```

- [ ] **Step 5.4: 테스트 통과 확인**

Run:
```bash
npx vitest run --config vitest.integration.config.ts tests/integration/supabase/challenge-repository.test.ts
```
Expected: PASS — 2 tests.

- [ ] **Step 5.5: 커밋**

```bash
git add src/infrastructure/supabase/challenge-repository.ts tests/integration/supabase/challenge-repository.test.ts
git commit -m "feat(infra): add SupabaseChallengeRepository"
```

---

## Task 6: SupabaseChallengeParticipationRepository + integration test

**Files:**
- Create: `src/infrastructure/supabase/challenge-participation-repository.ts`
- Test: `tests/integration/supabase/challenge-participation-repository.test.ts`

- [ ] **Step 6.1: 실패하는 integration test 작성**

`tests/integration/supabase/challenge-participation-repository.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

describe('SupabaseChallengeParticipationRepository (integration)', () => {
  it('getByMember returns null when not enrolled', async () => {
    const repo = new SupabaseChallengeParticipationRepository(supabase)
    const result = await repo.getByMember('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')
    expect(result).toBeNull()
  })

  it('listForChallenge returns array shape', async () => {
    const repo = new SupabaseChallengeParticipationRepository(supabase)
    const list = await repo.listForChallenge('00000000-0000-0000-0000-000000000000')
    expect(Array.isArray(list)).toBe(true)
  })
})
```

- [ ] **Step 6.2: 테스트 실패 확인**

Run:
```bash
npx vitest run --config vitest.integration.config.ts tests/integration/supabase/challenge-participation-repository.test.ts
```
Expected: FAIL.

- [ ] **Step 6.3: 구현 작성**

`src/infrastructure/supabase/challenge-participation-repository.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  IChallengeParticipationRepository,
  EnrollInput,
} from '@/domain/repositories/challenge-participation-repository'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

type Row = {
  id: string
  challenge_id: string
  member_id: string
  joined_at: string
  passes_remaining: number
  completed_at: string | null
  failed_at: string | null
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
  }
}

const SELECT = 'id, challenge_id, member_id, joined_at, passes_remaining, completed_at, failed_at'

export class SupabaseChallengeParticipationRepository
  implements IChallengeParticipationRepository
{
  constructor(private supabase: SupabaseClient) {}

  async enroll(input: EnrollInput): Promise<ChallengeParticipation> {
    const { data, error } = await this.supabase
      .from('challenge_participations')
      .upsert(
        {
          challenge_id: input.challengeId,
          member_id: input.memberId,
          passes_remaining: input.passesRemaining,
        },
        { onConflict: 'challenge_id,member_id', ignoreDuplicates: false }
      )
      .select(SELECT)
      .single()

    if (error) throw new Error(`enroll failed: ${error.message}`)
    return toEntity(data as unknown as Row)
  }

  async getByMember(
    challengeId: string,
    memberId: string
  ): Promise<ChallengeParticipation | null> {
    const { data, error } = await this.supabase
      .from('challenge_participations')
      .select(SELECT)
      .eq('challenge_id', challengeId)
      .eq('member_id', memberId)
      .maybeSingle()

    if (error) throw new Error(`getByMember failed: ${error.message}`)
    return data ? toEntity(data as unknown as Row) : null
  }

  async decrementPass(participationId: string): Promise<void> {
    const { error } = await this.supabase.rpc('decrement_participation_pass', {
      participation_id: participationId,
    })
    if (error) throw new Error(`decrementPass failed: ${error.message}`)
  }

  async markFailed(participationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('challenge_participations')
      .update({ failed_at: new Date().toISOString() })
      .eq('id', participationId)
    if (error) throw new Error(`markFailed failed: ${error.message}`)
  }

  async markCompleted(participationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('challenge_participations')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', participationId)
    if (error) throw new Error(`markCompleted failed: ${error.message}`)
  }

  async listForChallenge(challengeId: string): Promise<ChallengeParticipation[]> {
    const { data, error } = await this.supabase
      .from('challenge_participations')
      .select(SELECT)
      .eq('challenge_id', challengeId)

    if (error) throw new Error(`listForChallenge failed: ${error.message}`)
    return (data as unknown as Row[]).map(toEntity)
  }
}
```

- [ ] **Step 6.4: RPC 함수 마이그레이션 추가**

`supabase/migrations/20260611_challenge_rpcs.sql`:

```sql
-- atomic pass decrement
CREATE OR REPLACE FUNCTION decrement_participation_pass(participation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE challenge_participations
     SET passes_remaining = GREATEST(passes_remaining - 1, 0)
   WHERE id = participation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION decrement_participation_pass(uuid) TO authenticated, service_role;
```

Run:
```bash
npx supabase db push --linked
```
Expected: applied.

- [ ] **Step 6.5: 테스트 통과 확인**

Run:
```bash
npx vitest run --config vitest.integration.config.ts tests/integration/supabase/challenge-participation-repository.test.ts
```
Expected: PASS — 2 tests.

- [ ] **Step 6.6: 커밋**

```bash
git add src/infrastructure/supabase/challenge-participation-repository.ts tests/integration/supabase/challenge-participation-repository.test.ts supabase/migrations/20260611_challenge_rpcs.sql
git commit -m "feat(infra): add SupabaseChallengeParticipationRepository + decrement_pass RPC"
```

---

## Task 7: SupabaseMissionLogRepository + integration test

**Files:**
- Create: `src/infrastructure/supabase/mission-log-repository.ts`
- Test: `tests/integration/supabase/mission-log-repository.test.ts`

- [ ] **Step 7.1: 실패하는 integration test 작성**

`tests/integration/supabase/mission-log-repository.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { SupabaseMissionLogRepository } from '@/infrastructure/supabase/mission-log-repository'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

describe('SupabaseMissionLogRepository (integration)', () => {
  it('getByParticipation returns array shape', async () => {
    const repo = new SupabaseMissionLogRepository(supabase)
    const list = await repo.getByParticipation('00000000-0000-0000-0000-000000000000')
    expect(Array.isArray(list)).toBe(true)
  })

  it('getOne returns null for missing row', async () => {
    const repo = new SupabaseMissionLogRepository(supabase)
    const r = await repo.getOne('00000000-0000-0000-0000-000000000000', '2026-01-01')
    expect(r).toBeNull()
  })
})
```

- [ ] **Step 7.2: 테스트 실패 확인**

Run:
```bash
npx vitest run --config vitest.integration.config.ts tests/integration/supabase/mission-log-repository.test.ts
```
Expected: FAIL.

- [ ] **Step 7.3: atomic upsert RPC 마이그레이션 추가**

`supabase/migrations/20260611_mission_log_rpcs.sql`:

```sql
-- atomic upsert count: insert if missing, else add delta. cap not enforced (store raw count).
CREATE OR REPLACE FUNCTION upsert_mission_log_count(
  p_participation_id uuid,
  p_log_date date,
  p_delta int
)
RETURNS mission_logs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result mission_logs;
BEGIN
  IF p_delta < 0 THEN
    RAISE EXCEPTION 'negative delta not allowed';
  END IF;

  INSERT INTO mission_logs (participation_id, log_date, count, updated_at)
  VALUES (p_participation_id, p_log_date, p_delta, now())
  ON CONFLICT (participation_id, log_date)
  DO UPDATE SET
    count = mission_logs.count + EXCLUDED.count,
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_mission_log_count(uuid, date, int) TO authenticated;

-- mark pass (idempotent: only set true if currently false)
CREATE OR REPLACE FUNCTION mark_mission_log_pass(
  p_participation_id uuid,
  p_log_date date
)
RETURNS mission_logs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result mission_logs;
BEGIN
  INSERT INTO mission_logs (participation_id, log_date, count, used_pass, updated_at)
  VALUES (p_participation_id, p_log_date, 0, true, now())
  ON CONFLICT (participation_id, log_date)
  DO UPDATE SET
    used_pass = true,
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_mission_log_pass(uuid, date) TO service_role;
```

Run:
```bash
npx supabase db push --linked
```
Expected: applied.

- [ ] **Step 7.4: 구현 작성**

`src/infrastructure/supabase/mission-log-repository.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  IMissionLogRepository,
  UpsertCountInput,
} from '@/domain/repositories/mission-log-repository'
import type { MissionLog } from '@/domain/entities/mission-log'

type Row = {
  id: string
  participation_id: string
  log_date: string
  count: number
  completed: boolean
  used_pass: boolean
  updated_at: string
}

function toEntity(row: Row): MissionLog {
  return {
    id: row.id,
    participationId: row.participation_id,
    logDate: row.log_date,
    count: row.count,
    completed: row.completed,
    usedPass: row.used_pass,
    updatedAt: row.updated_at,
  }
}

const SELECT =
  'id, participation_id, log_date, count, completed, used_pass, updated_at'

export class SupabaseMissionLogRepository implements IMissionLogRepository {
  constructor(private supabase: SupabaseClient) {}

  async getByParticipation(participationId: string): Promise<MissionLog[]> {
    const { data, error } = await this.supabase
      .from('mission_logs')
      .select(SELECT)
      .eq('participation_id', participationId)
      .order('log_date', { ascending: true })

    if (error) throw new Error(`getByParticipation failed: ${error.message}`)
    return (data as unknown as Row[]).map(toEntity)
  }

  async getOne(
    participationId: string,
    logDate: string
  ): Promise<MissionLog | null> {
    const { data, error } = await this.supabase
      .from('mission_logs')
      .select(SELECT)
      .eq('participation_id', participationId)
      .eq('log_date', logDate)
      .maybeSingle()

    if (error) throw new Error(`getOne failed: ${error.message}`)
    return data ? toEntity(data as unknown as Row) : null
  }

  async upsertCount(input: UpsertCountInput): Promise<MissionLog> {
    if (input.delta < 0) throw new Error('upsertCount: negative delta not allowed')

    const { data, error } = await this.supabase.rpc('upsert_mission_log_count', {
      p_participation_id: input.participationId,
      p_log_date: input.logDate,
      p_delta: input.delta,
    })

    if (error) throw new Error(`upsertCount failed: ${error.message}`)
    return toEntity(data as unknown as Row)
  }

  async markPass(participationId: string, logDate: string): Promise<MissionLog> {
    const { data, error } = await this.supabase.rpc('mark_mission_log_pass', {
      p_participation_id: participationId,
      p_log_date: logDate,
    })

    if (error) throw new Error(`markPass failed: ${error.message}`)
    return toEntity(data as unknown as Row)
  }
}
```

- [ ] **Step 7.5: 테스트 통과 확인**

Run:
```bash
npx vitest run --config vitest.integration.config.ts tests/integration/supabase/mission-log-repository.test.ts
```
Expected: PASS — 2 tests.

- [ ] **Step 7.6: 커밋**

```bash
git add src/infrastructure/supabase/mission-log-repository.ts tests/integration/supabase/mission-log-repository.test.ts supabase/migrations/20260611_mission_log_rpcs.sql
git commit -m "feat(infra): add SupabaseMissionLogRepository + atomic upsert/pass RPCs"
```

---

## Task 8: GetActiveChallenge use case + unit test

활성 시즌 + 본인 참가 상태를 한 번에 반환.

**Files:**
- Create: `src/application/use-cases/get-active-challenge.ts`
- Test: `tests/unit/use-cases/get-active-challenge.test.ts`

- [ ] **Step 8.1: 실패하는 test 작성**

`tests/unit/use-cases/get-active-challenge.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { GetActiveChallengeUseCase } from '@/application/use-cases/get-active-challenge'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

const challenge: Challenge = {
  id: 'c1', title: '런지 100일', description: '', goalPerDay: 100,
  durationDays: 100, startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
}

const participation: ChallengeParticipation = {
  id: 'p1', challengeId: 'c1', memberId: 'm1',
  joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 5,
  completedAt: null, failedAt: null,
}

describe('GetActiveChallengeUseCase', () => {
  it('returns null challenge when none active', async () => {
    const cRepo = { getActive: vi.fn().mockResolvedValue(null), getById: vi.fn(), getUpcoming: vi.fn() } as IChallengeRepository
    const pRepo = { getByMember: vi.fn() } as unknown as IChallengeParticipationRepository
    const uc = new GetActiveChallengeUseCase(cRepo, pRepo)
    const result = await uc.execute('m1')
    expect(result).toEqual({ challenge: null, participation: null })
  })

  it('returns challenge + participation when both exist', async () => {
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as IChallengeRepository
    const pRepo = { getByMember: vi.fn().mockResolvedValue(participation) } as unknown as IChallengeParticipationRepository
    const uc = new GetActiveChallengeUseCase(cRepo, pRepo)
    const result = await uc.execute('m1')
    expect(result).toEqual({ challenge, participation })
    expect(pRepo.getByMember).toHaveBeenCalledWith('c1', 'm1')
  })

  it('returns challenge + null participation when not enrolled', async () => {
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as IChallengeRepository
    const pRepo = { getByMember: vi.fn().mockResolvedValue(null) } as unknown as IChallengeParticipationRepository
    const uc = new GetActiveChallengeUseCase(cRepo, pRepo)
    const result = await uc.execute('m1')
    expect(result).toEqual({ challenge, participation: null })
  })
})
```

- [ ] **Step 8.2: 테스트 실패 확인**

Run:
```bash
npx vitest run tests/unit/use-cases/get-active-challenge.test.ts
```
Expected: FAIL.

- [ ] **Step 8.3: 구현**

`src/application/use-cases/get-active-challenge.ts`:

```typescript
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

export type GetActiveChallengeResult = {
  challenge: Challenge | null
  participation: ChallengeParticipation | null
}

export class GetActiveChallengeUseCase {
  constructor(
    private challengeRepo: IChallengeRepository,
    private participationRepo: IChallengeParticipationRepository
  ) {}

  async execute(memberId: string): Promise<GetActiveChallengeResult> {
    const challenge = await this.challengeRepo.getActive()
    if (!challenge) return { challenge: null, participation: null }

    const participation = await this.participationRepo.getByMember(
      challenge.id,
      memberId
    )
    return { challenge, participation }
  }
}
```

- [ ] **Step 8.4: 테스트 통과 확인**

Run:
```bash
npx vitest run tests/unit/use-cases/get-active-challenge.test.ts
```
Expected: PASS — 3 tests.

- [ ] **Step 8.5: 커밋**

```bash
git add src/application/use-cases/get-active-challenge.ts tests/unit/use-cases/get-active-challenge.test.ts
git commit -m "feat(use-case): add GetActiveChallengeUseCase"
```

---

## Task 9: EnrollChallenge use case + unit test

마감일 검증, dedupe, passes_remaining 초기화.

**Files:**
- Create: `src/application/use-cases/enroll-challenge.ts`
- Test: `tests/unit/use-cases/enroll-challenge.test.ts`

- [ ] **Step 9.1: 실패하는 test 작성**

`tests/unit/use-cases/enroll-challenge.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { EnrollChallengeUseCase, EnrollError } from '@/application/use-cases/enroll-challenge'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

const challenge: Challenge = {
  id: 'c1', title: '런지 100일', description: '', goalPerDay: 100,
  durationDays: 100, startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'upcoming', createdAt: '2026-06-01T00:00:00Z',
}

const participation: ChallengeParticipation = {
  id: 'p1', challengeId: 'c1', memberId: 'm1',
  joinedAt: '2026-06-15T00:00:00Z', passesRemaining: 5,
  completedAt: null, failedAt: null,
}

function makeRepos() {
  return {
    cRepo: {
      getById: vi.fn().mockResolvedValue(challenge),
      getActive: vi.fn(),
      getUpcoming: vi.fn(),
    } as unknown as IChallengeRepository,
    pRepo: {
      getByMember: vi.fn().mockResolvedValue(null),
      enroll: vi.fn().mockResolvedValue(participation),
      decrementPass: vi.fn(),
      markFailed: vi.fn(),
      markCompleted: vi.fn(),
      listForChallenge: vi.fn(),
    } as IChallengeParticipationRepository,
  }
}

describe('EnrollChallengeUseCase', () => {
  it('enrolls successfully before deadline', async () => {
    const { cRepo, pRepo } = makeRepos()
    const uc = new EnrollChallengeUseCase(cRepo, pRepo)
    const result = await uc.execute({
      challengeId: 'c1',
      memberId: 'm1',
      today: '2026-07-02',
    })
    expect(result).toEqual(participation)
    expect(pRepo.enroll).toHaveBeenCalledWith({
      challengeId: 'c1',
      memberId: 'm1',
      passesRemaining: 5,
    })
  })

  it('throws CHALLENGE_NOT_FOUND when missing', async () => {
    const { cRepo, pRepo } = makeRepos()
    cRepo.getById = vi.fn().mockResolvedValue(null)
    const uc = new EnrollChallengeUseCase(cRepo, pRepo)
    await expect(
      uc.execute({ challengeId: 'x', memberId: 'm1', today: '2026-07-02' })
    ).rejects.toThrowError(new EnrollError('CHALLENGE_NOT_FOUND'))
  })

  it('throws REGISTRATION_CLOSED when today > deadline', async () => {
    const { cRepo, pRepo } = makeRepos()
    const uc = new EnrollChallengeUseCase(cRepo, pRepo)
    await expect(
      uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-07-05' })
    ).rejects.toThrowError(new EnrollError('REGISTRATION_CLOSED'))
  })

  it('allows enroll on deadline day (inclusive)', async () => {
    const { cRepo, pRepo } = makeRepos()
    const uc = new EnrollChallengeUseCase(cRepo, pRepo)
    const result = await uc.execute({
      challengeId: 'c1',
      memberId: 'm1',
      today: '2026-07-04',
    })
    expect(result).toEqual(participation)
  })

  it('returns existing participation when already enrolled (idempotent)', async () => {
    const { cRepo, pRepo } = makeRepos()
    pRepo.getByMember = vi.fn().mockResolvedValue(participation)
    const uc = new EnrollChallengeUseCase(cRepo, pRepo)
    const result = await uc.execute({
      challengeId: 'c1',
      memberId: 'm1',
      today: '2026-07-02',
    })
    expect(result).toEqual(participation)
    expect(pRepo.enroll).not.toHaveBeenCalled()
  })

  it('throws SEASON_ENDED when status == ended', async () => {
    const { cRepo, pRepo } = makeRepos()
    cRepo.getById = vi.fn().mockResolvedValue({ ...challenge, status: 'ended' })
    const uc = new EnrollChallengeUseCase(cRepo, pRepo)
    await expect(
      uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-07-02' })
    ).rejects.toThrowError(new EnrollError('SEASON_ENDED'))
  })
})
```

- [ ] **Step 9.2: 테스트 실패 확인**

Run:
```bash
npx vitest run tests/unit/use-cases/enroll-challenge.test.ts
```
Expected: FAIL.

- [ ] **Step 9.3: 구현**

`src/application/use-cases/enroll-challenge.ts`:

```typescript
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

export type EnrollChallengeInput = {
  challengeId: string
  memberId: string
  today: string  // 'YYYY-MM-DD' (KST today)
}

export type EnrollErrorCode =
  | 'CHALLENGE_NOT_FOUND'
  | 'REGISTRATION_CLOSED'
  | 'SEASON_ENDED'

export class EnrollError extends Error {
  constructor(public readonly code: EnrollErrorCode) {
    super(code)
    this.name = 'EnrollError'
  }
}

export class EnrollChallengeUseCase {
  constructor(
    private challengeRepo: IChallengeRepository,
    private participationRepo: IChallengeParticipationRepository
  ) {}

  async execute(input: EnrollChallengeInput): Promise<ChallengeParticipation> {
    const challenge = await this.challengeRepo.getById(input.challengeId)
    if (!challenge) throw new EnrollError('CHALLENGE_NOT_FOUND')
    if (challenge.status === 'ended') throw new EnrollError('SEASON_ENDED')
    if (input.today > challenge.registrationDeadline) {
      throw new EnrollError('REGISTRATION_CLOSED')
    }

    const existing = await this.participationRepo.getByMember(
      challenge.id,
      input.memberId
    )
    if (existing) return existing

    return this.participationRepo.enroll({
      challengeId: challenge.id,
      memberId: input.memberId,
      passesRemaining: challenge.passCount,
    })
  }
}
```

- [ ] **Step 9.4: 테스트 통과 확인**

Run:
```bash
npx vitest run tests/unit/use-cases/enroll-challenge.test.ts
```
Expected: PASS — 6 tests.

- [ ] **Step 9.5: 커밋**

```bash
git add src/application/use-cases/enroll-challenge.ts tests/unit/use-cases/enroll-challenge.test.ts
git commit -m "feat(use-case): add EnrollChallengeUseCase with deadline/dedupe checks"
```

---

## Task 10: LogMissionCount use case + unit test

카운트 누적, 시즌 윈도우 검증, 음수 delta 거부, failed 상태 거부.

**Files:**
- Create: `src/application/use-cases/log-mission-count.ts`
- Test: `tests/unit/use-cases/log-mission-count.test.ts`

- [ ] **Step 10.1: 실패하는 test 작성**

`tests/unit/use-cases/log-mission-count.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { LogMissionCountUseCase, LogMissionError } from '@/application/use-cases/log-mission-count'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'
import type { MissionLog } from '@/domain/entities/mission-log'

const challenge: Challenge = {
  id: 'c1', title: '런지 100일', description: '', goalPerDay: 100,
  durationDays: 100, startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
}

const participation: ChallengeParticipation = {
  id: 'p1', challengeId: 'c1', memberId: 'm1',
  joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 5,
  completedAt: null, failedAt: null,
}

const log: MissionLog = {
  id: 'log1', participationId: 'p1', logDate: '2026-07-05',
  count: 50, completed: false, usedPass: false,
  updatedAt: '2026-07-05T10:00:00Z',
}

function makeRepos(overrides: { challenge?: Challenge | null; participation?: ChallengeParticipation | null } = {}) {
  return {
    cRepo: {
      getById: vi.fn().mockResolvedValue(overrides.challenge ?? challenge),
      getActive: vi.fn(),
      getUpcoming: vi.fn(),
    } as unknown as IChallengeRepository,
    pRepo: {
      getByMember: vi.fn(),
      enroll: vi.fn(),
      decrementPass: vi.fn(),
      markFailed: vi.fn(),
      markCompleted: vi.fn(),
      listForChallenge: vi.fn(),
    } as IChallengeParticipationRepository,
    mRepo: {
      getByParticipation: vi.fn(),
      getOne: vi.fn(),
      upsertCount: vi.fn().mockResolvedValue(log),
      markPass: vi.fn(),
    } as IMissionLogRepository,
  }
}

describe('LogMissionCountUseCase', () => {
  it('upserts count within season window', async () => {
    const { cRepo, pRepo, mRepo } = makeRepos()
    const uc = new LogMissionCountUseCase(cRepo, pRepo, mRepo)
    const result = await uc.execute({
      participation,
      delta: 10,
      today: '2026-07-05',
    })
    expect(result).toEqual(log)
    expect(mRepo.upsertCount).toHaveBeenCalledWith({
      participationId: 'p1',
      logDate: '2026-07-05',
      delta: 10,
    })
  })

  it('throws NEGATIVE_DELTA when delta < 0', async () => {
    const { cRepo, pRepo, mRepo } = makeRepos()
    const uc = new LogMissionCountUseCase(cRepo, pRepo, mRepo)
    await expect(
      uc.execute({ participation, delta: -5, today: '2026-07-05' })
    ).rejects.toThrowError(new LogMissionError('NEGATIVE_DELTA'))
  })

  it('throws BEFORE_START when today < startDate', async () => {
    const { cRepo, pRepo, mRepo } = makeRepos()
    const uc = new LogMissionCountUseCase(cRepo, pRepo, mRepo)
    await expect(
      uc.execute({ participation, delta: 10, today: '2026-06-30' })
    ).rejects.toThrowError(new LogMissionError('BEFORE_START'))
  })

  it('throws SEASON_ENDED when today > startDate + durationDays', async () => {
    const { cRepo, pRepo, mRepo } = makeRepos()
    const uc = new LogMissionCountUseCase(cRepo, pRepo, mRepo)
    // start = 2026-07-01, durationDays=100, end-inclusive day = 2026-10-08
    await expect(
      uc.execute({ participation, delta: 10, today: '2026-10-09' })
    ).rejects.toThrowError(new LogMissionError('SEASON_ENDED'))
  })

  it('throws ALREADY_FAILED when participation.failedAt set', async () => {
    const { cRepo, pRepo, mRepo } = makeRepos()
    const failed = { ...participation, failedAt: '2026-07-10T00:00:00Z' }
    const uc = new LogMissionCountUseCase(cRepo, pRepo, mRepo)
    await expect(
      uc.execute({ participation: failed, delta: 10, today: '2026-07-12' })
    ).rejects.toThrowError(new LogMissionError('ALREADY_FAILED'))
  })

  it('throws CHALLENGE_NOT_FOUND when challenge missing', async () => {
    const { cRepo, pRepo, mRepo } = makeRepos({ challenge: null })
    const uc = new LogMissionCountUseCase(cRepo, pRepo, mRepo)
    await expect(
      uc.execute({ participation, delta: 10, today: '2026-07-05' })
    ).rejects.toThrowError(new LogMissionError('CHALLENGE_NOT_FOUND'))
  })
})
```

- [ ] **Step 10.2: 테스트 실패 확인**

Run:
```bash
npx vitest run tests/unit/use-cases/log-mission-count.test.ts
```
Expected: FAIL.

- [ ] **Step 10.3: 구현**

`src/application/use-cases/log-mission-count.ts`:

```typescript
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'
import type { MissionLog } from '@/domain/entities/mission-log'

export type LogMissionCountInput = {
  participation: ChallengeParticipation
  delta: number
  today: string   // 'YYYY-MM-DD' KST
}

export type LogMissionErrorCode =
  | 'NEGATIVE_DELTA'
  | 'BEFORE_START'
  | 'SEASON_ENDED'
  | 'ALREADY_FAILED'
  | 'CHALLENGE_NOT_FOUND'

export class LogMissionError extends Error {
  constructor(public readonly code: LogMissionErrorCode) {
    super(code)
    this.name = 'LogMissionError'
  }
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

export class LogMissionCountUseCase {
  constructor(
    private challengeRepo: IChallengeRepository,
    _participationRepo: IChallengeParticipationRepository,
    private missionLogRepo: IMissionLogRepository
  ) {}

  async execute(input: LogMissionCountInput): Promise<MissionLog> {
    if (input.delta < 0) throw new LogMissionError('NEGATIVE_DELTA')
    if (input.participation.failedAt) throw new LogMissionError('ALREADY_FAILED')

    const challenge = await this.challengeRepo.getById(input.participation.challengeId)
    if (!challenge) throw new LogMissionError('CHALLENGE_NOT_FOUND')

    if (input.today < challenge.startDate) throw new LogMissionError('BEFORE_START')
    const lastDay = addDays(challenge.startDate, challenge.durationDays - 1)
    if (input.today > lastDay) throw new LogMissionError('SEASON_ENDED')

    return this.missionLogRepo.upsertCount({
      participationId: input.participation.id,
      logDate: input.today,
      delta: input.delta,
    })
  }
}
```

- [ ] **Step 10.4: 테스트 통과 확인**

Run:
```bash
npx vitest run tests/unit/use-cases/log-mission-count.test.ts
```
Expected: PASS — 6 tests.

- [ ] **Step 10.5: 커밋**

```bash
git add src/application/use-cases/log-mission-count.ts tests/unit/use-cases/log-mission-count.test.ts
git commit -m "feat(use-case): add LogMissionCountUseCase with window/failed checks"
```

---

## Task 11: GetMissionBoard use case + unit test

100칸 셀 배열, streak, 완료 일수, 면죄권 잔여 계산.

**Files:**
- Create: `src/application/use-cases/get-mission-board.ts`
- Test: `tests/unit/use-cases/get-mission-board.test.ts`

- [ ] **Step 11.1: 실패하는 test 작성**

`tests/unit/use-cases/get-mission-board.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { GetMissionBoardUseCase } from '@/application/use-cases/get-mission-board'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'
import type { MissionLog } from '@/domain/entities/mission-log'

const challenge: Challenge = {
  id: 'c1', title: '런지 100일', description: '', goalPerDay: 100,
  durationDays: 100, startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
}

const participation: ChallengeParticipation = {
  id: 'p1', challengeId: 'c1', memberId: 'm1',
  joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 4,
  completedAt: null, failedAt: null,
}

function mkLog(date: string, count: number, usedPass = false): MissionLog {
  return {
    id: `l-${date}`, participationId: 'p1', logDate: date,
    count, completed: count >= 100, usedPass,
    updatedAt: `${date}T10:00:00Z`,
  }
}

describe('GetMissionBoardUseCase', () => {
  it('returns 100 cells with correct states', async () => {
    const cRepo = {
      getById: vi.fn().mockResolvedValue(challenge), getActive: vi.fn(), getUpcoming: vi.fn(),
    } as unknown as IChallengeRepository
    const mRepo = {
      getByParticipation: vi.fn().mockResolvedValue([
        mkLog('2026-07-01', 100),
        mkLog('2026-07-02', 100),
        mkLog('2026-07-03', 50),         // partial
        mkLog('2026-07-04', 0, true),    // pass
        // 07-05 missing → miss
        mkLog('2026-07-06', 30),         // today (count=30, will be 'today' state because today=07-06)
      ]),
      getOne: vi.fn(), upsertCount: vi.fn(), markPass: vi.fn(),
    } as IMissionLogRepository

    const uc = new GetMissionBoardUseCase(cRepo, mRepo)
    const board = await uc.execute({ participation, today: '2026-07-06' })

    expect(board.cells).toHaveLength(100)
    expect(board.cells[0]!.state).toBe('done')           // 07-01
    expect(board.cells[1]!.state).toBe('done')           // 07-02
    expect(board.cells[2]!.state).toBe('partial')        // 07-03
    expect(board.cells[3]!.state).toBe('pass')           // 07-04
    expect(board.cells[4]!.state).toBe('miss')           // 07-05
    expect(board.cells[5]!.state).toBe('today')          // 07-06 (count<100)
    expect(board.cells[6]!.state).toBe('future')         // 07-07
    expect(board.cells[99]!.state).toBe('future')        // 10-08
  })

  it('computes streak from latest back (done+pass keeps streak)', async () => {
    const cRepo = {
      getById: vi.fn().mockResolvedValue(challenge), getActive: vi.fn(), getUpcoming: vi.fn(),
    } as unknown as IChallengeRepository
    const mRepo = {
      getByParticipation: vi.fn().mockResolvedValue([
        mkLog('2026-07-01', 100),
        mkLog('2026-07-02', 0, true),  // pass keeps
        mkLog('2026-07-03', 100),
        mkLog('2026-07-04', 50),       // partial keeps
        mkLog('2026-07-05', 100),
      ]),
      getOne: vi.fn(), upsertCount: vi.fn(), markPass: vi.fn(),
    } as IMissionLogRepository

    const uc = new GetMissionBoardUseCase(cRepo, mRepo)
    const board = await uc.execute({ participation, today: '2026-07-05' })

    expect(board.streak).toBe(5)
  })

  it('streak breaks on miss (count=0 no pass)', async () => {
    const cRepo = {
      getById: vi.fn().mockResolvedValue(challenge), getActive: vi.fn(), getUpcoming: vi.fn(),
    } as unknown as IChallengeRepository
    const mRepo = {
      getByParticipation: vi.fn().mockResolvedValue([
        mkLog('2026-07-01', 100),
        // 07-02 missing → break
        mkLog('2026-07-03', 100),
        mkLog('2026-07-04', 100),
      ]),
      getOne: vi.fn(), upsertCount: vi.fn(), markPass: vi.fn(),
    } as IMissionLogRepository

    const uc = new GetMissionBoardUseCase(cRepo, mRepo)
    const board = await uc.execute({ participation, today: '2026-07-04' })
    expect(board.streak).toBe(2)  // 07-03, 07-04
  })

  it('counts completed days correctly (done OR pass)', async () => {
    const cRepo = {
      getById: vi.fn().mockResolvedValue(challenge), getActive: vi.fn(), getUpcoming: vi.fn(),
    } as unknown as IChallengeRepository
    const mRepo = {
      getByParticipation: vi.fn().mockResolvedValue([
        mkLog('2026-07-01', 100),
        mkLog('2026-07-02', 50),    // partial — NOT counted toward completion
        mkLog('2026-07-03', 0, true),
      ]),
      getOne: vi.fn(), upsertCount: vi.fn(), markPass: vi.fn(),
    } as IMissionLogRepository

    const uc = new GetMissionBoardUseCase(cRepo, mRepo)
    const board = await uc.execute({ participation, today: '2026-07-03' })
    expect(board.completedDays).toBe(2)  // done + pass
    expect(board.passesRemaining).toBe(4)
  })
})
```

- [ ] **Step 11.2: 테스트 실패 확인**

Run:
```bash
npx vitest run tests/unit/use-cases/get-mission-board.test.ts
```
Expected: FAIL.

- [ ] **Step 11.3: 구현**

`src/application/use-cases/get-mission-board.ts`:

```typescript
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import { computeMissionDayCell } from '@/domain/entities/mission-day-cell'

export type GetMissionBoardInput = {
  participation: ChallengeParticipation
  today: string  // 'YYYY-MM-DD' KST
}

export type MissionBoard = {
  cells: MissionDayCell[]
  streak: number
  completedDays: number
  passesRemaining: number
  todayIndex: number  // -1 if today outside range
  challengeId: string
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

export class GetMissionBoardUseCase {
  constructor(
    private challengeRepo: IChallengeRepository,
    private missionLogRepo: IMissionLogRepository
  ) {}

  async execute(input: GetMissionBoardInput): Promise<MissionBoard> {
    const challenge = await this.challengeRepo.getById(input.participation.challengeId)
    if (!challenge) throw new Error('CHALLENGE_NOT_FOUND')

    const logs = await this.missionLogRepo.getByParticipation(input.participation.id)
    const logByDate = new Map(logs.map(l => [l.logDate, l]))

    const cells: MissionDayCell[] = []
    let todayIndex = -1
    for (let i = 0; i < challenge.durationDays; i++) {
      const cellDate = addDays(challenge.startDate, i)
      const cell = computeMissionDayCell({
        dayIndex: i,
        cellDate,
        today: input.today,
        log: logByDate.get(cellDate) ?? null,
      })
      cells.push(cell)
      if (cellDate === input.today) todayIndex = i
    }

    // streak: latest-back consecutive (done/partial/pass/today-with-count>0)
    let streak = 0
    for (let i = cells.length - 1; i >= 0; i--) {
      const c = cells[i]!
      if (c.state === 'future') continue
      const keep = c.state === 'done' || c.state === 'partial' || c.state === 'pass' || (c.state === 'today' && c.count > 0)
      if (keep) streak++
      else break
    }

    // completedDays: done OR pass
    const completedDays = cells.filter(c => c.state === 'done' || c.state === 'pass').length

    return {
      cells,
      streak,
      completedDays,
      passesRemaining: input.participation.passesRemaining,
      todayIndex,
      challengeId: challenge.id,
    }
  }
}
```

- [ ] **Step 11.4: 테스트 통과 확인**

Run:
```bash
npx vitest run tests/unit/use-cases/get-mission-board.test.ts
```
Expected: PASS — 4 tests.

- [ ] **Step 11.5: 커밋**

```bash
git add src/application/use-cases/get-mission-board.ts tests/unit/use-cases/get-mission-board.test.ts
git commit -m "feat(use-case): add GetMissionBoardUseCase with streak/completed compute"
```

---

## Task 12: API GET /api/challenges/active

**Files:**
- Create: `src/app/api/challenges/active/route.ts`
- Test: `tests/unit/api/challenges-active.test.ts`

- [ ] **Step 12.1: 실패하는 API 테스트 작성**

`tests/unit/api/challenges-active.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/infrastructure/supabase/client', () => ({
  createServerClient: vi.fn(),
}))
vi.mock('@/infrastructure/supabase/challenge-repository', () => ({
  SupabaseChallengeRepository: vi.fn(),
}))
vi.mock('@/infrastructure/supabase/challenge-participation-repository', () => ({
  SupabaseChallengeParticipationRepository: vi.fn(),
}))

import { GET } from '@/app/api/challenges/active/route'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'

const mockedCreate = vi.mocked(createServerClient)
const mockedCRepo = vi.mocked(SupabaseChallengeRepository)
const mockedPRepo = vi.mocked(SupabaseChallengeParticipationRepository)

function authedSupabase(memberId: string) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'u1', user_metadata: { member_id: memberId } } },
      }),
    },
  } as unknown as Awaited<ReturnType<typeof createServerClient>>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/challenges/active', () => {
  it('returns 401 when not authenticated', async () => {
    mockedCreate.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns { challenge, participation } when authenticated', async () => {
    mockedCreate.mockResolvedValue(authedSupabase('m1'))
    mockedCRepo.mockImplementation(() => ({
      getActive: vi.fn().mockResolvedValue({ id: 'c1', status: 'active' }),
      getById: vi.fn(), getUpcoming: vi.fn(),
    } as unknown as InstanceType<typeof SupabaseChallengeRepository>))
    mockedPRepo.mockImplementation(() => ({
      getByMember: vi.fn().mockResolvedValue({ id: 'p1' }),
      enroll: vi.fn(), decrementPass: vi.fn(),
      markFailed: vi.fn(), markCompleted: vi.fn(), listForChallenge: vi.fn(),
    } as unknown as InstanceType<typeof SupabaseChallengeParticipationRepository>))

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.challenge.id).toBe('c1')
    expect(body.participation.id).toBe('p1')
  })
})
```

- [ ] **Step 12.2: 테스트 실패 확인**

Run:
```bash
npx vitest run tests/unit/api/challenges-active.test.ts
```
Expected: FAIL — route not found.

- [ ] **Step 12.3: 구현**

`src/app/api/challenges/active/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { GetActiveChallengeUseCase } from '@/application/use-cases/get-active-challenge'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) return NextResponse.json({ error: 'NO_MEMBER_LINK' }, { status: 403 })

  try {
    const cRepo = new SupabaseChallengeRepository(supabase)
    const pRepo = new SupabaseChallengeParticipationRepository(supabase)
    const uc = new GetActiveChallengeUseCase(cRepo, pRepo)
    const result = await uc.execute(memberId)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

- [ ] **Step 12.4: 테스트 통과 확인**

Run:
```bash
npx vitest run tests/unit/api/challenges-active.test.ts
```
Expected: PASS.

- [ ] **Step 12.5: 커밋**

```bash
git add src/app/api/challenges/active/route.ts tests/unit/api/challenges-active.test.ts
git commit -m "feat(api): add GET /api/challenges/active"
```

---

## Task 13: API POST /api/challenges/enroll

**Files:**
- Create: `src/app/api/challenges/enroll/route.ts`
- Test: `tests/unit/api/challenges-enroll.test.ts`

- [ ] **Step 13.1: 실패하는 테스트**

`tests/unit/api/challenges-enroll.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/infrastructure/supabase/client', () => ({
  createServerClient: vi.fn(),
}))
vi.mock('@/infrastructure/supabase/challenge-repository', () => ({
  SupabaseChallengeRepository: vi.fn(),
}))
vi.mock('@/infrastructure/supabase/challenge-participation-repository', () => ({
  SupabaseChallengeParticipationRepository: vi.fn(),
}))

import { POST } from '@/app/api/challenges/enroll/route'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'

const mockedCreate = vi.mocked(createServerClient)
const mockedCRepo = vi.mocked(SupabaseChallengeRepository)
const mockedPRepo = vi.mocked(SupabaseChallengeParticipationRepository)

function authedSupabase(memberId: string) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'u1', user_metadata: { member_id: memberId } } },
      }),
    },
  } as unknown as Awaited<ReturnType<typeof createServerClient>>
}

beforeEach(() => { vi.clearAllMocks() })

describe('POST /api/challenges/enroll', () => {
  it('returns 401 when not authenticated', async () => {
    mockedCreate.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ challengeId: 'c1' }) })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 with REGISTRATION_CLOSED code on past deadline', async () => {
    mockedCreate.mockResolvedValue(authedSupabase('m1'))
    mockedCRepo.mockImplementation(() => ({
      getById: vi.fn().mockResolvedValue({
        id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
        startDate: '2026-01-01', registrationDeadline: '2026-01-04',
        passCount: 5, status: 'upcoming', createdAt: '2026-01-01T00:00:00Z',
      }),
      getActive: vi.fn(), getUpcoming: vi.fn(),
    } as unknown as InstanceType<typeof SupabaseChallengeRepository>))
    mockedPRepo.mockImplementation(() => ({
      getByMember: vi.fn().mockResolvedValue(null),
      enroll: vi.fn(), decrementPass: vi.fn(),
      markFailed: vi.fn(), markCompleted: vi.fn(), listForChallenge: vi.fn(),
    } as unknown as InstanceType<typeof SupabaseChallengeParticipationRepository>))

    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ challengeId: 'c1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('REGISTRATION_CLOSED')
  })

  it('returns 201 with participation on success', async () => {
    mockedCreate.mockResolvedValue(authedSupabase('m1'))
    mockedCRepo.mockImplementation(() => ({
      getById: vi.fn().mockResolvedValue({
        id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
        startDate: '2099-01-01', registrationDeadline: '2099-01-04',
        passCount: 5, status: 'upcoming', createdAt: '2026-01-01T00:00:00Z',
      }),
      getActive: vi.fn(), getUpcoming: vi.fn(),
    } as unknown as InstanceType<typeof SupabaseChallengeRepository>))
    mockedPRepo.mockImplementation(() => ({
      getByMember: vi.fn().mockResolvedValue(null),
      enroll: vi.fn().mockResolvedValue({
        id: 'p1', challengeId: 'c1', memberId: 'm1',
        joinedAt: '2026-06-11T00:00:00Z', passesRemaining: 5,
        completedAt: null, failedAt: null,
      }),
      decrementPass: vi.fn(),
      markFailed: vi.fn(), markCompleted: vi.fn(), listForChallenge: vi.fn(),
    } as unknown as InstanceType<typeof SupabaseChallengeParticipationRepository>))

    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ challengeId: 'c1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('p1')
  })
})
```

- [ ] **Step 13.2: 테스트 실패 확인**

Run:
```bash
npx vitest run tests/unit/api/challenges-enroll.test.ts
```
Expected: FAIL.

- [ ] **Step 13.3: 구현**

`src/app/api/challenges/enroll/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { EnrollChallengeUseCase, EnrollError } from '@/application/use-cases/enroll-challenge'

function kstToday(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) return NextResponse.json({ error: 'NO_MEMBER_LINK' }, { status: 403 })

  let body: { challengeId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }
  if (!body.challengeId) return NextResponse.json({ error: 'MISSING_CHALLENGE_ID' }, { status: 400 })

  try {
    const cRepo = new SupabaseChallengeRepository(supabase)
    const pRepo = new SupabaseChallengeParticipationRepository(supabase)
    const uc = new EnrollChallengeUseCase(cRepo, pRepo)
    const participation = await uc.execute({
      challengeId: body.challengeId,
      memberId,
      today: kstToday(),
    })
    return NextResponse.json(participation, { status: 201 })
  } catch (err) {
    if (err instanceof EnrollError) {
      return NextResponse.json({ error: err.code }, { status: 400 })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

- [ ] **Step 13.4: 테스트 통과 확인**

Run:
```bash
npx vitest run tests/unit/api/challenges-enroll.test.ts
```
Expected: PASS — 3 tests.

- [ ] **Step 13.5: 커밋**

```bash
git add src/app/api/challenges/enroll/route.ts tests/unit/api/challenges-enroll.test.ts
git commit -m "feat(api): add POST /api/challenges/enroll"
```

---

## Task 14: API POST /api/challenges/mission

**Files:**
- Create: `src/app/api/challenges/mission/route.ts`
- Test: `tests/unit/api/challenges-mission.test.ts`

- [ ] **Step 14.1: 실패하는 테스트**

`tests/unit/api/challenges-mission.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/infrastructure/supabase/client', () => ({
  createServerClient: vi.fn(),
}))
vi.mock('@/infrastructure/supabase/challenge-repository', () => ({
  SupabaseChallengeRepository: vi.fn(),
}))
vi.mock('@/infrastructure/supabase/challenge-participation-repository', () => ({
  SupabaseChallengeParticipationRepository: vi.fn(),
}))
vi.mock('@/infrastructure/supabase/mission-log-repository', () => ({
  SupabaseMissionLogRepository: vi.fn(),
}))

import { POST } from '@/app/api/challenges/mission/route'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { SupabaseMissionLogRepository } from '@/infrastructure/supabase/mission-log-repository'

const mockedCreate = vi.mocked(createServerClient)
const mockedCRepo = vi.mocked(SupabaseChallengeRepository)
const mockedPRepo = vi.mocked(SupabaseChallengeParticipationRepository)
const mockedMRepo = vi.mocked(SupabaseMissionLogRepository)

function authed() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'u1', user_metadata: { member_id: 'm1' } } },
      }),
    },
  } as unknown as Awaited<ReturnType<typeof createServerClient>>
}

beforeEach(() => { vi.clearAllMocks() })

describe('POST /api/challenges/mission', () => {
  it('returns 400 NEGATIVE_DELTA', async () => {
    mockedCreate.mockResolvedValue(authed())
    mockedCRepo.mockImplementation(() => ({
      getById: vi.fn().mockResolvedValue({
        id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
        startDate: '2026-01-01', registrationDeadline: '2026-01-04',
        passCount: 5, status: 'active', createdAt: '2026-01-01T00:00:00Z',
      }),
      getActive: vi.fn().mockResolvedValue({
        id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
        startDate: '2026-01-01', registrationDeadline: '2026-01-04',
        passCount: 5, status: 'active', createdAt: '2026-01-01T00:00:00Z',
      }),
      getUpcoming: vi.fn(),
    } as unknown as InstanceType<typeof SupabaseChallengeRepository>))
    mockedPRepo.mockImplementation(() => ({
      getByMember: vi.fn().mockResolvedValue({
        id: 'p1', challengeId: 'c1', memberId: 'm1',
        joinedAt: '2026-01-01T00:00:00Z', passesRemaining: 5,
        completedAt: null, failedAt: null,
      }),
      enroll: vi.fn(), decrementPass: vi.fn(),
      markFailed: vi.fn(), markCompleted: vi.fn(), listForChallenge: vi.fn(),
    } as unknown as InstanceType<typeof SupabaseChallengeParticipationRepository>))
    mockedMRepo.mockImplementation(() => ({
      getByParticipation: vi.fn(), getOne: vi.fn(),
      upsertCount: vi.fn(), markPass: vi.fn(),
    } as unknown as InstanceType<typeof SupabaseMissionLogRepository>))

    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ delta: -1 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('NEGATIVE_DELTA')
  })
})
```

- [ ] **Step 14.2: 테스트 실패 확인**

Run:
```bash
npx vitest run tests/unit/api/challenges-mission.test.ts
```
Expected: FAIL.

- [ ] **Step 14.3: 구현**

`src/app/api/challenges/mission/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { SupabaseMissionLogRepository } from '@/infrastructure/supabase/mission-log-repository'
import { LogMissionCountUseCase, LogMissionError } from '@/application/use-cases/log-mission-count'

function kstToday(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) return NextResponse.json({ error: 'NO_MEMBER_LINK' }, { status: 403 })

  let body: { delta?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }
  if (typeof body.delta !== 'number') {
    return NextResponse.json({ error: 'MISSING_DELTA' }, { status: 400 })
  }

  try {
    const cRepo = new SupabaseChallengeRepository(supabase)
    const pRepo = new SupabaseChallengeParticipationRepository(supabase)
    const mRepo = new SupabaseMissionLogRepository(supabase)

    const challenge = await cRepo.getActive()
    if (!challenge) return NextResponse.json({ error: 'NO_ACTIVE_CHALLENGE' }, { status: 400 })

    const participation = await pRepo.getByMember(challenge.id, memberId)
    if (!participation) return NextResponse.json({ error: 'NOT_ENROLLED' }, { status: 400 })

    const uc = new LogMissionCountUseCase(cRepo, pRepo, mRepo)
    const log = await uc.execute({
      participation,
      delta: body.delta,
      today: kstToday(),
    })
    return NextResponse.json(log, { status: 200 })
  } catch (err) {
    if (err instanceof LogMissionError) {
      return NextResponse.json({ error: err.code }, { status: 400 })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

- [ ] **Step 14.4: 테스트 통과 확인**

Run:
```bash
npx vitest run tests/unit/api/challenges-mission.test.ts
```
Expected: PASS.

- [ ] **Step 14.5: 커밋**

```bash
git add src/app/api/challenges/mission/route.ts tests/unit/api/challenges-mission.test.ts
git commit -m "feat(api): add POST /api/challenges/mission"
```

---

## Task 15: API GET /api/challenges/mission/board

**Files:**
- Create: `src/app/api/challenges/mission/board/route.ts`
- Test: `tests/unit/api/challenges-mission-board.test.ts`

- [ ] **Step 15.1: 실패하는 테스트**

`tests/unit/api/challenges-mission-board.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/infrastructure/supabase/client', () => ({
  createServerClient: vi.fn(),
}))
vi.mock('@/infrastructure/supabase/challenge-repository', () => ({
  SupabaseChallengeRepository: vi.fn(),
}))
vi.mock('@/infrastructure/supabase/challenge-participation-repository', () => ({
  SupabaseChallengeParticipationRepository: vi.fn(),
}))
vi.mock('@/infrastructure/supabase/mission-log-repository', () => ({
  SupabaseMissionLogRepository: vi.fn(),
}))

import { GET } from '@/app/api/challenges/mission/board/route'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { SupabaseMissionLogRepository } from '@/infrastructure/supabase/mission-log-repository'

const mockedCreate = vi.mocked(createServerClient)
const mockedCRepo = vi.mocked(SupabaseChallengeRepository)
const mockedPRepo = vi.mocked(SupabaseChallengeParticipationRepository)
const mockedMRepo = vi.mocked(SupabaseMissionLogRepository)

beforeEach(() => { vi.clearAllMocks() })

describe('GET /api/challenges/mission/board', () => {
  it('returns 401 when not authenticated', async () => {
    mockedCreate.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns board JSON when enrolled', async () => {
    mockedCreate.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1', user_metadata: { member_id: 'm1' } } },
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    mockedCRepo.mockImplementation(() => ({
      getActive: vi.fn().mockResolvedValue({
        id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
        startDate: '2026-07-01', registrationDeadline: '2026-07-04',
        passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
      }),
      getById: vi.fn().mockResolvedValue({
        id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
        startDate: '2026-07-01', registrationDeadline: '2026-07-04',
        passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
      }),
      getUpcoming: vi.fn(),
    } as unknown as InstanceType<typeof SupabaseChallengeRepository>))
    mockedPRepo.mockImplementation(() => ({
      getByMember: vi.fn().mockResolvedValue({
        id: 'p1', challengeId: 'c1', memberId: 'm1',
        joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 5,
        completedAt: null, failedAt: null,
      }),
      enroll: vi.fn(), decrementPass: vi.fn(),
      markFailed: vi.fn(), markCompleted: vi.fn(), listForChallenge: vi.fn(),
    } as unknown as InstanceType<typeof SupabaseChallengeParticipationRepository>))
    mockedMRepo.mockImplementation(() => ({
      getByParticipation: vi.fn().mockResolvedValue([]),
      getOne: vi.fn(), upsertCount: vi.fn(), markPass: vi.fn(),
    } as unknown as InstanceType<typeof SupabaseMissionLogRepository>))

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cells).toHaveLength(100)
    expect(body.passesRemaining).toBe(5)
  })
})
```

- [ ] **Step 15.2: 테스트 실패 확인**

Run:
```bash
npx vitest run tests/unit/api/challenges-mission-board.test.ts
```
Expected: FAIL.

- [ ] **Step 15.3: 구현**

`src/app/api/challenges/mission/board/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { SupabaseMissionLogRepository } from '@/infrastructure/supabase/mission-log-repository'
import { GetMissionBoardUseCase } from '@/application/use-cases/get-mission-board'

function kstToday(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) return NextResponse.json({ error: 'NO_MEMBER_LINK' }, { status: 403 })

  try {
    const cRepo = new SupabaseChallengeRepository(supabase)
    const pRepo = new SupabaseChallengeParticipationRepository(supabase)
    const mRepo = new SupabaseMissionLogRepository(supabase)

    const challenge = await cRepo.getActive()
    if (!challenge) return NextResponse.json({ error: 'NO_ACTIVE_CHALLENGE' }, { status: 404 })

    const participation = await pRepo.getByMember(challenge.id, memberId)
    if (!participation) return NextResponse.json({ error: 'NOT_ENROLLED' }, { status: 404 })

    const uc = new GetMissionBoardUseCase(cRepo, mRepo)
    const board = await uc.execute({ participation, today: kstToday() })
    return NextResponse.json(board)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

- [ ] **Step 15.4: 테스트 통과 확인**

Run:
```bash
npx vitest run tests/unit/api/challenges-mission-board.test.ts
```
Expected: PASS.

- [ ] **Step 15.5: 풀 테스트 + 타입 체크**

```bash
npx vitest run
npx tsc --noEmit
```
Expected: 모든 테스트 PASS, 타입 에러 없음.

- [ ] **Step 15.6: 커밋**

```bash
git add src/app/api/challenges/mission/board/route.ts tests/unit/api/challenges-mission-board.test.ts
git commit -m "feat(api): add GET /api/challenges/mission/board"
```

---

## P1 완료 검증

- [ ] 모든 마이그레이션이 staging DB 에 적용되어 있고 `npx supabase db diff` 결과가 비어있다.
- [ ] `npx vitest run` 통과 (unit + integration 모두).
- [ ] `npx tsc --noEmit` 에러 없음.
- [ ] curl 으로 `/api/challenges/active` 가 인증된 사용자에게 200 또는 `{ challenge: null, participation: null }` 을 반환한다.
- [ ] curl 으로 `/api/challenges/enroll` POST 가 동작한다 (시작일 전 활성 시즌이 있어야 의미 있음).

## 다음 플랜으로 인계

P1 완료 후 다음 플랜 진행:
- **P2: 미션 UI** — `/mission` 페이지, MissionBoard/StampCell/TodayCounter 컴포넌트, 하단 탭 5번째 추가
- **P3: 백엔드 잡** — Edge Function `daily-pass-check`, `RunDailyPassCheckUseCase`, pg_cron
- **P4: Web Push** — Service Worker, VAPID, `push_subscriptions` 테이블, iOS 설치 가이드
- **P5: 완주 인증 + 피드 Realtime**
- **P6: 공지 + Enroll UI**

## Self-Review

- **Spec coverage:** P1 범위 = 데이터 모델, 도메인, 핵심 use-case, API 라우트. 스펙의 "P1 범위 밖" 항목들은 P2~P6 으로 명시.
- **Placeholder scan:** TBD/TODO 없음. 모든 step 에 실제 코드/명령어 포함.
- **Type consistency:** Challenge/ChallengeParticipation/MissionLog 의 필드명이 entity, repo 인터페이스, DB row 매퍼, 테스트에서 일관됨. `passesRemaining`, `goalPerDay`, `startDate` 등 camelCase 통일.
- **컴파일/타입 검증 step**: Task 2, 4, 15에 `tsc --noEmit` 포함.
- **TDD 순서:** 모든 로직 태스크가 test → fail → impl → pass → commit 단계.
- **KST 처리:** 모든 API 에서 `kstToday()` 헬퍼로 일관 처리 (UTC + 9시간 offset 후 slice).
- **idempotency:** EnrollChallenge 가 기존 참가 시 enroll 호출 안 함. mission_logs upsert RPC 가 unique constraint 기반 atomic increment.
