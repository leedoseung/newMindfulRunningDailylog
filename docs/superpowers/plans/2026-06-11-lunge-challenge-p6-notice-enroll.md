# 100일 런지 챌린지 P6 — 공지 + Enroll UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 상단에 신규 시즌 공지 배너 + 클릭 시 미션 페이지 / 참가 신청 deep link. 챌린지 생성 시 inapp 알림 자동 발송. P2~P5 화면을 자연스럽게 연결.

**Architecture:** 홈 페이지에 신규 클라이언트 컴포넌트 `ChallengeAnnouncementBanner` 추가. 활성/예정 챌린지 존재 시 표시. 클릭 → /mission. 챌린지 생성 시 notifications 테이블에 row insert (별도 admin trigger 또는 manual).

**Tech Stack:** Next.js, React, Supabase.

**의존:** P1 (challenges 테이블), P2 (미션 페이지).

**P6 범위 (6 태스크):**
1. ChallengeAnnouncementBanner 컴포넌트 + unit test
2. 홈 페이지에 배너 통합 (server fetch + client 렌더)
3. 신규 챌린지 생성 시 모든 멤버에게 notifications insert RPC
4. NotificationBell 배너 항목 표시 (기존 notifications 활용)
5. 시작 D-day 카운트다운 표시
6. E2E 공지 → 참가 흐름

**P6 범위 밖:**
- 관리자 챌린지 생성 UI (별도 admin 패널)
- 챌린지 종료 후 회고 (별도 R)

---

## Task 1: ChallengeAnnouncementBanner 컴포넌트

**Files:**
- Create: `src/presentation/components/home/challenge-announcement-banner.tsx`
- Test: `tests/unit/components/challenge-announcement-banner.test.tsx`

- [ ] **Step 1.1: 실패하는 테스트**

```typescript
import { render, screen } from '@testing-library/react'
import { ChallengeAnnouncementBanner } from '@/presentation/components/home/challenge-announcement-banner'

describe('ChallengeAnnouncementBanner', () => {
  it('renders upcoming challenge with D-day', () => {
    render(
      <ChallengeAnnouncementBanner
        challenge={{
          id: 'c1', title: '런지 100일 시즌1',
          description: '매일 100개',
          startDate: '2026-07-01',
          registrationDeadline: '2026-07-04',
        }}
        today="2026-06-25"
        enrolled={false}
      />
    )
    expect(screen.getByText(/런지 100일 시즌1/)).toBeInTheDocument()
    expect(screen.getByText(/D-6/)).toBeInTheDocument()
    expect(screen.getByText(/참가 신청/)).toBeInTheDocument()
  })

  it('renders enrolled state', () => {
    render(
      <ChallengeAnnouncementBanner
        challenge={{
          id: 'c1', title: '런지 100일 시즌1',
          description: '', startDate: '2026-07-01', registrationDeadline: '2026-07-04',
        }}
        today="2026-06-25"
        enrolled
      />
    )
    expect(screen.getByText(/참가 중/)).toBeInTheDocument()
  })

  it('renders nothing when challenge is null', () => {
    const { container } = render(
      <ChallengeAnnouncementBanner challenge={null} today="2026-06-25" enrolled={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders D-day 0 when today == startDate', () => {
    render(
      <ChallengeAnnouncementBanner
        challenge={{
          id: 'c1', title: '시즌1', description: '',
          startDate: '2026-07-01', registrationDeadline: '2026-07-04',
        }}
        today="2026-07-01"
        enrolled={false}
      />
    )
    expect(screen.getByText(/D-0|오늘 시작/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 1.2: 실패 확인**

```bash
npx vitest run tests/unit/components/challenge-announcement-banner.test.tsx
```

- [ ] **Step 1.3: 구현**

`src/presentation/components/home/challenge-announcement-banner.tsx`:

```typescript
'use client'

import Link from 'next/link'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type SimpleChallenge = {
  id: string
  title: string
  description: string
  startDate: string
  registrationDeadline: string
}

type Props = {
  challenge: SimpleChallenge | null
  today: string  // 'YYYY-MM-DD' KST
  enrolled: boolean
}

function diffDays(today: string, target: string): number {
  const t = Date.UTC(...today.split('-').map(Number) as [number, number, number])
  const d = Date.UTC(...target.split('-').map(Number) as [number, number, number])
  return Math.round((d - t) / 86400000)
}

export function ChallengeAnnouncementBanner({ challenge, today, enrolled }: Props) {
  if (!challenge) return null

  const dDay = diffDays(today, challenge.startDate)
  const dayLabel = dDay > 0 ? `D-${dDay}` : dDay === 0 ? '오늘 시작' : `${-dDay}일째`

  return (
    <Link
      href="/mission"
      style={{
        display: 'block',
        textDecoration: 'none',
        background: '#111',
        color: '#fff',
        borderRadius: 18,
        padding: 18,
        fontFamily: FONT,
      }}
    >
      <p style={{ fontSize: 10, letterSpacing: '0.1em', margin: 0, opacity: 0.7 }}>NEW SEASON</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          {challenge.title}
        </h2>
        <span style={{
          fontSize: 12, fontWeight: 600,
          background: '#b8231f', padding: '4px 10px', borderRadius: 999,
        }}>
          {dayLabel}
        </span>
      </div>
      {challenge.description && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '6px 0 0' }}>
          {challenge.description}
        </p>
      )}
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', margin: '12px 0 0', fontWeight: 600 }}>
        {enrolled ? '참가 중 ✓' : '참가 신청 →'}
      </p>
    </Link>
  )
}
```

- [ ] **Step 1.4: 통과 + 커밋**

```bash
npx vitest run tests/unit/components/challenge-announcement-banner.test.tsx
git add src/presentation/components/home/challenge-announcement-banner.tsx tests/unit/components/challenge-announcement-banner.test.tsx
git commit -m "feat(home): add ChallengeAnnouncementBanner"
```

---

## Task 2: 홈 페이지에 배너 통합 (server fetch)

**Files:**
- Modify: `src/app/home/page.tsx`

- [ ] **Step 2.1: server 통합**

`src/app/home/page.tsx` 상단에 server-side fetch 추가:

```typescript
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { ChallengeAnnouncementBanner } from '@/presentation/components/home/challenge-announcement-banner'

// inside the existing home page:
const cRepo = new SupabaseChallengeRepository(supabase)
const pRepo = new SupabaseChallengeParticipationRepository(supabase)

const active = await cRepo.getActive()
let bannerChallenge: { id: string; title: string; description: string; startDate: string; registrationDeadline: string } | null = null
let enrolled = false
let shouldBanner = false

const today = (() => {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
})()

if (active) {
  bannerChallenge = {
    id: active.id, title: active.title, description: active.description,
    startDate: active.startDate, registrationDeadline: active.registrationDeadline,
  }
  const part = await pRepo.getByMember(active.id, memberId)
  enrolled = !!part
  shouldBanner = !enrolled || today <= active.registrationDeadline
} else {
  const upcoming = await cRepo.getUpcoming()
  if (upcoming.length > 0) {
    const next = upcoming[0]!
    bannerChallenge = {
      id: next.id, title: next.title, description: next.description,
      startDate: next.startDate, registrationDeadline: next.registrationDeadline,
    }
    const part = await pRepo.getByMember(next.id, memberId)
    enrolled = !!part
    shouldBanner = true
  }
}

// in JSX, near the top of home content:
{shouldBanner && bannerChallenge && (
  <ChallengeAnnouncementBanner challenge={bannerChallenge} today={today} enrolled={enrolled} />
)}
```

- [ ] **Step 2.2: 풀 테스트 + tsc**

```bash
npx vitest run
npx tsc --noEmit
```

- [ ] **Step 2.3: 커밋**

```bash
git add src/app/home/page.tsx
git commit -m "feat(home): integrate ChallengeAnnouncementBanner at top of feed"
```

---

## Task 3: 챌린지 생성 시 모든 멤버에게 알림 발송 RPC

새 챌린지 row 생성 시 트리거 OR 수동 호출 RPC.

**Files:**
- Create: `supabase/migrations/20260618_challenge_announce_notifications.sql`

- [ ] **Step 3.1: RPC + 트리거**

```sql
CREATE OR REPLACE FUNCTION fanout_challenge_announcement(p_challenge_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_inserted int;
  ch RECORD;
BEGIN
  SELECT id, title, start_date INTO ch FROM challenges WHERE id = p_challenge_id;
  IF ch IS NULL THEN RAISE EXCEPTION 'challenge not found'; END IF;

  INSERT INTO notifications (member_id, type, payload, created_at)
  SELECT
    m.id,
    'challenge_announcement',
    jsonb_build_object(
      'challenge_id', ch.id,
      'title', ch.title,
      'start_date', ch.start_date,
      'url', '/mission'
    ),
    now()
  FROM members m;

  GET DIAGNOSTICS count_inserted = ROW_COUNT;
  RETURN count_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION fanout_challenge_announcement(uuid) TO service_role;
```

(Engineer note: `notifications` 테이블 컬럼 (member_id, type, payload, created_at, read_at?) 은 P1 에서 기존 존재한다고 가정. 미존재 시 별도 마이그레이션 필요 — `src/app/api/notifications/` 라우트 검증.)

- [ ] **Step 3.2: Dashboard 적용 (너 액션)**

- [ ] **Step 3.3: 운영자 워크플로 가이드**

`docs/admin-create-challenge.md`:

```markdown
# 신규 챌린지 생성 (운영자)

1. Supabase Dashboard SQL Editor:
```sql
INSERT INTO challenges (title, description, goal_per_day, duration_days, start_date, registration_deadline, pass_count, status)
VALUES ('런지 100일 시즌2', '매일 100개', 100, 100, '2026-08-01', '2026-08-04', 5, 'upcoming')
RETURNING id;
```
2. 위에서 반환된 `id` 로:
```sql
SELECT fanout_challenge_announcement('<UUID>');
```
3. 시작일 도달 시 status='active' 로 수동 업데이트 (또는 별도 cron 추가).
```

- [ ] **Step 3.4: 커밋**

```bash
git add supabase/migrations/20260618_challenge_announce_notifications.sql docs/admin-create-challenge.md
git commit -m "feat(db): fanout_challenge_announcement RPC + admin guide"
```

---

## Task 4: NotificationBell 챌린지 알림 항목 렌더

기존 `notification-bell.tsx` 에 type='challenge_announcement' 케이스 추가.

**Files:**
- Modify: `src/presentation/components/layout/notification-bell.tsx`
- Test: `tests/unit/components/notification-bell-challenge.test.tsx`

- [ ] **Step 4.1: 테스트**

```typescript
import { render, screen } from '@testing-library/react'
import { NotificationBell } from '@/presentation/components/layout/notification-bell'

// mock fetch for notifications
const items = [
  { id: 'n1', type: 'challenge_announcement',
    payload: { title: '런지 100일', url: '/mission' },
    created_at: '2026-06-20T10:00:00Z' },
]
global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items, unreadCount: 1 }) } as Response)

describe('NotificationBell — challenge announcement', () => {
  it('renders challenge announcement item', async () => {
    render(<NotificationBell />)
    expect(await screen.findByText(/런지 100일/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 4.2: 실패 확인**

```bash
npx vitest run tests/unit/components/notification-bell-challenge.test.tsx
```

- [ ] **Step 4.3: notification-bell.tsx 수정**

기존 알림 타입 렌더 switch 에 case 추가 (예시):

```typescript
case 'challenge_announcement':
  return (
    <Link href={item.payload.url ?? '/mission'} style={...}>
      <strong>🏃 새 챌린지</strong>
      <p>{item.payload.title}</p>
    </Link>
  )
```

(엔지니어 가이드: `notification-bell.tsx` 기존 구조 follow.)

- [ ] **Step 4.4: 통과 + 커밋**

```bash
npx vitest run tests/unit/components/notification-bell-challenge.test.tsx
git add src/presentation/components/layout/notification-bell.tsx tests/unit/components/notification-bell-challenge.test.tsx
git commit -m "feat(notifications): render challenge_announcement type in bell"
```

---

## Task 5: 시즌 시작일 도달 시 status 자동 전환 (선택적)

운영자가 깜빡할 경우 대비. `daily-pass-check` Edge Function 시작 시 status 전환 1줄 추가 OR 별도 SQL trigger.

**Files:**
- Modify: `supabase/functions/daily-pass-check/index.ts`

- [ ] **Step 5.1: 시작 시 status 'upcoming' → 'active' 전환 추가**

`daily-pass-check/index.ts` 의 active 시즌 조회 직전에:

```typescript
// promote upcoming → active if start_date reached
await supabase
  .from('challenges')
  .update({ status: 'active' })
  .eq('status', 'upcoming')
  .lte('start_date', today)
```

- [ ] **Step 5.2: 재배포**

```bash
npx supabase functions deploy daily-pass-check
```

- [ ] **Step 5.3: 커밋**

```bash
git add supabase/functions/daily-pass-check/index.ts
git commit -m "feat(edge): auto-promote upcoming challenges to active on start date"
```

---

## Task 6: E2E 공지 → 참가 → 미션 흐름

**Files:**
- Create: `tests/e2e/announcement-to-mission.spec.ts`

- [ ] **Step 6.1: 테스트**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Announcement → mission flow', () => {
  test('clicking banner leads to mission page', async ({ page }) => {
    test.skip(!process.env.E2E_HAS_UPCOMING_CHALLENGE, 'no seeded upcoming challenge')
    await page.goto('/home')
    await page.locator('text=NEW SEASON').click()
    await expect(page).toHaveURL(/\/mission/)
  })

  test('enrolling from mission updates banner to "참가 중"', async ({ page }) => {
    test.skip(!process.env.E2E_HAS_UPCOMING_CHALLENGE, 'no seeded upcoming challenge')
    await page.goto('/mission')
    await page.getByText('참가 신청').click()
    await page.goto('/home')
    await expect(page.getByText('참가 중')).toBeVisible()
  })
})
```

- [ ] **Step 6.2: 실행**

```bash
npx playwright test tests/e2e/announcement-to-mission.spec.ts
```

- [ ] **Step 6.3: 커밋**

```bash
git add tests/e2e/announcement-to-mission.spec.ts
git commit -m "test(e2e): announcement → enroll → mission happy path"
```

---

## P6 완료 검증

- [ ] `npx vitest run` PASS
- [ ] `npx tsc --noEmit` clean
- [ ] 홈 페이지에서 활성/예정 챌린지 배너 표시
- [ ] 참가 시 배너 "참가 중" 으로 변경
- [ ] `SELECT fanout_challenge_announcement(...)` 실행 시 모든 멤버에게 notifications row 생성
- [ ] notification-bell 에서 챌린지 공지 표시 + 클릭 시 /mission 이동
- [ ] daily-pass-check Edge Function 이 시작일 도달 챌린지 자동 active 전환

## 전체 시리즈 완료 검증 (P1~P6)

- [ ] 모든 마이그레이션 적용 완료
- [ ] 모든 Edge Function 배포 + cron 등록
- [ ] 단위 + 통합 + E2E 테스트 풀 그린
- [ ] tsc clean
- [ ] 운영자가 시즌 생성 → 멤버 공지 수신 → 참가 → 100일 미션 → 완주 인증 받기 전체 흐름 동작 검증
- [ ] iOS / Android 양쪽에서 Web Push 동작 확인 (iOS = PWA 설치 후)

## Self-Review

- 운영자 워크플로 = SQL Editor 기반 (admin UI 없음, V2 후보).
- D-day 표시는 KST today 기준 — 클라이언트 측은 server-passed today 값 사용.
- notification-bell 통합은 기존 알림 시스템 follow — 엔지니어가 기존 구조 보고 case 추가.
- daily-pass-check 의 upcoming → active 자동 전환 = idempotent (이미 active 면 no-op).
