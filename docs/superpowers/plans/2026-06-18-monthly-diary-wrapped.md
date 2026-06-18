# Monthly Diary Wrapped Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Spotify-Wrapped-style public shareable monthly diary at `/diary/[memberId]/[YYYY-MM]` with 7-card sequence + full diary scroll page + dynamic OG image + CalendarView share trigger.

**Architecture:** Server Components fetch runs directly via existing `SupabaseRunLogRepository` (add month-range method) → pure-function stats helper computes Wrapped data → Client `WrappedDeck` drives auto-advance/swipe/audio. ISR 1h cache + `revalidatePath` from record mutations. Full diary uses same data shape, separate Server Component. OG image uses `next/og`. CalendarView gains share icon for own-calendar trigger.

**Tech Stack:** Next.js 16 App Router (Server Components + ISR), Supabase, TypeScript, Pretendard Variable, Web Share API, `next/og` for OG image, Vitest for unit tests.

## Global Constraints

- **Spec source of truth:** `docs/superpowers/specs/2026-06-18-monthly-diary-wrapped-design.md` (Decision Log section is canonical)
- **Pretendard only** — no Caveat, no other fonts
- **Mobile-first:** min target iPhone SE 375px, safe-area-inset applied
- **Inline styles** — match existing project pattern (no CSS module / Tailwind)
- **Clean architecture layers:** domain (pure) → infrastructure (Supabase) → app (route handlers, server pages) → presentation (components)
- **Public access** (noindex), no auth on Wrapped or `/all`
- **ISR `revalidate = 3600`** + `revalidatePath('/diary/[memberId]/[YYYY-MM]')` from record POST/PATCH/DELETE
- **`prefers-reduced-motion: reduce`** → auto-advance OFF, fade 0ms
- **No UTM, no analytics tracking on share URL**
- **Card 7 reset (↻):** quote stays the same (session-stable random pick)
- **BGM source:** Mixkit (with attribution footer link)
- **Card sequence:** intro / total / streak / longest / voice / album / share (skip rules per spec §5)

---

## Phase 1 — Domain layer + month-range query + tests

Pure functions, repo extension, scaffold route. No UI yet.

### Task 1: Month-range helper

**Files:**
- Create: `src/domain/diary/month-range.ts`
- Create: `tests/unit/diary/month-range.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `parseYearMonth(s: string): { year: number; month: number } | null`, `monthDateRange(year: number, month: number): { start: string; end: string }`, `isValidMonth(year: number, month: number, now?: Date): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/diary/month-range.test.ts
import { describe, it, expect } from 'vitest'
import { parseYearMonth, monthDateRange, isValidMonth } from '@/domain/diary/month-range'

describe('parseYearMonth', () => {
  it('parses YYYY-MM', () => {
    expect(parseYearMonth('2026-06')).toEqual({ year: 2026, month: 6 })
  })
  it('rejects bad format', () => {
    expect(parseYearMonth('2026-6')).toBeNull()
    expect(parseYearMonth('2026-13')).toBeNull()
    expect(parseYearMonth('2026-00')).toBeNull()
    expect(parseYearMonth('abc')).toBeNull()
    expect(parseYearMonth('')).toBeNull()
  })
})

describe('monthDateRange', () => {
  it('returns first/last day inclusive YYYY-MM-DD', () => {
    expect(monthDateRange(2026, 6)).toEqual({ start: '2026-06-01', end: '2026-06-30' })
    expect(monthDateRange(2026, 2)).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(monthDateRange(2024, 2)).toEqual({ start: '2024-02-01', end: '2024-02-29' })
    expect(monthDateRange(2026, 1)).toEqual({ start: '2026-01-01', end: '2026-01-31' })
    expect(monthDateRange(2026, 12)).toEqual({ start: '2026-12-01', end: '2026-12-31' })
  })
})

describe('isValidMonth', () => {
  const now = new Date('2026-06-18T00:00:00+09:00')
  it('accepts current and past months', () => {
    expect(isValidMonth(2026, 6, now)).toBe(true)
    expect(isValidMonth(2026, 5, now)).toBe(true)
    expect(isValidMonth(2025, 12, now)).toBe(true)
  })
  it('rejects future months', () => {
    expect(isValidMonth(2026, 7, now)).toBe(false)
    expect(isValidMonth(2027, 1, now)).toBe(false)
  })
  it('rejects before app existence (2025-05 floor)', () => {
    expect(isValidMonth(2025, 4, now)).toBe(false)
    expect(isValidMonth(2024, 12, now)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/unit/diary/month-range.test.ts
```
Expected: FAIL with module not found.

- [ ] **Step 3: Implement helper**

```ts
// src/domain/diary/month-range.ts
const APP_FLOOR_YEAR = 2025
const APP_FLOOR_MONTH = 5 // app launched 2025-05; earlier months have no data

export function parseYearMonth(s: string): { year: number; month: number } | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) return null
  const [y, m] = s.split('-').map(Number)
  return { year: y, month: m }
}

export function monthDateRange(year: number, month: number): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(lastDay)}` }
}

export function isValidMonth(year: number, month: number, now: Date = new Date()): boolean {
  const cur = { year: now.getFullYear(), month: now.getMonth() + 1 }
  if (year > cur.year || (year === cur.year && month > cur.month)) return false
  if (year < APP_FLOOR_YEAR || (year === APP_FLOOR_YEAR && month < APP_FLOOR_MONTH)) return false
  return true
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/unit/diary/month-range.test.ts
```
Expected: PASS, all green.

- [ ] **Step 5: Commit**

```bash
git add src/domain/diary/month-range.ts tests/unit/diary/month-range.test.ts
git commit -m "feat(diary): add month-range domain helper with validation"
```

---

### Task 2: Repository method `getByMemberAndMonth`

**Files:**
- Modify: `src/infrastructure/supabase/run-log-repository.ts` (add method after `getByMemberId`, line 109)

**Interfaces:**
- Consumes: `monthDateRange` from Task 1
- Produces: `SupabaseRunLogRepository.getByMemberAndMonth(memberId: string, year: number, month: number): Promise<RunLog[]>` — date ascending for streak math

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/diary/run-log-repository-month.test.ts
import { describe, it, expect, vi } from 'vitest'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'

describe('SupabaseRunLogRepository.getByMemberAndMonth', () => {
  it('queries with start/end date range and member_id, ordered by date asc', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    const lte = vi.fn().mockReturnValue({ order })
    const gte = vi.fn().mockReturnValue({ lte })
    const eq = vi.fn().mockReturnValue({ gte })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    const supabase = { from } as never

    const repo = new SupabaseRunLogRepository(supabase)
    await repo.getByMemberAndMonth('m1', 2026, 6)

    expect(from).toHaveBeenCalledWith('run_logs')
    expect(eq).toHaveBeenCalledWith('member_id', 'm1')
    expect(gte).toHaveBeenCalledWith('date', '2026-06-01')
    expect(lte).toHaveBeenCalledWith('date', '2026-06-30')
    expect(order).toHaveBeenCalledWith('date', { ascending: true })
  })
})
```

- [ ] **Step 2: Run test, expect FAIL (method missing)**

```bash
npx vitest run tests/unit/diary/run-log-repository-month.test.ts
```

- [ ] **Step 3: Add method to repository**

Insert after existing `getByMemberId` (around line 109). Import `monthDateRange` at top.

```ts
// at top of file, alongside other imports
import { monthDateRange } from '@/domain/diary/month-range'

// inside SupabaseRunLogRepository class, after getByMemberId
async getByMemberAndMonth(memberId: string, year: number, month: number): Promise<RunLog[]> {
  const { start, end } = monthDateRange(year, month)
  const { data, error } = await this.supabase
    .from('run_logs')
    .select(SELECT_FIELDS)
    .eq('member_id', memberId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })

  if (error) throw new Error(`getByMemberAndMonth failed: ${error.message}`)
  return (data as unknown as RunLogRow[]).map(toRunLog)
}
```

- [ ] **Step 4: Run test to verify it passes + run full unit suite**

```bash
npx vitest run tests/unit/diary/
```
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/supabase/run-log-repository.ts tests/unit/diary/run-log-repository-month.test.ts
git commit -m "feat(diary): add getByMemberAndMonth to run-log repository"
```

---

### Task 3: Wrapped stats pure function

**Files:**
- Create: `src/domain/diary/wrapped-stats.ts`
- Create: `tests/unit/diary/wrapped-stats.test.ts`

**Interfaces:**
- Consumes: `RunLog` type from `@/domain/entities/run-log`
- Produces:

```ts
export type WrappedStats = {
  totalRuns: number
  totalMinutes: number
  maxStreak: number
  streakLastDows: string[]      // e.g. ['월','화','수','목','금'] last 5 days of longest streak
  longestRun: RunLog | null
  voicePool: RunLog[]           // runs with non-empty thoughtAfter (client picks one)
  albumPhotos: { runId: string; photoUrl: string; date: string }[]  // newest first, max 9 returned + total count
  albumOverflowCount: number    // number beyond 9
}
export function computeWrappedStats(runs: RunLog[]): WrappedStats
```

- [ ] **Step 1: Write the failing test (cover happy + empty + edges)**

```ts
// tests/unit/diary/wrapped-stats.test.ts
import { describe, it, expect } from 'vitest'
import { computeWrappedStats } from '@/domain/diary/wrapped-stats'
import type { RunLog } from '@/domain/entities/run-log'

function mk(over: Partial<RunLog>): RunLog {
  return {
    id: 'r', memberId: 'm', memberName: 'd', memberAvatarUrl: '', memberInstaId: '',
    date: '2026-06-01', runTime: null, durationMin: 30, title: 't',
    thoughtBefore: '', thoughtDuring: '', thoughtAfter: '',
    location: '', photoUrl: '', rawPhotoUrl: null, createdAt: '',
    likeCount: 0, commentCount: 0, ...over,
  }
}

describe('computeWrappedStats', () => {
  it('returns zero stats for empty runs', () => {
    const s = computeWrappedStats([])
    expect(s.totalRuns).toBe(0)
    expect(s.totalMinutes).toBe(0)
    expect(s.maxStreak).toBe(0)
    expect(s.streakLastDows).toEqual([])
    expect(s.longestRun).toBeNull()
    expect(s.voicePool).toEqual([])
    expect(s.albumPhotos).toEqual([])
    expect(s.albumOverflowCount).toBe(0)
  })

  it('sums runs and minutes', () => {
    const s = computeWrappedStats([mk({ durationMin: 30 }), mk({ id: 'r2', date: '2026-06-02', durationMin: 45 })])
    expect(s.totalRuns).toBe(2)
    expect(s.totalMinutes).toBe(75)
  })

  it('computes max streak across gaps', () => {
    const runs = [
      mk({ id: 'a', date: '2026-06-01' }),
      mk({ id: 'b', date: '2026-06-02' }),
      mk({ id: 'c', date: '2026-06-03' }),
      // gap
      mk({ id: 'd', date: '2026-06-06' }),
      mk({ id: 'e', date: '2026-06-07' }),
    ]
    const s = computeWrappedStats(runs)
    expect(s.maxStreak).toBe(3)
    expect(s.streakLastDows.length).toBeLessThanOrEqual(5)
    expect(s.streakLastDows[s.streakLastDows.length - 1]).toBe('수') // 2026-06-03 Wed
  })

  it('streakLastDows caps at 5 for streaks longer than 5', () => {
    const runs = Array.from({ length: 7 }, (_, i) =>
      mk({ id: `r${i}`, date: `2026-06-${String(i + 1).padStart(2, '0')}` })
    )
    const s = computeWrappedStats(runs)
    expect(s.maxStreak).toBe(7)
    expect(s.streakLastDows.length).toBe(5)
  })

  it('dedupes same date when computing streak', () => {
    const runs = [
      mk({ id: 'a', date: '2026-06-01' }),
      mk({ id: 'b', date: '2026-06-01', durationMin: 20 }), // same day twice
      mk({ id: 'c', date: '2026-06-02' }),
    ]
    expect(computeWrappedStats(runs).maxStreak).toBe(2)
  })

  it('picks longest run by durationMin', () => {
    const runs = [mk({ id: 'a', durationMin: 30 }), mk({ id: 'b', durationMin: 72 }), mk({ id: 'c', durationMin: 45 })]
    expect(computeWrappedStats(runs).longestRun?.id).toBe('b')
  })

  it('voicePool contains only runs with thoughtAfter', () => {
    const runs = [
      mk({ id: 'a', thoughtAfter: 'great' }),
      mk({ id: 'b', thoughtAfter: '' }),
      mk({ id: 'c', thoughtAfter: 'tough' }),
    ]
    const pool = computeWrappedStats(runs).voicePool
    expect(pool.map(r => r.id).sort()).toEqual(['a', 'c'])
  })

  it('albumPhotos returns newest-first, max 9, with overflow count', () => {
    const runs = Array.from({ length: 12 }, (_, i) =>
      mk({ id: `r${i}`, date: `2026-06-${String(i + 1).padStart(2, '0')}`, photoUrl: `p${i}.jpg` })
    )
    runs.push(mk({ id: 'nophoto', date: '2026-06-13', photoUrl: '' }))
    const s = computeWrappedStats(runs)
    expect(s.albumPhotos.length).toBe(9)
    expect(s.albumPhotos[0].date).toBe('2026-06-12') // newest with photo
    expect(s.albumOverflowCount).toBe(3) // 12 with photos - 9 shown
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npx vitest run tests/unit/diary/wrapped-stats.test.ts
```

- [ ] **Step 3: Implement stats**

```ts
// src/domain/diary/wrapped-stats.ts
import type { RunLog } from '@/domain/entities/run-log'

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토']

export type WrappedStats = {
  totalRuns: number
  totalMinutes: number
  maxStreak: number
  streakLastDows: string[]
  longestRun: RunLog | null
  voicePool: RunLog[]
  albumPhotos: { runId: string; photoUrl: string; date: string }[]
  albumOverflowCount: number
}

function dowOf(date: string): string {
  return DOW_KO[new Date(`${date}T00:00:00`).getDay()]
}

function computeMaxStreak(uniqueDates: string[]): { len: number; endDate: string | null } {
  if (uniqueDates.length === 0) return { len: 0, endDate: null }
  const sorted = [...uniqueDates].sort()
  let best = 1, cur = 1, bestEnd = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00`)
    const curD = new Date(`${sorted[i]}T00:00:00`)
    const diffDays = Math.round((curD.getTime() - prev.getTime()) / 86400000)
    if (diffDays === 1) cur++
    else cur = 1
    if (cur > best) { best = cur; bestEnd = sorted[i] }
  }
  return { len: best, endDate: bestEnd }
}

function lastStreakDows(endDate: string, len: number): string[] {
  const take = Math.min(len, 5)
  const out: string[] = []
  const end = new Date(`${endDate}T00:00:00`)
  for (let i = take - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86400000)
    out.push(DOW_KO[d.getDay()])
  }
  return out
}

export function computeWrappedStats(runs: RunLog[]): WrappedStats {
  if (runs.length === 0) {
    return {
      totalRuns: 0, totalMinutes: 0, maxStreak: 0, streakLastDows: [],
      longestRun: null, voicePool: [], albumPhotos: [], albumOverflowCount: 0,
    }
  }

  const totalMinutes = runs.reduce((acc, r) => acc + r.durationMin, 0)
  const uniqueDates = Array.from(new Set(runs.map(r => r.date)))
  const { len, endDate } = computeMaxStreak(uniqueDates)
  const streakLastDows = endDate ? lastStreakDows(endDate, len) : []

  const longestRun = runs.reduce<RunLog | null>(
    (best, r) => (best == null || r.durationMin > best.durationMin ? r : best),
    null,
  )

  const voicePool = runs.filter(r => r.thoughtAfter.trim().length > 0)

  const withPhoto = runs
    .filter(r => r.photoUrl)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  const albumPhotos = withPhoto.slice(0, 9).map(r => ({ runId: r.id, photoUrl: r.photoUrl, date: r.date }))
  const albumOverflowCount = Math.max(0, withPhoto.length - 9)

  void dowOf // keep export-internal helper reachable for future use without dead-code warning

  return {
    totalRuns: runs.length,
    totalMinutes,
    maxStreak: len,
    streakLastDows,
    longestRun,
    voicePool,
    albumPhotos,
    albumOverflowCount,
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/unit/diary/
```
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/domain/diary/wrapped-stats.ts tests/unit/diary/wrapped-stats.test.ts
git commit -m "feat(diary): add computeWrappedStats pure function"
```

---

### Task 3.5: `SupabaseMemberRepository.getById` method

**Files:**
- Modify: `src/infrastructure/supabase/member-repository.ts` (add method; mirror existing patterns + `SupabaseChallengeRepository.getById` shape at `src/infrastructure/supabase/challenge-repository.ts:57-66`)
- Create: `tests/unit/diary/member-repository-getbyid.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `SupabaseMemberRepository.getById(memberId: string): Promise<Member | null>` — returns `null` when row missing (not throw)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest'
import { SupabaseMemberRepository } from '@/infrastructure/supabase/member-repository'

describe('SupabaseMemberRepository.getById', () => {
  it('returns Member when row found', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'm1', name: 'duvis', avatar_url: 'a.jpg', insta_id: 'duvis' },
      error: null,
    })
    const eq = vi.fn().mockReturnValue({ single })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    const supabase = { from } as never

    const m = await new SupabaseMemberRepository(supabase).getById('m1')
    expect(from).toHaveBeenCalledWith('members')
    expect(eq).toHaveBeenCalledWith('id', 'm1')
    expect(m?.id).toBe('m1')
    expect(m?.name).toBe('duvis')
  })

  it('returns null when row missing (PGRST116)', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ single }) }) }) } as never
    const m = await new SupabaseMemberRepository(supabase).getById('missing')
    expect(m).toBeNull()
  })

  it('throws on other errors', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { code: 'XYZ', message: 'boom' } })
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ single }) }) }) } as never
    await expect(new SupabaseMemberRepository(supabase).getById('x')).rejects.toThrow(/boom/)
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npx vitest run tests/unit/diary/member-repository-getbyid.test.ts
```

- [ ] **Step 3: Add method**

Inside `SupabaseMemberRepository` class. Match existing field-mapping helper (look at `getAll` / `getLeaderboard` for the row → `Member` conversion shape — reuse the same mapper helper if one exists, otherwise inline the mapping consistent with those methods).

```ts
async getById(memberId: string): Promise<Member | null> {
  const { data, error } = await this.supabase
    .from('members')
    .select('id, name, avatar_url, insta_id')
    .eq('id', memberId)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null  // no rows
    throw new Error(`getById failed: ${error.message}`)
  }
  return {
    id: data.id,
    name: data.name,
    avatarUrl: data.avatar_url ?? '',
    instaId: data.insta_id ?? '',
  }
}
```

(If `Member` type shape in `src/domain/entities/member.ts` has additional fields, extend `select` + mapping to match — read that file before editing.)

- [ ] **Step 4: Tests pass**

```bash
npx vitest run tests/unit/diary/
```

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/supabase/member-repository.ts tests/unit/diary/member-repository-getbyid.test.ts
git commit -m "feat(diary): add Member.getById to repository"
```

---

### Task 4: Route scaffold `/diary/[memberId]/[yearMonth]` (Server Component)

**Files:**
- Create: `src/app/diary/[memberId]/[yearMonth]/page.tsx`
- Create: `src/app/diary/[memberId]/[yearMonth]/layout.tsx` (sets `<meta robots noindex>` + opens out of app layout)

**Interfaces:**
- Consumes: `parseYearMonth`, `isValidMonth`, `SupabaseRunLogRepository.getByMemberAndMonth`, `computeWrappedStats`, Member lookup
- Produces: page renders (placeholder for now) — Phase 2 will swap in `<WrappedDeck>`

- [ ] **Step 1: Add Supabase member fetch helper if missing**

Check `search_graph(query: "MemberRepository getById")`. If `SupabaseMemberRepository` lacks `getById(memberId): Promise<Member | null>`, add it (mirror existing patterns; out of scope for this task description but required — add a similar TDD task if absent). For this plan assume the helper exists; if it doesn't, add it before continuing.

- [ ] **Step 2: Write layout with noindex**

```tsx
// src/app/diary/[memberId]/[yearMonth]/layout.tsx
import type { Metadata, ReactNode } from 'react'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DiaryLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 3: Write page skeleton (renders raw data — UI swap in Phase 2)**

```tsx
// src/app/diary/[memberId]/[yearMonth]/page.tsx
import { notFound } from 'next/navigation'
import { createServerClient } from '@/infrastructure/supabase/server-client'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { SupabaseMemberRepository } from '@/infrastructure/supabase/member-repository'
import { parseYearMonth, isValidMonth } from '@/domain/diary/month-range'
import { computeWrappedStats } from '@/domain/diary/wrapped-stats'

export const revalidate = 3600

export default async function DiaryWrappedPage({
  params,
}: {
  params: Promise<{ memberId: string; yearMonth: string }>
}) {
  const { memberId, yearMonth } = await params
  const parsed = parseYearMonth(yearMonth)
  if (!parsed || !isValidMonth(parsed.year, parsed.month)) notFound()

  const supabase = await createServerClient()
  const memberRepo = new SupabaseMemberRepository(supabase)
  const member = await memberRepo.getById(memberId)
  if (!member) notFound()

  const runRepo = new SupabaseRunLogRepository(supabase)
  const runs = await runRepo.getByMemberAndMonth(memberId, parsed.year, parsed.month)
  const stats = computeWrappedStats(runs)

  // Phase 2 will replace this with <WrappedDeck member={member} year month stats runs />
  return (
    <pre style={{ padding: 20, fontSize: 12 }}>
      {JSON.stringify({ memberName: member.name, year: parsed.year, month: parsed.month, stats }, null, 2)}
    </pre>
  )
}
```

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
# open http://localhost:3000/diary/<known memberId>/2026-06 — expect JSON dump
# open http://localhost:3000/diary/<known memberId>/2099-01 — expect 404
# open http://localhost:3000/diary/bad-id/2026-06 — expect 404
```

- [ ] **Step 5: Commit**

```bash
git add src/app/diary
git commit -m "feat(diary): scaffold wrapped page route with ISR + validation"
```

---

## Phase 2 — Wrapped 7-card deck client UI

Full UI sequence with auto-advance, swipe, audio, animations.

### Task 5: ShareButton client component

**Files:**
- Create: `src/presentation/components/diary/share-button.tsx`

**Interfaces:**
- Produces: `<ShareButton url: string; title: string; text: string; children: ReactNode />` — uses Web Share API, falls back to clipboard + inline toast

- [ ] **Step 1: Implement**

```tsx
// src/presentation/components/diary/share-button.tsx
'use client'

import { useState, type ReactNode } from 'react'

type Props = { url: string; title: string; text: string; children?: ReactNode }

export function ShareButton({ url, title, text, children }: Props) {
  const [toast, setToast] = useState<string | null>(null)

  async function onClick() {
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({ url, title, text })
        return
      }
    } catch {
      // fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url)
      setToast('링크 복사됨')
      setTimeout(() => setToast(null), 1500)
    } catch {
      setToast('복사 실패')
      setTimeout(() => setToast(null), 1500)
    }
  }

  return (
    <>
      <button type="button" onClick={onClick} style={{
        background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: 999, padding: '12px 24px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
        minHeight: 44, fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
      }}>
        {children ?? '↗ 공유하기'}
      </button>
      {toast && (
        <div role="status" aria-live="polite" style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '10px 16px', borderRadius: 999,
          fontSize: '0.85rem', zIndex: 1000,
        }}>{toast}</div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/presentation/components/diary/share-button.tsx
git commit -m "feat(diary): add ShareButton with Web Share API + clipboard fallback"
```

---

### Task 6: Wrapped card components

**Files:**
- Create: `src/presentation/components/diary/wrapped-cards/intro-card.tsx`
- Create: `src/presentation/components/diary/wrapped-cards/total-card.tsx`
- Create: `src/presentation/components/diary/wrapped-cards/streak-card.tsx`
- Create: `src/presentation/components/diary/wrapped-cards/longest-card.tsx`
- Create: `src/presentation/components/diary/wrapped-cards/voice-card.tsx`
- Create: `src/presentation/components/diary/wrapped-cards/album-card.tsx`
- Create: `src/presentation/components/diary/wrapped-cards/share-card.tsx`
- Create: `src/presentation/components/diary/wrapped-cards/rest-card.tsx` (0-run fallback)
- Create: `src/presentation/components/diary/wrapped-cards/card-shell.tsx` (shared full-bleed wrapper, safe-area, role=region)

**Interfaces:**
- Each card exports a named React component; props typed against `WrappedStats` slices + `member`/`year`/`month`. All are pure presentation (no hooks beyond useMemo). Variant for Voice card takes `quote: { run: RunLog; text: string }`.

- [ ] **Step 1: Build `card-shell.tsx` shared wrapper**

```tsx
// src/presentation/components/diary/wrapped-cards/card-shell.tsx
import type { CSSProperties, ReactNode } from 'react'

type Props = {
  label: string
  bg: CSSProperties['background']
  children: ReactNode
  textColor?: string
}

export function CardShell({ label, bg, children, textColor = '#fff' }: Props) {
  return (
    <section
      role="region"
      aria-label={label}
      style={{
        width: '100vw', height: '100dvh', background: bg, color: textColor,
        padding: 'env(safe-area-inset-top) 24px env(safe-area-inset-bottom) 24px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
        letterSpacing: '-0.01em', overflow: 'hidden',
      }}
    >
      {children}
    </section>
  )
}
```

- [ ] **Step 2: Implement all 8 card components**

Each card matches the spec § 4 layout. Build them mirroring the spec verbatim. Examples:

```tsx
// intro-card.tsx
'use client'
import { CardShell } from './card-shell'
export function IntroCard({ memberName, year, month }: { memberName: string; year: number; month: number }) {
  return (
    <CardShell label="인트로" bg="linear-gradient(180deg,#0F172A,#1E1B4B)">
      <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: 8 }}>{memberName}</div>
      <div style={{ fontSize: '3.4rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 16 }}>
        {year}.{month}
      </div>
      <div style={{ fontSize: '1rem', opacity: 0.85, marginBottom: 32 }}>너의 한 달</div>
      <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>탭해서 시작</div>
    </CardShell>
  )
}
```

(Total / Streak / Longest / Voice / Album / Share / Rest cards: see spec §4 for exact text and colors. Build one per file. Voice card receives `quote: { run; text }` and renders the quote and metadata. Album receives `albumPhotos` + `overflowCount`. Share card renders `<ShareButton>` + replay button + small `/all` link.)

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/diary/wrapped-cards/
git commit -m "feat(diary): add 8 Wrapped card components"
```

---

### Task 7: `WrappedDeck` client orchestrator

**Files:**
- Create: `src/presentation/components/diary/wrapped-deck.tsx`
- Create: `tests/unit/diary/wrapped-deck-cards.test.ts` (test cardSequence logic only, pure)

**Interfaces:**
- Consumes: `WrappedStats`, `RunLog[]`, `member`, `year`, `month`
- Produces: `<WrappedDeck>` — auto-advance 4.5s, tap left/right, swipe ±, long-press pause, BGM toggle, progress bars, `prefers-reduced-motion` honoring, Card 7 replay (preserves voice quote)
- Helper exported for test: `buildCardSequence(stats: WrappedStats): CardKey[]` returns `['intro', 'total', 'streak'?, 'longest'?, 'voice'?, 'album'?, 'share']` applying spec §5 skip rules.

- [ ] **Step 1: Test cardSequence logic**

```ts
// tests/unit/diary/wrapped-deck-cards.test.ts
import { describe, it, expect } from 'vitest'
import { buildCardSequence } from '@/presentation/components/diary/wrapped-deck'

const base = {
  totalRuns: 0, totalMinutes: 0, maxStreak: 0, streakLastDows: [],
  longestRun: null, voicePool: [], albumPhotos: [], albumOverflowCount: 0,
}

describe('buildCardSequence', () => {
  it('returns 3-card sequence for empty month', () => {
    expect(buildCardSequence(base)).toEqual(['intro', 'rest', 'share'])
  })
  it('skips streak when runs < 3', () => {
    const s = { ...base, totalRuns: 2, longestRun: { id: 'a' } as never }
    expect(buildCardSequence(s)).not.toContain('streak')
  })
  it('skips voice when voicePool empty', () => {
    const s = { ...base, totalRuns: 5, longestRun: { id: 'a' } as never }
    expect(buildCardSequence(s)).not.toContain('voice')
  })
  it('skips album when no photos', () => {
    const s = { ...base, totalRuns: 5, longestRun: { id: 'a' } as never, albumPhotos: [] }
    expect(buildCardSequence(s)).not.toContain('album')
  })
  it('full 7-card sequence when all data present', () => {
    const s = {
      totalRuns: 10, totalMinutes: 300, maxStreak: 4, streakLastDows: ['월','화','수','목'],
      longestRun: { id: 'a' } as never,
      voicePool: [{ id: 'b' } as never],
      albumPhotos: [{ runId: 'a', photoUrl: 'p', date: '2026-06-01' }],
      albumOverflowCount: 0,
    }
    expect(buildCardSequence(s)).toEqual(['intro', 'total', 'streak', 'longest', 'voice', 'album', 'share'])
  })
})
```

- [ ] **Step 2: Implement deck**

```tsx
// src/presentation/components/diary/wrapped-deck.tsx
'use client'

import { useState, useEffect, useRef, useMemo, useCallback, type TouchEvent } from 'react'
import type { RunLog } from '@/domain/entities/run-log'
import type { WrappedStats } from '@/domain/diary/wrapped-stats'
import { IntroCard } from './wrapped-cards/intro-card'
import { TotalCard } from './wrapped-cards/total-card'
import { StreakCard } from './wrapped-cards/streak-card'
import { LongestCard } from './wrapped-cards/longest-card'
import { VoiceCard } from './wrapped-cards/voice-card'
import { AlbumCard } from './wrapped-cards/album-card'
import { ShareCard } from './wrapped-cards/share-card'
import { RestCard } from './wrapped-cards/rest-card'

export type CardKey = 'intro'|'total'|'streak'|'longest'|'voice'|'album'|'share'|'rest'

const AUTO_MS = 4500

export function buildCardSequence(stats: WrappedStats): CardKey[] {
  if (stats.totalRuns === 0) return ['intro', 'rest', 'share']
  const seq: CardKey[] = ['intro', 'total']
  if (stats.totalRuns >= 3 && stats.maxStreak >= 2) seq.push('streak')
  if (stats.longestRun) seq.push('longest')
  if (stats.voicePool.length > 0) seq.push('voice')
  if (stats.albumPhotos.length > 0) seq.push('album')
  seq.push('share')
  return seq
}

type Props = {
  member: { id: string; name: string }
  year: number
  month: number
  stats: WrappedStats
  shareUrl: string
  allUrl: string
}

export function WrappedDeck({ member, year, month, stats, shareUrl, allUrl }: Props) {
  const cards = useMemo(() => buildCardSequence(stats), [stats])
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [bgmOn, setBgmOn] = useState(false)
  const reduced = useReducedMotion()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Session-stable voice quote (preserved across replay per Decision Log)
  const voiceQuote = useMemo(() => {
    if (stats.voicePool.length === 0) return null
    const pick = stats.voicePool[Math.floor(Math.random() * stats.voicePool.length)]
    return { run: pick, text: pick.thoughtAfter }
  }, [stats.voicePool])

  // Auto-advance (skip if reduced motion or paused)
  useEffect(() => {
    if (reduced || paused) return
    if (idx >= cards.length - 1) return
    const t = window.setTimeout(() => setIdx(i => i + 1), AUTO_MS)
    return () => window.clearTimeout(t)
  }, [idx, paused, reduced, cards.length])

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setIdx(i => Math.min(cards.length - 1, i + 1))
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(0, i - 1))
      if (e.key === ' ')          setPaused(p => !p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cards.length])

  // Tap / swipe
  const touchStart = useRef<{ x: number; t: number } | null>(null)
  function onTouchStart(e: TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, t: Date.now() }
    setPaused(true)
  }
  function onTouchEnd(e: TouchEvent) {
    const s = touchStart.current
    setPaused(false)
    if (!s) return
    const dx = e.changedTouches[0].clientX - s.x
    const dt = Date.now() - s.t
    if (dt > 500 && Math.abs(dx) < 10) return // long-press, no nav
    if (Math.abs(dx) > 40) {
      setIdx(i => (dx > 0 ? Math.max(0, i - 1) : Math.min(cards.length - 1, i + 1)))
    } else {
      // tap (split screen)
      const w = window.innerWidth
      const tapX = e.changedTouches[0].clientX
      if (tapX < w / 3) setIdx(i => Math.max(0, i - 1))
      else setIdx(i => Math.min(cards.length - 1, i + 1))
    }
  }

  // BGM
  useEffect(() => {
    if (!audioRef.current) return
    if (bgmOn) audioRef.current.play().catch(() => setBgmOn(false))
    else audioRef.current.pause()
  }, [bgmOn])

  const replay = useCallback(() => setIdx(0), [])

  const current = cards[idx]

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ position: 'relative' }}>
      <ProgressBars total={cards.length} current={idx} />
      <BgmToggle on={bgmOn} onToggle={() => setBgmOn(v => !v)} />
      <audio ref={audioRef} src="/audio/diary-ambient.mp3" loop preload="none" />

      {current === 'intro' && <IntroCard memberName={member.name} year={year} month={month} />}
      {current === 'total' && <TotalCard totalRuns={stats.totalRuns} totalMinutes={stats.totalMinutes} />}
      {current === 'streak' && <StreakCard maxStreak={stats.maxStreak} streakLastDows={stats.streakLastDows} />}
      {current === 'longest' && stats.longestRun && <LongestCard run={stats.longestRun} />}
      {current === 'voice' && voiceQuote && <VoiceCard quote={voiceQuote} />}
      {current === 'album' && <AlbumCard photos={stats.albumPhotos} overflow={stats.albumOverflowCount} />}
      {current === 'share' && (
        <ShareCard year={year} month={month} shareUrl={shareUrl} allUrl={allUrl} onReplay={replay} memberName={member.name} />
      )}
      {current === 'rest' && <RestCard year={year} month={month} />}
    </div>
  )
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return reduced
}

function ProgressBars({ total, current }: { total: number; current: number }) {
  return (
    <div role="progressbar" aria-valuenow={current + 1} aria-valuemax={total}
      style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top) + 10px)', left: 12, right: 12,
        display: 'flex', gap: 4, zIndex: 10 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i <= current ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.25)',
        }} />
      ))}
    </div>
  )
}

function BgmToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} aria-label="배경 음악"
      style={{
        position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom) + 12px)', left: 12,
        background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: 999,
        width: 44, height: 44, fontSize: '1rem', cursor: 'pointer', zIndex: 10,
      }}>
      {on ? '🔊' : '🔇'}
    </button>
  )
}
```

- [ ] **Step 3: Tests pass**

```bash
npx vitest run tests/unit/diary/
```

- [ ] **Step 4: Commit**

```bash
git add src/presentation/components/diary/wrapped-deck.tsx tests/unit/diary/wrapped-deck-cards.test.ts
git commit -m "feat(diary): add WrappedDeck client orchestrator (auto-advance, swipe, BGM)"
```

---

### Task 8: Wire deck into page + add ambient track placeholder

**Files:**
- Modify: `src/app/diary/[memberId]/[yearMonth]/page.tsx` (replace JSON dump with `<WrappedDeck>`)
- Create: `public/audio/diary-ambient.mp3` — Mixkit ambient loop (download specific CC track, place file; if track not yet chosen put a 1-second silent placeholder so audio element does not 404)
- Create: `src/app/diary/[memberId]/[yearMonth]/CREDITS.md` (one-line Mixkit attribution to surface in repo)

**Interfaces:**
- Consumes: Task 7's `<WrappedDeck>`
- Produces: live Wrapped sequence at `/diary/.../2026-06`

- [ ] **Step 1: Update page**

```tsx
// inside page.tsx, replace the <pre> block
import { headers } from 'next/headers'
import { WrappedDeck } from '@/presentation/components/diary/wrapped-deck'

// ... after `const stats = computeWrappedStats(runs)`
const h = await headers()
const host = h.get('host') ?? ''
const proto = h.get('x-forwarded-proto') ?? 'https'
const shareUrl = `${proto}://${host}/diary/${memberId}/${yearMonth}`
const allUrl = `${shareUrl}/all`

return (
  <WrappedDeck
    member={{ id: member.id, name: member.name }}
    year={parsed.year}
    month={parsed.month}
    stats={stats}
    shareUrl={shareUrl}
    allUrl={allUrl}
  />
)
```

- [ ] **Step 2: Add silent placeholder mp3 + credits**

```bash
# 1s silent mp3, ~2KB, replace with chosen Mixkit track before share
ffmpeg -f lavfi -i anullsrc=r=22050:cl=mono -t 1 -q:a 9 -acodec libmp3lame public/audio/diary-ambient.mp3
```

```md
<!-- src/app/diary/[memberId]/[yearMonth]/CREDITS.md -->
Background music: Mixkit (free with attribution) — TBD specific track before launch.
License: https://mixkit.co/license/
```

- [ ] **Step 3: Manual smoke**

```bash
npm run dev
# Visit /diary/<self>/2026-06 — verify deck auto-advances, swipe works, BGM toggles
# Visit empty month — verify 3-card rest variant
# Toggle prefers-reduced-motion in DevTools — verify no auto-advance
```

- [ ] **Step 4: Commit**

```bash
git add src/app/diary src/presentation/components/diary public/audio/diary-ambient.mp3
git commit -m "feat(diary): wire WrappedDeck into route + add Mixkit ambient placeholder"
```

---

## Phase 3 — Full diary `/all` page + dynamic OG image + revalidation

### Task 9: Full diary list component + `/all` page

**Files:**
- Create: `src/presentation/components/diary/full-diary-list.tsx`
- Create: `src/app/diary/[memberId]/[yearMonth]/all/page.tsx`

**Interfaces:**
- Consumes: same data fetch as Wrapped page
- Produces: vertical-scroll list of all runs in date-desc order with full thoughts (Before/During/After)

- [ ] **Step 1: Build list component**

```tsx
// src/presentation/components/diary/full-diary-list.tsx
import type { RunLog } from '@/domain/entities/run-log'
import Image from 'next/image'

const DOW = ['일','월','화','수','목','금','토']
function fmt(date: string) {
  const d = new Date(`${date}T00:00:00`)
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${DOW[d.getDay()]}`
}

export function FullDiaryList({ runs }: { runs: RunLog[] }) {
  return (
    <div style={{ padding: '20px 22px 60px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {runs.map(run => (
        <article key={run.id} style={{
          background: '#fff', borderRadius: 16, padding: '18px 18px 20px',
          fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
        }}>
          <div style={{ fontSize: '0.55rem', letterSpacing: '1.5px', color: '#888', marginBottom: 6 }}>
            {fmt(run.date)}
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, marginBottom: run.photoUrl ? 12 : 8 }}>
            {run.title}
          </h2>
          {run.photoUrl && (
            <div style={{ position: 'relative', aspectRatio: '4 / 5', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
              <Image src={run.photoUrl} alt={run.title} fill style={{ objectFit: 'cover' }} sizes="(max-width: 600px) 100vw, 400px" />
            </div>
          )}
          <ThoughtBlock label="Before" body={run.thoughtBefore} />
          <ThoughtBlock label="During" body={run.thoughtDuring} />
          <ThoughtBlock label="After"  body={run.thoughtAfter} />
          <div style={{ fontSize: '0.65rem', color: '#999', marginTop: 12 }}>
            {run.durationMin}분{run.location && ` · ${run.location}`}{run.runTime && ` · ${run.runTime}`}
          </div>
        </article>
      ))}
    </div>
  )
}

function ThoughtBlock({ label, body }: { label: string; body: string }) {
  if (!body.trim()) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: '0.55rem', letterSpacing: '1.5px', color: '#aaa', marginBottom: 2 }}>{label}</div>
      <p style={{ fontSize: '0.875rem', lineHeight: 1.55, color: '#222', margin: 0, whiteSpace: 'pre-wrap' }}>{body}</p>
    </div>
  )
}
```

- [ ] **Step 2: Build `/all` page**

```tsx
// src/app/diary/[memberId]/[yearMonth]/all/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/infrastructure/supabase/server-client'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { SupabaseMemberRepository } from '@/infrastructure/supabase/member-repository'
import { parseYearMonth, isValidMonth } from '@/domain/diary/month-range'
import { FullDiaryList } from '@/presentation/components/diary/full-diary-list'

export const revalidate = 3600

export default async function FullDiaryPage({
  params,
}: { params: Promise<{ memberId: string; yearMonth: string }> }) {
  const { memberId, yearMonth } = await params
  const parsed = parseYearMonth(yearMonth)
  if (!parsed || !isValidMonth(parsed.year, parsed.month)) notFound()

  const supabase = await createServerClient()
  const member = await new SupabaseMemberRepository(supabase).getById(memberId)
  if (!member) notFound()
  const runs = (await new SupabaseRunLogRepository(supabase)
    .getByMemberAndMonth(memberId, parsed.year, parsed.month))
    .reverse() // desc

  return (
    <main style={{ background: '#FAFAFA', minHeight: '100dvh' }}>
      <header style={{ padding: '32px 22px 8px', fontFamily: "'Pretendard Variable', Pretendard, sans-serif" }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
          {parsed.year}.{parsed.month} · {member.name}
        </h1>
        <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 4 }}>{runs.length} runs</div>
      </header>
      <FullDiaryList runs={runs} />
      <footer style={{ textAlign: 'center', padding: '0 22px 40px', fontSize: '0.7rem', color: '#aaa' }}>
        Daily Mindful Running · daily-running.app
        <div style={{ marginTop: 8 }}>
          <Link href={`/diary/${memberId}/${yearMonth}`} style={{ color: '#666' }}>← Wrapped로 돌아가기</Link>
        </div>
      </footer>
    </main>
  )
}
```

- [ ] **Step 3: Smoke test**

```bash
npm run dev
# Open /diary/<self>/2026-06/all — verify run list, thoughts, photos render
```

- [ ] **Step 4: Commit**

```bash
git add src/presentation/components/diary/full-diary-list.tsx src/app/diary/**/all
git commit -m "feat(diary): add full diary scroll page at /all"
```

---

### Task 10: Dynamic OG image route

**Files:**
- Create: `src/app/api/og/diary/[memberId]/[yearMonth]/route.tsx`
- Modify: `src/app/diary/[memberId]/[yearMonth]/page.tsx` (export `generateMetadata` that points `openGraph.images` to OG endpoint)

**Interfaces:**
- Produces: 1200×630 image via `next/og`. Background = first run's `photoUrl` (date-asc first) or fallback gradient. Caches 1h.

- [ ] **Step 1: Build OG route**

```tsx
// src/app/api/og/diary/[memberId]/[yearMonth]/route.tsx
import { ImageResponse } from 'next/og'
import { createServerClient } from '@/infrastructure/supabase/server-client'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { SupabaseMemberRepository } from '@/infrastructure/supabase/member-repository'
import { parseYearMonth, isValidMonth } from '@/domain/diary/month-range'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ memberId: string; yearMonth: string }> },
) {
  const { memberId, yearMonth } = await params
  const parsed = parseYearMonth(yearMonth)
  if (!parsed || !isValidMonth(parsed.year, parsed.month)) {
    return new Response('Not found', { status: 404 })
  }

  const supabase = await createServerClient()
  const member = await new SupabaseMemberRepository(supabase).getById(memberId)
  if (!member) return new Response('Not found', { status: 404 })
  const runs = await new SupabaseRunLogRepository(supabase)
    .getByMemberAndMonth(memberId, parsed.year, parsed.month)
  const firstPhoto = runs.find(r => r.photoUrl)?.photoUrl

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end', padding: 64, color: '#fff',
        background: firstPhoto
          ? `linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%), url(${firstPhoto}) center/cover`
          : 'linear-gradient(135deg,#FB7185,#7C3AED)',
        fontFamily: 'sans-serif',
      }}>
        <div style={{ fontSize: 28, opacity: 0.85, marginBottom: 8 }}>{member.name}</div>
        <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2 }}>
          {parsed.year}.{parsed.month} 일기
        </div>
      </div>
    ),
    {
      width: 1200, height: 630,
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
    },
  )
}
```

- [ ] **Step 2: Wire `generateMetadata` in Wrapped page**

```tsx
// in src/app/diary/[memberId]/[yearMonth]/page.tsx, add:
export async function generateMetadata(
  { params }: { params: Promise<{ memberId: string; yearMonth: string }> },
) {
  const { memberId, yearMonth } = await params
  const url = `/api/og/diary/${memberId}/${yearMonth}`
  return {
    title: `${yearMonth} 달리기 일기`,
    openGraph: { images: [{ url, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', images: [url] },
    robots: { index: false, follow: false },
  }
}
```

- [ ] **Step 3: Smoke**

```bash
# open http://localhost:3000/api/og/diary/<id>/2026-06 — expect PNG
# open Wrapped page → view-source → confirm <meta property="og:image"> points to OG route
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/og src/app/diary
git commit -m "feat(diary): dynamic OG image + share metadata"
```

---

### Task 11: Revalidate on record mutations

**Files:**
- Modify: `src/app/api/record/route.ts` (after `POST` success)
- Modify: `src/app/api/record/[id]/route.ts` (after `PATCH`/`DELETE` success)

**Interfaces:**
- Consumes: nothing new (uses Next's `revalidatePath`)
- Produces: stale diary cache invalidated when user adds/edits/deletes a run

- [ ] **Step 1: Hoist helper to `src/domain/diary/revalidate.ts`**

```ts
// src/domain/diary/revalidate.ts
import { revalidatePath } from 'next/cache'

/** Invalidate Wrapped + full-diary cache for the month containing `dateStr` (YYYY-MM-DD). */
export function revalidateDiaryMonth(memberId: string, dateStr: string): void {
  const [y, m] = dateStr.split('-')
  revalidatePath(`/diary/${memberId}/${y}-${m}`)
  revalidatePath(`/diary/${memberId}/${y}-${m}/all`)
}
```

- [ ] **Step 2: Wire call sites**

In `src/app/api/record/route.ts` POST: import and call `revalidateDiaryMonth(runLog.memberId, runLog.date)` after `useCase.execute(body)` succeeds.

In `src/app/api/record/[id]/route.ts` PATCH/DELETE: call with the affected `memberId` + `date`. For DELETE: fetch the run's `memberId`/`date` BEFORE the delete (use the existing fetch path, or run a select first).

- [ ] **Step 3: Manual verify**

```bash
# 1. open /diary/<self>/2026-06 — note totalRuns
# 2. POST a new run for today via the app
# 3. reload /diary/<self>/2026-06 — totalRuns increments without 1h wait
```

- [ ] **Step 4: Commit**

```bash
git add src/domain/diary/revalidate.ts src/app/api/record
git commit -m "feat(diary): revalidate diary cache after record mutations"
```

---

## Phase 4 — CalendarView share trigger

### Task 12: Add share icon to CalendarView month header

**Files:**
- Modify: `src/presentation/components/my-records/calendar-view.tsx:63-85` (month-nav block)

**Interfaces:**
- Consumes: existing `viewYear`, `viewMonth`, current-user memberId from props or context
- Produces: tap on share icon → Web Share API or clipboard fallback (reuse `ShareButton` logic; inline a small icon-only variant)

- [ ] **Step 1: Extend `Props` to receive memberId**

```ts
type Props = { runs: RunLog[]; memberId: string }
```

Update the call site (likely `src/app/my-records/page.tsx` or similar — find via `search_graph(name_pattern="CalendarView")`).

- [ ] **Step 2: Add share button between month label and `›`**

```tsx
import { ShareButton } from '@/presentation/components/diary/share-button'

// inside the month-nav block (after the year/month label div)
<ShareButton
  url={`${typeof window !== 'undefined' ? window.location.origin : ''}/diary/${memberId}/${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`}
  title={`${viewYear}.${viewMonth + 1} 달리기 일기`}
  text={`${viewYear}.${viewMonth + 1} 한 달 기록을 봐줘`}
>
  <span aria-label="이 달 일기 공유" style={{ fontSize: '1.1rem' }}>↗</span>
</ShareButton>
```

Adjust container layout: month nav already uses flex with space-between; wrap year/label + icon in a single flex group, keep `‹` left and `›` right.

- [ ] **Step 3: Manual smoke on mobile**

```bash
npm run dev
# open in mobile browser, tap share icon — verify native sheet opens with URL
# desktop: tap → expect "링크 복사됨" toast
```

- [ ] **Step 4: Commit**

```bash
git add src/presentation/components/my-records/calendar-view.tsx src/app/my-records
git commit -m "feat(diary): share icon on CalendarView month header"
```

---

## Phase 5 — Verification + ship gate

### Task 13: Full verification

- [ ] **Step 1: Lint + typecheck + tests**

```bash
npm run lint
npx tsc --noEmit
npx vitest run
```
All must pass.

- [ ] **Step 2: Manual QA on real device**

- Visit `/diary/<self>/2026-06` on iPhone Safari — verify safe-area, gestures, BGM toggle.
- Tap share icon in CalendarView — verify native sheet.
- Visit an empty month — verify 3-card rest variant.
- Visit a future month — verify 404.
- Tap `/all` link — verify full scroll page.
- Add a run via the app, return to Wrapped page → verify counter incremented (revalidate worked).
- Toggle iOS "Reduce Motion" → verify no auto-advance.
- Visit `/api/og/diary/<self>/2026-06` — verify PNG.

- [ ] **Step 3: Replace placeholder mp3 with chosen Mixkit track (before sharing publicly)**

Pick from https://mixkit.co/free-stock-music/ ambient ≤30s loop ≤100KB. Update `CREDITS.md` with exact track name + URL.

- [ ] **Step 4: Final commit + PR**

```bash
git add public/audio src/app/diary
git commit -m "feat(diary): swap ambient placeholder for Mixkit track"
# create PR via existing /ship workflow
```

---

## Out of Scope (deferred — captured per spec §16)

- Yearly diary (12-month roundup)
- Jump to next/prev member
- Private toggle (currently always public)
- Comments / likes on diary itself
- Print / PDF export
- User-selectable BGM track
