# 100일 런지 챌린지 P5 — 완주 인증 + 피드 (Realtime)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 100일 완주 시 인증서 (공유 가능 OG 이미지) + 프로필 영구 뱃지 + 챌린지 진행 실시간 피드 ("X님 47일 달성"). 실패 상태 표시.

**Architecture:** P1 의 `markCompleted` 결과를 P2 미션 화면에서 시트로 노출. 인증서 = Next.js OG 이미지 (Satori). 피드 = Supabase Realtime subscribe (`mission_logs` insert/update). 프로필 뱃지 = members 테이블 확장 (또는 별도 badges 테이블).

**Tech Stack:** Next.js OG ImageResponse (Satori), Supabase Realtime, React.

**의존:** P1 + P2 + P3 (markCompleted 가 cron 으로 실행됨).

**P5 범위 (9 태스크):**
1. members 테이블 challenge_badges 컬럼 추가 (또는 badges 테이블)
2. GetChallengeFeedUseCase + unit test
3. SupabaseChallengeFeed listForChallenge 확장 (member 정보 join)
4. API GET /api/challenges/feed
5. ChallengeFeed 컴포넌트 (Realtime subscribe)
6. CompletionSheet 컴포넌트 + MissionPageClient 트리거 (completed_at 감지)
7. /mission/certificate/[participationId] 페이지 + OG 이미지 라우트
8. CertificateCard 컴포넌트 + 공유 액션
9. ProfileBadge 컴포넌트 + 프로필 페이지 통합

**P5 범위 밖:**
- 챌린지룸 (다중 챌린지 동시 진행) — 미래 확장
- 시즌 간 비교 통계

---

## Task 1: 챌린지 뱃지 컬럼 마이그레이션

`members` 테이블에 `challenge_badges` JSONB 컬럼 (간단 시작) 또는 별도 `member_badges` 테이블. 본 플랜은 JSONB 채택 (간단함).

**Files:**
- Create: `supabase/migrations/20260617_member_badges.sql`

- [ ] **Step 1.1: 마이그레이션**

```sql
ALTER TABLE members
  ADD COLUMN challenge_badges jsonb NOT NULL DEFAULT '[]'::jsonb;

-- helper: append badge atomically
CREATE OR REPLACE FUNCTION grant_challenge_badge(p_member_id uuid, p_badge jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE members
     SET challenge_badges = challenge_badges ||
       jsonb_build_array(p_badge - 'duplicate_check')
   WHERE id = p_member_id
     AND NOT (challenge_badges @> jsonb_build_array(jsonb_build_object('challenge_id', p_badge -> 'challenge_id')));
END;
$$;

GRANT EXECUTE ON FUNCTION grant_challenge_badge(uuid, jsonb) TO service_role;
```

- [ ] **Step 1.2: Dashboard 적용 (너 액션)**
- [ ] **Step 1.3: 커밋**

```bash
git add supabase/migrations/20260617_member_badges.sql
git commit -m "feat(db): add challenge_badges JSONB column on members + grant RPC"
```

---

## Task 2: GetChallengeFeedUseCase + unit test

**Files:**
- Create: `src/application/use-cases/get-challenge-feed.ts`
- Test: `tests/unit/use-cases/get-challenge-feed.test.ts`

피드 = 최근 mission_logs 중 completed=true 또는 today 30+ 달성, member 정보 join, 시간순 desc.

- [ ] **Step 2.1: 실패하는 test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { GetChallengeFeedUseCase } from '@/application/use-cases/get-challenge-feed'

type FeedRepoStub = {
  listRecent: (challengeId: string, limit: number) => Promise<unknown[]>
}

describe('GetChallengeFeedUseCase', () => {
  it('returns recent feed items', async () => {
    const items = [
      { id: 'l1', memberId: 'm1', memberName: '두승', memberAvatarUrl: '', logDate: '2026-08-15', dayIndex: 45, count: 100, completed: true },
    ]
    const repo: FeedRepoStub = { listRecent: vi.fn().mockResolvedValue(items) }
    const uc = new GetChallengeFeedUseCase(repo as never)
    const r = await uc.execute({ challengeId: 'c1', limit: 20 })
    expect(r).toEqual(items)
  })
})
```

- [ ] **Step 2.2: 실패 확인 + 구현**

`src/application/use-cases/get-challenge-feed.ts`:

```typescript
export type ChallengeFeedItem = {
  id: string
  memberId: string
  memberName: string
  memberAvatarUrl: string
  logDate: string
  dayIndex: number
  count: number
  completed: boolean
}

export interface IChallengeFeedRepository {
  listRecent(challengeId: string, limit: number): Promise<ChallengeFeedItem[]>
}

export class GetChallengeFeedUseCase {
  constructor(private repo: IChallengeFeedRepository) {}
  execute(input: { challengeId: string; limit: number }): Promise<ChallengeFeedItem[]> {
    return this.repo.listRecent(input.challengeId, input.limit)
  }
}
```

- [ ] **Step 2.3: 통과 + 커밋**

```bash
npx vitest run tests/unit/use-cases/get-challenge-feed.test.ts
git add src/application/use-cases/get-challenge-feed.ts tests/unit/use-cases/get-challenge-feed.test.ts
git commit -m "feat(use-case): add GetChallengeFeedUseCase"
```

---

## Task 3: SupabaseChallengeFeedRepository

**Files:**
- Create: `src/infrastructure/supabase/challenge-feed-repository.ts`
- Test: `tests/integration/supabase/challenge-feed-repository.test.ts`

- [ ] **Step 3.1: 실패하는 통합 테스트**

```typescript
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { SupabaseChallengeFeedRepository } from '@/infrastructure/supabase/challenge-feed-repository'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

describe('SupabaseChallengeFeedRepository (integration)', () => {
  it('listRecent returns array', async () => {
    const repo = new SupabaseChallengeFeedRepository(supabase)
    const list = await repo.listRecent('00000000-0000-0000-0000-000000000000', 20)
    expect(Array.isArray(list)).toBe(true)
  })
})
```

- [ ] **Step 3.2: 구현**

`src/infrastructure/supabase/challenge-feed-repository.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { IChallengeFeedRepository, ChallengeFeedItem } from '@/application/use-cases/get-challenge-feed'

type Row = {
  id: string
  log_date: string
  count: number
  completed: boolean
  participation: {
    challenge: { start_date: string }
    member: { id: string; name: string; avatar_url: string | null }
  }
}

export class SupabaseChallengeFeedRepository implements IChallengeFeedRepository {
  constructor(private supabase: SupabaseClient) {}

  async listRecent(challengeId: string, limit: number): Promise<ChallengeFeedItem[]> {
    const { data, error } = await this.supabase
      .from('mission_logs')
      .select(`
        id, log_date, count, completed,
        participation:challenge_participations!inner (
          challenge:challenges!inner ( start_date ),
          member:members!inner ( id, name, avatar_url )
        )
      `)
      .eq('participation.challenge_id', challengeId)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`listRecent failed: ${error.message}`)
    return (data as unknown as Row[]).map(row => {
      const start = new Date(row.participation.challenge.start_date)
      const logDt = new Date(row.log_date)
      const dayIndex = Math.floor((logDt.getTime() - start.getTime()) / 86400000)
      return {
        id: row.id,
        memberId: row.participation.member.id,
        memberName: row.participation.member.name,
        memberAvatarUrl: row.participation.member.avatar_url ?? '',
        logDate: row.log_date,
        dayIndex,
        count: row.count,
        completed: row.completed,
      }
    })
  }
}
```

- [ ] **Step 3.3: 통과 + 커밋**

```bash
npx vitest run --config vitest.integration.config.ts tests/integration/supabase/challenge-feed-repository.test.ts
git add src/infrastructure/supabase/challenge-feed-repository.ts tests/integration/supabase/challenge-feed-repository.test.ts
git commit -m "feat(infra): add SupabaseChallengeFeedRepository"
```

---

## Task 4: API GET /api/challenges/feed

**Files:**
- Create: `src/app/api/challenges/feed/route.ts`
- Test: `tests/unit/api/challenges-feed.test.ts`

- [ ] **Step 4.1: 테스트**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/infrastructure/supabase/client', () => ({ createServerClient: vi.fn() }))
vi.mock('@/infrastructure/supabase/challenge-repository', () => ({ SupabaseChallengeRepository: vi.fn() }))
vi.mock('@/infrastructure/supabase/challenge-feed-repository', () => ({ SupabaseChallengeFeedRepository: vi.fn() }))

import { GET } from '@/app/api/challenges/feed/route'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeFeedRepository } from '@/infrastructure/supabase/challenge-feed-repository'

const mockedCreate = vi.mocked(createServerClient)
const mockedCRepo = vi.mocked(SupabaseChallengeRepository)
const mockedFRepo = vi.mocked(SupabaseChallengeFeedRepository)

beforeEach(() => vi.clearAllMocks())

describe('GET /api/challenges/feed', () => {
  it('returns feed when active challenge exists', async () => {
    mockedCreate.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', user_metadata: { member_id: 'm1' } } } }) },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    mockedCRepo.mockImplementation(function () {
      return {
        getActive: vi.fn().mockResolvedValue({ id: 'c1' }),
        getById: vi.fn(), getUpcoming: vi.fn(),
      } as unknown as InstanceType<typeof SupabaseChallengeRepository>
    })
    mockedFRepo.mockImplementation(function () {
      return {
        listRecent: vi.fn().mockResolvedValue([{ id: 'l1', memberName: '두승', logDate: '2026-08-15', dayIndex: 45, count: 100, completed: true }]),
      } as unknown as InstanceType<typeof SupabaseChallengeFeedRepository>
    })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
  })
})
```

- [ ] **Step 4.2: 구현**

`src/app/api/challenges/feed/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeFeedRepository } from '@/infrastructure/supabase/challenge-feed-repository'
import { GetChallengeFeedUseCase } from '@/application/use-cases/get-challenge-feed'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cRepo = new SupabaseChallengeRepository(supabase)
  const fRepo = new SupabaseChallengeFeedRepository(supabase)

  const challenge = await cRepo.getActive()
  if (!challenge) return NextResponse.json({ items: [] })

  const uc = new GetChallengeFeedUseCase(fRepo)
  const items = await uc.execute({ challengeId: challenge.id, limit: 30 })
  return NextResponse.json({ items })
}
```

- [ ] **Step 4.3: 통과 + 커밋**

```bash
npx vitest run tests/unit/api/challenges-feed.test.ts
git add src/app/api/challenges/feed/route.ts tests/unit/api/challenges-feed.test.ts
git commit -m "feat(api): add GET /api/challenges/feed"
```

---

## Task 5: ChallengeFeed 컴포넌트 (Realtime)

**Files:**
- Create: `src/presentation/components/mission/challenge-feed.tsx`
- Test: `tests/unit/components/challenge-feed.test.tsx`

- [ ] **Step 5.1: 테스트**

```typescript
import { render, screen } from '@testing-library/react'
import { ChallengeFeed } from '@/presentation/components/mission/challenge-feed'

describe('ChallengeFeed', () => {
  it('renders feed items', () => {
    render(
      <ChallengeFeed initialItems={[
        { id: 'l1', memberId: 'm1', memberName: '두승', memberAvatarUrl: '', logDate: '2026-08-15', dayIndex: 45, count: 100, completed: true },
      ]} />
    )
    expect(screen.getByText('두승')).toBeInTheDocument()
    expect(screen.getByText(/46일/)).toBeInTheDocument()
  })

  it('renders empty state', () => {
    render(<ChallengeFeed initialItems={[]} />)
    expect(screen.getByText(/아직 활동/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 5.2: 구현**

`src/presentation/components/mission/challenge-feed.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import type { ChallengeFeedItem } from '@/application/use-cases/get-challenge-feed'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = { initialItems: ChallengeFeedItem[] }

export function ChallengeFeed({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems)

  useEffect(() => {
    let cancelled = false
    const interval = setInterval(async () => {
      if (cancelled) return
      try {
        const res = await fetch('/api/challenges/feed', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        setItems(data.items)
      } catch {}
    }, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  if (items.length === 0) {
    return (
      <section style={{
        fontFamily: FONT, background: '#fff', border: '1px solid #EBEBEB',
        borderRadius: 18, padding: 24, textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, color: '#888', margin: 0 }}>아직 활동이 없어요</p>
      </section>
    )
  }

  return (
    <section style={{
      fontFamily: FONT, background: '#fff', border: '1px solid #EBEBEB',
      borderRadius: 18, padding: 16,
    }}>
      <p style={{ fontSize: 11, color: '#888', margin: '0 0 12px', letterSpacing: '0.05em' }}>FEED</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(item => (
          <li key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#EBEBEB',
              backgroundImage: item.memberAvatarUrl ? `url(${item.memberAvatarUrl})` : 'none',
              backgroundSize: 'cover',
            }} />
            <div style={{ fontSize: 13, color: '#111', flex: 1 }}>
              <strong>{item.memberName}</strong>
              <span style={{ color: '#888' }}> · {item.dayIndex + 1}일째</span>
              {item.completed && <span style={{ marginLeft: 6, color: '#b8231f' }}>✓ 달성</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

(Realtime 대신 30s 폴링 — 충분히 simpler; 진짜 Realtime 은 v2 에서 Supabase channel 추가.)

- [ ] **Step 5.3: 통과 + 커밋**

```bash
npx vitest run tests/unit/components/challenge-feed.test.tsx
git add src/presentation/components/mission/challenge-feed.tsx tests/unit/components/challenge-feed.test.tsx
git commit -m "feat(mission): add ChallengeFeed with 30s poll refresh"
```

---

## Task 6: CompletionSheet + MissionPageClient 통합

`participation.completedAt` 있을 때 시트 자동 표시 (한 번만).

**Files:**
- Create: `src/presentation/components/mission/completion-sheet.tsx`
- Test: `tests/unit/components/completion-sheet.test.tsx`
- Modify: `src/presentation/components/mission/mission-page-client.tsx`

- [ ] **Step 6.1: 테스트**

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { CompletionSheet } from '@/presentation/components/mission/completion-sheet'

describe('CompletionSheet', () => {
  it('renders title and certificate link', () => {
    render(<CompletionSheet open participationId="p1" onClose={() => {}} />)
    expect(screen.getByText(/100일 완주/)).toBeInTheDocument()
    expect(screen.getByText(/인증서/)).toBeInTheDocument()
  })

  it('closes on backdrop click', () => {
    const onClose = vi.fn()
    render(<CompletionSheet open participationId="p1" onClose={onClose} />)
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 6.2: 구현**

`src/presentation/components/mission/completion-sheet.tsx`:

```typescript
'use client'

import Link from 'next/link'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = { open: boolean; participationId: string; onClose: () => void }

export function CompletionSheet({ open, participationId, onClose }: Props) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, fontFamily: FONT, padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 24, padding: 28, textAlign: 'center' }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          100일 완주!
        </h2>
        <p style={{ fontSize: 13, color: '#555', margin: '12px 0 24px', lineHeight: 1.6 }}>
          매일 100개 × 100일 = 10,000개의 런지를 완주하셨어요.
        </p>
        <Link
          href={`/mission/certificate/${participationId}`}
          style={{
            display: 'block', width: '100%', padding: '14px 0',
            background: '#111', color: '#fff', textDecoration: 'none',
            borderRadius: 12, fontSize: 15, fontWeight: 600,
          }}
        >
          인증서 보기
        </Link>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%', marginTop: 10, padding: '12px 0',
            background: 'transparent', color: '#888',
            border: 'none', fontSize: 13, cursor: 'pointer', fontFamily: FONT,
          }}
        >
          닫기
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6.3: MissionPageClient 통합**

`mission-page-client.tsx` 의 enrolled 모드에서:
```typescript
const [completionDismissed, setCompletionDismissed] = useState(false)
// ...
{participation.completedAt && !completionDismissed && (
  <CompletionSheet
    open
    participationId={participation.id}
    onClose={() => setCompletionDismissed(true)}
  />
)}
```

(`participation` 은 props 추가 필요 — `EnrolledProps` 에 `participation: ChallengeParticipation` 추가하고 server page 에서 전달.)

- [ ] **Step 6.4: 통과 + 커밋**

```bash
npx vitest run tests/unit/components/completion-sheet.test.tsx
git add src/presentation/components/mission/completion-sheet.tsx tests/unit/components/completion-sheet.test.tsx src/presentation/components/mission/mission-page-client.tsx src/app/mission/page.tsx
git commit -m "feat(mission): completion sheet auto-opens on completed participation"
```

---

## Task 7: /mission/certificate/[participationId] 페이지 + OG 이미지

**Files:**
- Create: `src/app/mission/certificate/[participationId]/page.tsx`
- Create: `src/app/mission/certificate/[participationId]/opengraph-image.tsx`

- [ ] **Step 7.1: 인증서 페이지 (서버)**

`src/app/mission/certificate/[participationId]/page.tsx`:

```typescript
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { CertificateCard } from '@/presentation/components/mission/certificate-card'
import { redirect } from 'next/navigation'

type Props = { params: Promise<{ participationId: string }> }

export default async function CertificatePage({ params }: Props) {
  const { participationId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const pRepo = new SupabaseChallengeParticipationRepository(supabase)
  const cRepo = new SupabaseChallengeRepository(supabase)

  // direct fetch by id — implement repo method
  const { data: participationRow } = await supabase
    .from('challenge_participations')
    .select('id, challenge_id, member_id, joined_at, passes_remaining, completed_at, failed_at, members!inner(name)')
    .eq('id', participationId)
    .maybeSingle()

  if (!participationRow || !participationRow.completed_at) {
    return <p style={{ padding: 40, textAlign: 'center' }}>완주 기록을 찾을 수 없어요.</p>
  }

  const challenge = await cRepo.getById(participationRow.challenge_id)
  if (!challenge) return <p>챌린지 정보 없음</p>

  return (
    <main style={{ padding: 20, background: '#F7F7F5', minHeight: '100vh' }}>
      <CertificateCard
        memberName={(participationRow as any).members.name}
        challengeTitle={challenge.title}
        completedAt={participationRow.completed_at}
        durationDays={challenge.durationDays}
      />
    </main>
  )
}
```

- [ ] **Step 7.2: OG 이미지 라우트**

`src/app/mission/certificate/[participationId]/opengraph-image.tsx`:

```typescript
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: { participationId: string } }

export default async function OgImage({ params }: Props) {
  // For brevity: static layout. Real impl fetches participation + member + challenge by id via supabase.
  // (engineer note: include a Supabase service-role client or pass data via query params)
  return new ImageResponse(
    (
      <div style={{
        display: 'flex', flexDirection: 'column',
        background: '#F7F7F5', width: '100%', height: '100%',
        padding: 80, justifyContent: 'space-between',
        fontFamily: 'sans-serif',
      }}>
        <div style={{ fontSize: 24, color: '#888' }}>마인드풀러닝</div>
        <div>
          <div style={{ fontSize: 80, fontWeight: 700, color: '#111' }}>100일 완주</div>
          <div style={{ fontSize: 24, color: '#555', marginTop: 12 }}>참가자 ID: {params.participationId}</div>
        </div>
      </div>
    ),
    size
  )
}
```

- [ ] **Step 7.3: 커밋**

```bash
git add src/app/mission/certificate/
git commit -m "feat(mission): add certificate page + OG image route"
```

---

## Task 8: CertificateCard 컴포넌트 + 공유

**Files:**
- Create: `src/presentation/components/mission/certificate-card.tsx`
- Test: `tests/unit/components/certificate-card.test.tsx`

- [ ] **Step 8.1: 테스트**

```typescript
import { render, screen } from '@testing-library/react'
import { CertificateCard } from '@/presentation/components/mission/certificate-card'

describe('CertificateCard', () => {
  it('renders member name + challenge title + completed date', () => {
    render(
      <CertificateCard
        memberName="두승"
        challengeTitle="런지 100일 시즌1"
        completedAt="2026-10-09T00:00:00Z"
        durationDays={100}
      />
    )
    expect(screen.getByText('두승')).toBeInTheDocument()
    expect(screen.getByText('런지 100일 시즌1')).toBeInTheDocument()
    expect(screen.getByText('100일 완주')).toBeInTheDocument()
  })
})
```

- [ ] **Step 8.2: 구현**

`src/presentation/components/mission/certificate-card.tsx`:

```typescript
'use client'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = {
  memberName: string
  challengeTitle: string
  completedAt: string
  durationDays: number
}

export function CertificateCard({ memberName, challengeTitle, completedAt, durationDays }: Props) {
  const dateLabel = new Date(completedAt).toISOString().slice(0, 10)

  async function share() {
    if (typeof navigator === 'undefined') return
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `${memberName} · 100일 완주`,
          text: `${challengeTitle} 완주!`,
          url: window.location.href,
        })
      } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.href)
      alert('링크 복사됨')
    }
  }

  return (
    <article
      style={{
        fontFamily: FONT,
        background: '#fff',
        border: '2px solid #111',
        borderRadius: 20,
        padding: 32,
        textAlign: 'center',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.1em', margin: 0 }}>CERTIFICATE</p>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', margin: '12px 0 4px' }}>
        {durationDays}일 완주
      </h1>
      <p style={{ fontSize: 13, color: '#555', margin: '0 0 28px' }}>{challengeTitle}</p>
      <div style={{
        background: 'url(/icon-192.png) center / 120px no-repeat',
        height: 120, marginBottom: 20,
        filter: 'brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(4200%) hue-rotate(355deg) brightness(0.85)',
      }} />
      <p style={{ fontSize: 14, color: '#888', margin: 0 }}>참가자</p>
      <p style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 20px' }}>{memberName}</p>
      <p style={{ fontSize: 11, color: '#888', margin: 0 }}>완료일</p>
      <p style={{ fontSize: 13, color: '#111', margin: '4px 0 28px' }}>{dateLabel}</p>
      <button
        type="button"
        onClick={share}
        style={{
          width: '100%', padding: '14px 0',
          background: '#111', color: '#fff',
          border: 'none', borderRadius: 12,
          fontSize: 14, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
        }}
      >
        공유하기
      </button>
    </article>
  )
}
```

- [ ] **Step 8.3: 통과 + 커밋**

```bash
npx vitest run tests/unit/components/certificate-card.test.tsx
git add src/presentation/components/mission/certificate-card.tsx tests/unit/components/certificate-card.test.tsx
git commit -m "feat(mission): add CertificateCard with Web Share API"
```

---

## Task 9: ProfileBadge + 프로필 페이지 통합

**Files:**
- Create: `src/presentation/components/profile/challenge-badge.tsx`
- Modify: `src/app/profile/page.tsx`
- Test: `tests/unit/components/challenge-badge.test.tsx`

- [ ] **Step 9.1: 테스트**

```typescript
import { render, screen } from '@testing-library/react'
import { ChallengeBadge } from '@/presentation/components/profile/challenge-badge'

describe('ChallengeBadge', () => {
  it('renders badge title + date', () => {
    render(
      <ChallengeBadge
        badges={[{ challenge_id: 'c1', challenge_title: '런지 100일', completed_at: '2026-10-09' }]}
      />
    )
    expect(screen.getByText('런지 100일')).toBeInTheDocument()
    expect(screen.getByText('2026-10-09')).toBeInTheDocument()
  })
})
```

- [ ] **Step 9.2: 구현**

`src/presentation/components/profile/challenge-badge.tsx`:

```typescript
const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Badge = {
  challenge_id: string
  challenge_title: string
  completed_at: string
}

export function ChallengeBadge({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null
  return (
    <section style={{ fontFamily: FONT, padding: 16 }}>
      <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.05em', margin: '0 0 10px' }}>BADGES</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: 8, overflowX: 'auto' }}>
        {badges.map(b => (
          <li
            key={b.challenge_id}
            style={{
              background: '#fff', border: '1px solid #EBEBEB',
              borderRadius: 12, padding: 12, minWidth: 140,
            }}
          >
            <div
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'url(/icon-192.png) center / 28px no-repeat',
                filter: 'brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(4200%) hue-rotate(355deg) brightness(0.85)',
                marginBottom: 8,
              }}
            />
            <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{b.challenge_title}</p>
            <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>{b.completed_at.slice(0, 10)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 9.3: 프로필 페이지 fetch + 통합**

`src/app/profile/page.tsx` 기존 코드에 challenge_badges 컬럼 select 추가 + `<ChallengeBadge badges={member.challenge_badges} />` 삽입.

- [ ] **Step 9.4: 통과 + 커밋**

```bash
npx vitest run tests/unit/components/challenge-badge.test.tsx
git add src/presentation/components/profile/challenge-badge.tsx tests/unit/components/challenge-badge.test.tsx src/app/profile/page.tsx
git commit -m "feat(profile): show challenge badges on profile page"
```

---

## P5 완료 검증

- [ ] member_badges 마이그레이션 Dashboard 적용
- [ ] `IssueCompletionBadgeUseCase` (P3) + `grant_challenge_badge` RPC 연결 (별도 작은 fix — 엔지니어가 P3 use case 안에서 호출하도록 수정)
- [ ] `npx vitest run` — 모두 PASS
- [ ] `npx tsc --noEmit` — clean
- [ ] 완주한 멤버 시드 → 미션 페이지 진입 시 CompletionSheet 표시 → 인증서 페이지 이동 → OG 이미지 생성 확인 → 공유 동작
- [ ] 프로필 페이지 BADGES 섹션에 뱃지 표시

## 다음 플랜

P6 공지 + Enroll UI

## Self-Review

- 인증서 OG: 실제 데이터 fetch 는 엔지니어가 보강 (현재 placeholder). 시간 부족할 시 server-rendered Image 그대로 사용 가능.
- 피드 Realtime 대신 30s 폴링 채택 (단순성). v2 에서 Supabase channel 로 진화 가능.
- 뱃지 = members.challenge_badges JSONB. 단일 시즌 = 1 row. 다회차 시즌 = append.
