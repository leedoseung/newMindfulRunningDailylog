# 100일 런지 챌린지 P2 — 미션 UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 미션 페이지 + 100칸 도장 벽 (검정 테두리 + 빨강 R 로고) + 오늘 카운터 + 챌린지 헤더 + 등록 카드 + 하단 탭 5번째 추가.

**Architecture:** P1 API 위에 React UI. Next.js App Router 서버 컴포넌트로 초기 board 데이터 fetch, client 컴포넌트로 카운트 인터랙션 처리. 디자인 토큰 = 기존 (#F7F7F5 surface, #111 text, Pretendard, #EBEBEB border) + 신규 인주 빨강 #b8231f.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, vitest + @testing-library/react (jsdom), Playwright E2E.

**관련 스펙:** [docs/superpowers/specs/2026-06-11-lunge-challenge-design.md](../specs/2026-06-11-lunge-challenge-design.md)
**관련 플랜:** [2026-06-11-lunge-challenge-p1-core.md](2026-06-11-lunge-challenge-p1-core.md) (DB + API 완료)

**P2 범위 (10 태스크):**
1. Bottom nav 5번째 탭 + IconStamp
2. StampCell (단일 셀, 6 상태)
3. MissionBoard (100칸 그리드)
4. ChallengeHeader (Day N/100 + streak + 면죄권)
5. TodayCounter (인터랙티브 +10/+20/+50 + 진행 링)
6. EnrollCard (참가 신청)
7. NoActiveChallenge fallback
8. MissionPage 서버 컴포넌트 + client 통합
9. 클라이언트 카운트 액션 (낙관 업데이트 + 롤백)
10. E2E 해피패스 (Playwright)

**P2 범위 밖:**
- 도장 찍히는 애니메이션 디테일 (P5 완주 셀러브레이션과 같이)
- 챌린지 피드 (다른 사용자 진행률) — P5
- 푸시 알림 — P4
- iOS 설치 가이드 시트 — P4
- 인증서 — P5

---

## 공통 디자인 토큰

```css
:root {
  --surface: #F7F7F5;
  --card: #ffffff;
  --dark: #111111;
  --muted: #888888;
  --border: #EBEBEB;
  --ink-red: #b8231f;  /* 인주 빨강, 신규 */
}
```

폰트 상수 (각 컴포넌트 파일 내 정의):
```typescript
const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
```

로고 = `public/icon-192.png` (브러시 R, RGBA, ~4% 픽셀 불투명).
CSS bg-image 사용 시 background-size ≥ 110% (얇은 R 가시성 확보).

---

## Task 1: Bottom nav 5번째 탭 + IconStamp SVG

기존 4 탭 → 5 탭 (홈/기록/**미션**/리더보드/프로필).

**Files:**
- Modify: `src/presentation/components/layout/bottom-nav.tsx`
- Test: `tests/unit/components/bottom-nav-mission.test.tsx` (신규)

- [ ] **Step 1.1: 실패하는 테스트**

`tests/unit/components/bottom-nav-mission.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { BottomNav } from '@/presentation/components/layout/bottom-nav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/mission',
}))

describe('BottomNav', () => {
  it('renders 5 tabs including 미션', () => {
    render(<BottomNav />)
    expect(screen.getByText('홈')).toBeInTheDocument()
    expect(screen.getByText('기록')).toBeInTheDocument()
    expect(screen.getByText('미션')).toBeInTheDocument()
    expect(screen.getByText('리더보드')).toBeInTheDocument()
    expect(screen.getByText('프로필')).toBeInTheDocument()
  })

  it('mission tab links to /mission', () => {
    render(<BottomNav />)
    const link = screen.getByText('미션').closest('a')
    expect(link).toHaveAttribute('href', '/mission')
  })
})
```

- [ ] **Step 1.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/components/bottom-nav-mission.test.tsx
```
Expected: FAIL — `미션` 텍스트 없음.

- [ ] **Step 1.3: bottom-nav.tsx 수정 — IconStamp 추가**

`src/presentation/components/layout/bottom-nav.tsx` (line 31~42 기존 IconTrophy 뒤에 IconStamp 추가):

```typescript
function IconStamp({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="11" r="6" fill={active ? 'currentColor' : 'none'} />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  )
}
```

NAV_ITEMS 배열에 미션 항목 삽입 (기록 → 미션 → 리더보드 순):

```typescript
const NAV_ITEMS = [
  { href: '/home',        Icon: IconHome,   label: '홈' },
  { href: '/',            Icon: IconPen,    label: '기록' },
  { href: '/mission',     Icon: IconStamp,  label: '미션' },
  { href: '/leaderboard', Icon: IconTrophy, label: '리더보드' },
  { href: '/profile',     Icon: IconPerson, label: '프로필' },
]
```

- [ ] **Step 1.4: 테스트 통과 확인**

```bash
npx vitest run tests/unit/components/bottom-nav-mission.test.tsx
```
Expected: PASS — 2.

- [ ] **Step 1.5: 풀 테스트 (regression 검증)**

```bash
npx vitest run
```
Expected: 모든 테스트 PASS (기존 bottom-nav 사용처 깨지면 안 됨).

- [ ] **Step 1.6: 커밋**

```bash
git add src/presentation/components/layout/bottom-nav.tsx tests/unit/components/bottom-nav-mission.test.tsx
git commit -m "feat(nav): add mission tab to bottom navigation"
```

---

## Task 2: StampCell — 100칸 도장 벽 단일 셀

상태별 시각 분기 + 빨강 R 로고 background.

**Files:**
- Create: `src/presentation/components/mission/stamp-cell.tsx`
- Test: `tests/unit/components/stamp-cell.test.tsx`

- [ ] **Step 2.1: 실패하는 테스트**

`tests/unit/components/stamp-cell.test.tsx`:

```typescript
import { render } from '@testing-library/react'
import { StampCell } from '@/presentation/components/mission/stamp-cell'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'

const cell = (overrides: Partial<MissionDayCell> = {}): MissionDayCell => ({
  dayIndex: 0,
  date: '2026-07-01',
  state: 'done',
  count: 100,
  usedPass: false,
  ...overrides,
})

describe('StampCell', () => {
  it('renders done state with stamp class', () => {
    const { container } = render(<StampCell cell={cell({ state: 'done' })} />)
    expect(container.querySelector('[data-state="done"]')).toBeInTheDocument()
  })

  it('renders today state with dashed border', () => {
    const { container } = render(<StampCell cell={cell({ state: 'today', count: 30 })} />)
    expect(container.querySelector('[data-state="today"]')).toBeInTheDocument()
  })

  it('renders partial state', () => {
    const { container } = render(<StampCell cell={cell({ state: 'partial', count: 50 })} />)
    expect(container.querySelector('[data-state="partial"]')).toBeInTheDocument()
  })

  it('renders pass state', () => {
    const { container } = render(<StampCell cell={cell({ state: 'pass', usedPass: true })} />)
    expect(container.querySelector('[data-state="pass"]')).toBeInTheDocument()
  })

  it('renders miss state', () => {
    const { container } = render(<StampCell cell={cell({ state: 'miss', count: 0 })} />)
    expect(container.querySelector('[data-state="miss"]')).toBeInTheDocument()
  })

  it('renders future state', () => {
    const { container } = render(<StampCell cell={cell({ state: 'future', count: 0 })} />)
    expect(container.querySelector('[data-state="future"]')).toBeInTheDocument()
  })

  it('applies deterministic rotation based on date', () => {
    const { container: a } = render(<StampCell cell={cell({ date: '2026-07-01', state: 'done' })} />)
    const { container: b } = render(<StampCell cell={cell({ date: '2026-07-01', state: 'done' })} />)
    const styleA = a.querySelector('[data-state]')?.getAttribute('style') ?? ''
    const styleB = b.querySelector('[data-state]')?.getAttribute('style') ?? ''
    expect(styleA).toBe(styleB)
  })
})
```

- [ ] **Step 2.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/components/stamp-cell.test.tsx
```

- [ ] **Step 2.3: 구현**

`src/presentation/components/mission/stamp-cell.tsx`:

```typescript
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'

type Props = { cell: MissionDayCell }

function seededRotation(date: string): number {
  let hash = 0
  for (let i = 0; i < date.length; i++) hash = ((hash << 5) - hash) + date.charCodeAt(i)
  const norm = (Math.abs(hash) % 1000) / 1000  // 0~1
  return (norm - 0.5) * 16  // -8 ~ +8 deg
}

export function StampCell({ cell }: Props) {
  const rotation = seededRotation(cell.date)

  const base: React.CSSProperties = {
    aspectRatio: '1 / 1',
    position: 'relative',
    borderRadius: '50%',
    transform: `rotate(${rotation}deg)`,
  }

  if (cell.state === 'done') {
    return (
      <div
        data-state="done"
        style={{
          ...base,
          border: '1.5px solid #111',
          backgroundImage: "url('/icon-192.png')",
          backgroundSize: '75%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          filter: 'brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(4200%) hue-rotate(355deg) brightness(0.85) contrast(1.1)',
        }}
        aria-label={`Day ${cell.dayIndex + 1} 달성`}
      />
    )
  }

  if (cell.state === 'today') {
    return (
      <div
        data-state="today"
        style={{
          ...base,
          border: '2px dashed #111',
          transform: 'none',
        }}
        aria-label={`오늘 (${cell.count}/100)`}
      />
    )
  }

  if (cell.state === 'partial') {
    return (
      <div
        data-state="partial"
        style={{
          ...base,
          border: '1px solid #c8c8c4',
          backgroundImage: "url('/icon-192.png')",
          backgroundSize: '70%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          opacity: 0.45,
        }}
        aria-label={`부분 달성 ${cell.count}/100`}
      />
    )
  }

  if (cell.state === 'pass') {
    return (
      <div
        data-state="pass"
        style={{
          ...base,
          border: '1px solid #c8c8c4',
          background: 'repeating-linear-gradient(45deg, #f0f0ee, #f0f0ee 3px, #fff 3px, #fff 6px)',
        }}
        aria-label="면죄권 사용"
      />
    )
  }

  if (cell.state === 'miss') {
    return (
      <div
        data-state="miss"
        style={{
          ...base,
          border: '1px solid #f0e0e0',
          background: '#fef5f5',
          transform: 'none',
        }}
        aria-label="미달성"
      />
    )
  }

  return (
    <div
      data-state="future"
      style={{
        ...base,
        border: '1px dashed #d8d8d4',
        background: 'transparent',
        opacity: 0.5,
        transform: 'none',
      }}
      aria-label="미래 날짜"
    />
  )
}
```

- [ ] **Step 2.4: 테스트 통과 확인**

```bash
npx vitest run tests/unit/components/stamp-cell.test.tsx
```
Expected: PASS — 7.

- [ ] **Step 2.5: 커밋**

```bash
git add src/presentation/components/mission/stamp-cell.tsx tests/unit/components/stamp-cell.test.tsx
git commit -m "feat(mission): add StampCell with 6-state visual variants"
```

---

## Task 3: MissionBoard — 100칸 그리드

**Files:**
- Create: `src/presentation/components/mission/mission-board.tsx`
- Test: `tests/unit/components/mission-board.test.tsx`

- [ ] **Step 3.1: 실패하는 테스트**

`tests/unit/components/mission-board.test.tsx`:

```typescript
import { render } from '@testing-library/react'
import { MissionBoard } from '@/presentation/components/mission/mission-board'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'

function makeCells(): MissionDayCell[] {
  return Array.from({ length: 100 }, (_, i) => ({
    dayIndex: i,
    date: `2026-07-${String(i + 1).padStart(2, '0')}`,
    state: i < 10 ? 'done' : i === 10 ? 'today' : 'future',
    count: i < 10 ? 100 : i === 10 ? 30 : 0,
    usedPass: false,
  }))
}

describe('MissionBoard', () => {
  it('renders 100 cells in a 10-column grid', () => {
    const { container } = render(<MissionBoard cells={makeCells()} />)
    const cells = container.querySelectorAll('[data-state]')
    expect(cells).toHaveLength(100)
  })

  it('throws when cells.length !== 100', () => {
    expect(() => render(<MissionBoard cells={[]} />)).toThrow(/100/)
  })
})
```

- [ ] **Step 3.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/components/mission-board.test.tsx
```

- [ ] **Step 3.3: 구현**

`src/presentation/components/mission/mission-board.tsx`:

```typescript
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import { StampCell } from './stamp-cell'

type Props = { cells: MissionDayCell[] }

export function MissionBoard({ cells }: Props) {
  if (cells.length !== 100) {
    throw new Error(`MissionBoard expects 100 cells, got ${cells.length}`)
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        gap: 6,
      }}
    >
      {cells.map(cell => (
        <StampCell key={cell.dayIndex} cell={cell} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3.4: 테스트 통과 확인**

```bash
npx vitest run tests/unit/components/mission-board.test.tsx
```
Expected: PASS — 2.

- [ ] **Step 3.5: 커밋**

```bash
git add src/presentation/components/mission/mission-board.tsx tests/unit/components/mission-board.test.tsx
git commit -m "feat(mission): add MissionBoard 10x10 grid"
```

---

## Task 4: ChallengeHeader — Day N/100 + streak + 면죄권

**Files:**
- Create: `src/presentation/components/mission/challenge-header.tsx`
- Test: `tests/unit/components/challenge-header.test.tsx`

- [ ] **Step 4.1: 실패하는 테스트**

`tests/unit/components/challenge-header.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { ChallengeHeader } from '@/presentation/components/mission/challenge-header'

describe('ChallengeHeader', () => {
  it('renders Day N / 100 label', () => {
    render(
      <ChallengeHeader
        title="런지 100일 챌린지"
        todayIndex={46}
        durationDays={100}
        streak={12}
        passesRemaining={4}
        passCount={5}
      />
    )
    expect(screen.getByText('Day 47')).toBeInTheDocument()
    expect(screen.getByText('/ 100')).toBeInTheDocument()
    expect(screen.getByText('streak')).toBeInTheDocument()
    expect(screen.getByText('12일')).toBeInTheDocument()
    expect(screen.getByText('면죄권')).toBeInTheDocument()
    expect(screen.getByText('4 / 5')).toBeInTheDocument()
  })

  it('renders before-start state when todayIndex == -1', () => {
    render(
      <ChallengeHeader
        title="런지 100일 챌린지"
        todayIndex={-1}
        durationDays={100}
        streak={0}
        passesRemaining={5}
        passCount={5}
      />
    )
    expect(screen.getByText(/시작 전|준비/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 4.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/components/challenge-header.test.tsx
```

- [ ] **Step 4.3: 구현**

`src/presentation/components/mission/challenge-header.tsx`:

```typescript
type Props = {
  title: string
  todayIndex: number  // -1 if outside season range
  durationDays: number
  streak: number
  passesRemaining: number
  passCount: number
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function ChallengeHeader({
  title, todayIndex, durationDays, streak, passesRemaining, passCount,
}: Props) {
  const dayLabel = todayIndex >= 0 ? `Day ${todayIndex + 1}` : '시작 전'
  const beforeStart = todayIndex < 0

  return (
    <header
      style={{
        fontFamily: FONT,
        background: '#fff',
        border: '1px solid #EBEBEB',
        borderRadius: 18,
        padding: 18,
      }}
    >
      <p style={{ fontSize: 11, color: '#888', margin: 0, letterSpacing: '0.05em' }}>
        {title}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
          {dayLabel}
        </span>
        {!beforeStart && (
          <span style={{ fontSize: 14, color: '#888', fontWeight: 500 }}>/ {durationDays}</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
        <div>
          <p style={{ fontSize: 10, color: '#888', margin: 0, letterSpacing: '0.05em' }}>streak</p>
          <p style={{ fontSize: 14, color: '#111', margin: 0, fontWeight: 600 }}>{streak}일</p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: '#888', margin: 0, letterSpacing: '0.05em' }}>면죄권</p>
          <p style={{ fontSize: 14, color: '#111', margin: 0, fontWeight: 600 }}>
            {passesRemaining} / {passCount}
          </p>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 4.4: 테스트 통과 확인**

```bash
npx vitest run tests/unit/components/challenge-header.test.tsx
```
Expected: PASS — 2.

- [ ] **Step 4.5: 커밋**

```bash
git add src/presentation/components/mission/challenge-header.tsx tests/unit/components/challenge-header.test.tsx
git commit -m "feat(mission): add ChallengeHeader with day/streak/pass display"
```

---

## Task 5: TodayCounter — 인터랙티브 카운터 + 진행 링

**Files:**
- Create: `src/presentation/components/mission/today-counter.tsx`
- Test: `tests/unit/components/today-counter.test.tsx`

- [ ] **Step 5.1: 실패하는 테스트**

`tests/unit/components/today-counter.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { TodayCounter } from '@/presentation/components/mission/today-counter'

describe('TodayCounter', () => {
  it('renders current count and progress', () => {
    render(<TodayCounter count={47} goal={100} onAdd={() => {}} />)
    expect(screen.getByText('47')).toBeInTheDocument()
    expect(screen.getByText(/100/)).toBeInTheDocument()
  })

  it('calls onAdd with 10 when +10 button clicked', () => {
    const onAdd = vi.fn()
    render(<TodayCounter count={47} goal={100} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('+10'))
    expect(onAdd).toHaveBeenCalledWith(10)
  })

  it('calls onAdd with 20 when +20 button clicked', () => {
    const onAdd = vi.fn()
    render(<TodayCounter count={47} goal={100} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('+20'))
    expect(onAdd).toHaveBeenCalledWith(20)
  })

  it('calls onAdd with 50 when +50 button clicked', () => {
    const onAdd = vi.fn()
    render(<TodayCounter count={47} goal={100} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('+50'))
    expect(onAdd).toHaveBeenCalledWith(50)
  })

  it('disables buttons when disabled prop set', () => {
    const onAdd = vi.fn()
    render(<TodayCounter count={47} goal={100} onAdd={onAdd} disabled />)
    fireEvent.click(screen.getByText('+10'))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('caps display count at goal when count > goal', () => {
    render(<TodayCounter count={150} goal={100} onAdd={() => {}} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })
})
```

- [ ] **Step 5.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/components/today-counter.test.tsx
```

- [ ] **Step 5.3: 구현**

`src/presentation/components/mission/today-counter.tsx`:

```typescript
'use client'

type Props = {
  count: number
  goal: number
  onAdd: (delta: number) => void
  disabled?: boolean
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const DELTAS = [10, 20, 50] as const

export function TodayCounter({ count, goal, onAdd, disabled = false }: Props) {
  const displayCount = Math.min(count, goal)
  const ratio = Math.min(count / goal, 1)
  const ringDeg = ratio * 360

  return (
    <section
      style={{
        fontFamily: FONT,
        background: '#fff',
        border: '1px solid #EBEBEB',
        borderRadius: 18,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `conic-gradient(#111 0deg ${ringDeg}deg, #EBEBEB ${ringDeg}deg 360deg)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 10,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {displayCount}
          </span>
          <span style={{ fontSize: 12, color: '#888', marginTop: 4 }}>/ {goal}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        {DELTAS.map(d => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => onAdd(d)}
            style={{
              flex: 1,
              padding: '12px 0',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: FONT,
              background: disabled ? '#f0f0ee' : '#111',
              color: disabled ? '#888' : '#fff',
              border: 'none',
              borderRadius: 12,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            +{d}
          </button>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 5.4: 테스트 통과 확인**

```bash
npx vitest run tests/unit/components/today-counter.test.tsx
```
Expected: PASS — 6.

- [ ] **Step 5.5: 커밋**

```bash
git add src/presentation/components/mission/today-counter.tsx tests/unit/components/today-counter.test.tsx
git commit -m "feat(mission): add TodayCounter with quick-add buttons + progress ring"
```

---

## Task 6: EnrollCard — 참가 신청

비참가 상태에서 표시.

**Files:**
- Create: `src/presentation/components/mission/enroll-card.tsx`
- Test: `tests/unit/components/enroll-card.test.tsx`

- [ ] **Step 6.1: 실패하는 테스트**

`tests/unit/components/enroll-card.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { EnrollCard } from '@/presentation/components/mission/enroll-card'

describe('EnrollCard', () => {
  it('renders title, start date, and enroll button', () => {
    render(
      <EnrollCard
        title="런지 100일 챌린지"
        description="매일 100개"
        startDate="2026-07-01"
        registrationDeadline="2026-07-04"
        onEnroll={() => {}}
      />
    )
    expect(screen.getByText('런지 100일 챌린지')).toBeInTheDocument()
    expect(screen.getByText(/2026-07-01/)).toBeInTheDocument()
    expect(screen.getByText('참가 신청')).toBeInTheDocument()
  })

  it('calls onEnroll when button clicked', () => {
    const onEnroll = vi.fn()
    render(
      <EnrollCard
        title="t" description="" startDate="2026-07-01"
        registrationDeadline="2026-07-04" onEnroll={onEnroll}
      />
    )
    fireEvent.click(screen.getByText('참가 신청'))
    expect(onEnroll).toHaveBeenCalledTimes(1)
  })

  it('disables button when isPending', () => {
    const onEnroll = vi.fn()
    render(
      <EnrollCard
        title="t" description="" startDate="2026-07-01"
        registrationDeadline="2026-07-04" onEnroll={onEnroll} isPending
      />
    )
    fireEvent.click(screen.getByText(/처리|참가/))
    expect(onEnroll).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 6.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/components/enroll-card.test.tsx
```

- [ ] **Step 6.3: 구현**

`src/presentation/components/mission/enroll-card.tsx`:

```typescript
'use client'

type Props = {
  title: string
  description: string
  startDate: string
  registrationDeadline: string
  onEnroll: () => void
  isPending?: boolean
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function EnrollCard({
  title, description, startDate, registrationDeadline, onEnroll, isPending = false,
}: Props) {
  return (
    <section
      style={{
        fontFamily: FONT,
        background: '#fff',
        border: '1px solid #EBEBEB',
        borderRadius: 18,
        padding: 24,
      }}
    >
      <p style={{ fontSize: 11, color: '#888', margin: 0, letterSpacing: '0.05em' }}>SEASON</p>
      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '6px 0 12px' }}>
        {title}
      </h2>
      {description && (
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, margin: '0 0 16px' }}>
          {description}
        </p>
      )}
      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '0 0 20px' }}>
        <div>
          <dt style={{ fontSize: 10, color: '#888', letterSpacing: '0.05em' }}>시작일</dt>
          <dd style={{ fontSize: 13, color: '#111', margin: 0, fontWeight: 600 }}>{startDate}</dd>
        </div>
        <div>
          <dt style={{ fontSize: 10, color: '#888', letterSpacing: '0.05em' }}>등록 마감</dt>
          <dd style={{ fontSize: 13, color: '#111', margin: 0, fontWeight: 600 }}>
            {registrationDeadline}
          </dd>
        </div>
      </dl>
      <button
        type="button"
        disabled={isPending}
        onClick={onEnroll}
        style={{
          width: '100%',
          padding: '14px 0',
          fontSize: 15,
          fontWeight: 600,
          fontFamily: FONT,
          background: isPending ? '#888' : '#111',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          cursor: isPending ? 'not-allowed' : 'pointer',
        }}
      >
        {isPending ? '처리 중...' : '참가 신청'}
      </button>
    </section>
  )
}
```

- [ ] **Step 6.4: 테스트 통과 확인**

```bash
npx vitest run tests/unit/components/enroll-card.test.tsx
```
Expected: PASS — 3.

- [ ] **Step 6.5: 커밋**

```bash
git add src/presentation/components/mission/enroll-card.tsx tests/unit/components/enroll-card.test.tsx
git commit -m "feat(mission): add EnrollCard for season registration"
```

---

## Task 7: NoActiveChallenge — fallback 상태

활성 시즌도 없고 예정된 시즌도 없을 때.

**Files:**
- Create: `src/presentation/components/mission/no-active-challenge.tsx`
- Test: `tests/unit/components/no-active-challenge.test.tsx`

- [ ] **Step 7.1: 실패하는 테스트**

`tests/unit/components/no-active-challenge.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { NoActiveChallenge } from '@/presentation/components/mission/no-active-challenge'

describe('NoActiveChallenge', () => {
  it('renders empty-state message', () => {
    render(<NoActiveChallenge />)
    expect(screen.getByText(/진행 중인 챌린지가 없|곧/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 7.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/components/no-active-challenge.test.tsx
```

- [ ] **Step 7.3: 구현**

`src/presentation/components/mission/no-active-challenge.tsx`:

```typescript
const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function NoActiveChallenge() {
  return (
    <section
      style={{
        fontFamily: FONT,
        background: '#fff',
        border: '1px solid #EBEBEB',
        borderRadius: 18,
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 14, color: '#555', margin: 0, lineHeight: 1.7 }}>
        진행 중인 챌린지가 없어요.<br />
        곧 새 시즌이 공지됩니다.
      </p>
    </section>
  )
}
```

- [ ] **Step 7.4: 테스트 통과 확인**

```bash
npx vitest run tests/unit/components/no-active-challenge.test.tsx
```
Expected: PASS.

- [ ] **Step 7.5: 커밋**

```bash
git add src/presentation/components/mission/no-active-challenge.tsx tests/unit/components/no-active-challenge.test.tsx
git commit -m "feat(mission): add NoActiveChallenge empty state"
```

---

## Task 8: MissionPage 서버 컴포넌트 — 데이터 fetch + 조건부 렌더

서버에서 board + active challenge 동시 fetch → client 컴포넌트로 props 전달.

**Files:**
- Create: `src/app/mission/page.tsx`
- Create: `src/presentation/components/mission/mission-page-client.tsx`
- Test: `tests/unit/components/mission-page-client.test.tsx`

- [ ] **Step 8.1: 실패하는 client 테스트 작성**

`tests/unit/components/mission-page-client.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { MissionPageClient } from '@/presentation/components/mission/mission-page-client'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import type { Challenge } from '@/domain/entities/challenge'

const makeCells = (): MissionDayCell[] =>
  Array.from({ length: 100 }, (_, i) => ({
    dayIndex: i, date: `2026-07-${String(i + 1).padStart(2, '0')}`,
    state: i < 5 ? 'done' : i === 5 ? 'today' : 'future',
    count: i < 5 ? 100 : 0, usedPass: false,
  }))

const challenge: Challenge = {
  id: 'c1', title: '런지 100일', description: '', goalPerDay: 100,
  durationDays: 100, startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
}

describe('MissionPageClient', () => {
  it('renders board + header + counter when enrolled with board data', () => {
    render(
      <MissionPageClient
        mode="enrolled"
        challenge={challenge}
        board={{
          cells: makeCells(), streak: 5, completedDays: 5,
          passesRemaining: 4, todayIndex: 5, challengeId: 'c1',
        }}
      />
    )
    expect(screen.getByText('Day 6')).toBeInTheDocument()
    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0)
  })

  it('renders enroll card when not enrolled and upcoming challenge exists', () => {
    render(
      <MissionPageClient
        mode="not-enrolled"
        challenge={challenge}
      />
    )
    expect(screen.getByText('참가 신청')).toBeInTheDocument()
  })

  it('renders no-active state when no challenge', () => {
    render(<MissionPageClient mode="no-challenge" />)
    expect(screen.getByText(/진행 중인|곧/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 8.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/components/mission-page-client.test.tsx
```

- [ ] **Step 8.3: client 컴포넌트 구현**

`src/presentation/components/mission/mission-page-client.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MissionBoard } from './mission-board'
import { ChallengeHeader } from './challenge-header'
import { TodayCounter } from './today-counter'
import { EnrollCard } from './enroll-card'
import { NoActiveChallenge } from './no-active-challenge'
import type { Challenge } from '@/domain/entities/challenge'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'

type EnrolledProps = {
  mode: 'enrolled'
  challenge: Challenge
  board: {
    cells: MissionDayCell[]
    streak: number
    completedDays: number
    passesRemaining: number
    todayIndex: number
    challengeId: string
  }
}

type NotEnrolledProps = {
  mode: 'not-enrolled'
  challenge: Challenge
}

type NoChallengeProps = {
  mode: 'no-challenge'
}

type Props = EnrolledProps | NotEnrolledProps | NoChallengeProps

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function MissionPageClient(props: Props) {
  const router = useRouter()
  const [enrollPending, setEnrollPending] = useState(false)

  async function enroll(challengeId: string) {
    setEnrollPending(true)
    try {
      const res = await fetch('/api/challenges/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`참가 실패: ${err.error}`)
        return
      }
      router.refresh()
    } finally {
      setEnrollPending(false)
    }
  }

  const wrap: React.CSSProperties = {
    fontFamily: FONT,
    padding: '16px 16px 120px',
    background: '#F7F7F5',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  }

  if (props.mode === 'no-challenge') {
    return (
      <main style={wrap}>
        <NoActiveChallenge />
      </main>
    )
  }

  if (props.mode === 'not-enrolled') {
    return (
      <main style={wrap}>
        <EnrollCard
          title={props.challenge.title}
          description={props.challenge.description}
          startDate={props.challenge.startDate}
          registrationDeadline={props.challenge.registrationDeadline}
          onEnroll={() => enroll(props.challenge.id)}
          isPending={enrollPending}
        />
      </main>
    )
  }

  // enrolled
  const { challenge, board } = props
  const todayCell = board.todayIndex >= 0 ? board.cells[board.todayIndex] : null
  const todayCount = todayCell?.count ?? 0

  return (
    <main style={wrap}>
      <ChallengeHeader
        title={challenge.title}
        todayIndex={board.todayIndex}
        durationDays={challenge.durationDays}
        streak={board.streak}
        passesRemaining={board.passesRemaining}
        passCount={challenge.passCount}
      />
      {board.todayIndex >= 0 && (
        <TodayCounter
          count={todayCount}
          goal={challenge.goalPerDay}
          onAdd={async (delta) => {
            await fetch('/api/challenges/mission', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ delta }),
            })
            router.refresh()
          }}
        />
      )}
      <MissionBoard cells={board.cells} />
    </main>
  )
}
```

- [ ] **Step 8.4: server 컴포넌트 (page)**

`src/app/mission/page.tsx`:

```typescript
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { SupabaseMissionLogRepository } from '@/infrastructure/supabase/mission-log-repository'
import { GetActiveChallengeUseCase } from '@/application/use-cases/get-active-challenge'
import { GetMissionBoardUseCase } from '@/application/use-cases/get-mission-board'
import { MissionPageClient } from '@/presentation/components/mission/mission-page-client'
import { redirect } from 'next/navigation'

function kstToday(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export default async function MissionPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) redirect('/link-member')

  const cRepo = new SupabaseChallengeRepository(supabase)
  const pRepo = new SupabaseChallengeParticipationRepository(supabase)
  const mRepo = new SupabaseMissionLogRepository(supabase)

  const active = await new GetActiveChallengeUseCase(cRepo, pRepo).execute(memberId)

  if (!active.challenge) {
    // try upcoming
    const upcoming = await cRepo.getUpcoming()
    if (upcoming.length > 0) {
      const next = upcoming[0]!
      const existing = await pRepo.getByMember(next.id, memberId)
      if (existing) {
        // already enrolled in upcoming, show board with no today
        const board = await new GetMissionBoardUseCase(cRepo, mRepo).execute({
          participation: existing, today: kstToday(),
        })
        return <MissionPageClient mode="enrolled" challenge={next} board={board} />
      }
      return <MissionPageClient mode="not-enrolled" challenge={next} />
    }
    return <MissionPageClient mode="no-challenge" />
  }

  if (!active.participation) {
    return <MissionPageClient mode="not-enrolled" challenge={active.challenge} />
  }

  const board = await new GetMissionBoardUseCase(cRepo, mRepo).execute({
    participation: active.participation, today: kstToday(),
  })

  return <MissionPageClient mode="enrolled" challenge={active.challenge} board={board} />
}
```

- [ ] **Step 8.5: 테스트 통과 확인**

```bash
npx vitest run tests/unit/components/mission-page-client.test.tsx
```
Expected: PASS — 3.

- [ ] **Step 8.6: 풀 테스트 + 타입 체크**

```bash
npx vitest run
npx tsc --noEmit
```
Expected: 모든 테스트 PASS, 타입 에러 없음.

- [ ] **Step 8.7: 커밋**

```bash
git add src/app/mission/page.tsx src/presentation/components/mission/mission-page-client.tsx tests/unit/components/mission-page-client.test.tsx
git commit -m "feat(mission): add /mission page with server fetch + 3-mode client"
```

---

## Task 9: 카운트 액션 — 낙관 업데이트 + 에러 롤백

Task 8 의 `onAdd` 는 단순 fetch + router.refresh(). 사용자 체감 위해 낙관 업데이트 + 실패 시 토스트.

**Files:**
- Modify: `src/presentation/components/mission/mission-page-client.tsx`
- Test: `tests/unit/components/mission-page-client-counter.test.tsx`

- [ ] **Step 9.1: 실패하는 테스트**

`tests/unit/components/mission-page-client-counter.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { MissionPageClient } from '@/presentation/components/mission/mission-page-client'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import type { Challenge } from '@/domain/entities/challenge'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const challenge: Challenge = {
  id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
  startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
}

const cells: MissionDayCell[] = Array.from({ length: 100 }, (_, i) => ({
  dayIndex: i, date: `2026-07-${String(i + 1).padStart(2, '0')}`,
  state: i === 0 ? 'today' : 'future',
  count: i === 0 ? 40 : 0, usedPass: false,
}))

describe('TodayCounter optimistic update', () => {
  it('shows updated count immediately after +10 click (optimistic)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 50 }),
    } as Response)

    render(
      <MissionPageClient
        mode="enrolled"
        challenge={challenge}
        board={{ cells, streak: 0, completedDays: 0, passesRemaining: 5, todayIndex: 0, challengeId: 'c1' }}
      />
    )

    expect(screen.getByText('40')).toBeInTheDocument()
    fireEvent.click(screen.getByText('+10'))

    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument()
    })
  })

  it('rolls back to previous count on API failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'NEGATIVE_DELTA' }),
    } as Response)

    render(
      <MissionPageClient
        mode="enrolled"
        challenge={challenge}
        board={{ cells, streak: 0, completedDays: 0, passesRemaining: 5, todayIndex: 0, challengeId: 'c1' }}
      />
    )

    expect(screen.getByText('40')).toBeInTheDocument()
    fireEvent.click(screen.getByText('+10'))

    // optimistic 50 then rollback to 40
    await waitFor(() => {
      expect(screen.getByText('40')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 9.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/components/mission-page-client-counter.test.tsx
```

- [ ] **Step 9.3: mission-page-client.tsx 수정 — local state 추가**

Replace the `enrolled` rendering block in `src/presentation/components/mission/mission-page-client.tsx`:

```typescript
// add to imports:
// (useState already imported)

// inside MissionPageClient, before the if-else cascade:
const [overrideCount, setOverrideCount] = useState<number | null>(null)
const [overrideError, setOverrideError] = useState<string | null>(null)

async function addCount(delta: number, prevCount: number) {
  const newOptimistic = prevCount + delta
  setOverrideCount(newOptimistic)
  setOverrideError(null)
  try {
    const res = await fetch('/api/challenges/mission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta }),
    })
    if (!res.ok) {
      const err = await res.json()
      setOverrideCount(prevCount)
      setOverrideError(err.error ?? 'UNKNOWN')
      return
    }
    const log = await res.json()
    setOverrideCount(typeof log.count === 'number' ? log.count : newOptimistic)
    router.refresh()
  } catch (err) {
    setOverrideCount(prevCount)
    setOverrideError(String(err))
  }
}

// ...

// In the enrolled branch, replace the TodayCounter onAdd handler:
{board.todayIndex >= 0 && (
  <>
    <TodayCounter
      count={overrideCount ?? todayCount}
      goal={challenge.goalPerDay}
      onAdd={(delta) => addCount(delta, overrideCount ?? todayCount)}
    />
    {overrideError && (
      <div role="alert" style={{ color: '#b8231f', fontSize: 12, textAlign: 'center' }}>
        실패: {overrideError}
      </div>
    )}
  </>
)}
```

(Engineer note: the rest of `MissionPageClient` is unchanged — keep ChallengeHeader and MissionBoard rendering as in Task 8.)

- [ ] **Step 9.4: 테스트 통과 확인**

```bash
npx vitest run tests/unit/components/mission-page-client-counter.test.tsx
```
Expected: PASS — 2.

- [ ] **Step 9.5: 풀 테스트 + tsc**

```bash
npx vitest run
npx tsc --noEmit
```

- [ ] **Step 9.6: 커밋**

```bash
git add src/presentation/components/mission/mission-page-client.tsx tests/unit/components/mission-page-client-counter.test.tsx
git commit -m "feat(mission): optimistic count update + rollback on failure"
```

---

## Task 10: E2E 해피패스 (Playwright)

활성 챌린지에 참가하지 않은 사용자가 미션 페이지 접근 → 참가 신청 → board 표시 → +10 → 카운트 증가.

**Files:**
- Create: `tests/e2e/mission.spec.ts`

- [ ] **Step 10.1: e2e 테스트 작성**

`tests/e2e/mission.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Mission page', () => {
  test.beforeEach(async ({ page }) => {
    // assumes test user is logged in via persisted state in playwright.config.ts
    await page.goto('/mission')
  })

  test('shows empty state when no challenge exists', async ({ page }) => {
    // skip this test in env where a seeded challenge exists
    test.skip(!!process.env.E2E_HAS_CHALLENGE, 'seeded challenge present')
    await expect(page.getByText(/진행 중인 챌린지가 없|곧/)).toBeVisible()
  })

  test('renders board when enrolled', async ({ page }) => {
    test.skip(!process.env.E2E_HAS_CHALLENGE, 'no seeded challenge')
    await expect(page.locator('[data-state]')).toHaveCount(100)
  })

  test('increments count on +10 click when today is in season', async ({ page }) => {
    test.skip(!process.env.E2E_HAS_CHALLENGE, 'no seeded challenge')
    const initialCountText = await page.locator('text=/^\\d+$/').first().textContent()
    const initial = Number(initialCountText ?? 0)
    await page.getByRole('button', { name: '+10' }).click()
    await expect(page.locator('text=/^\\d+$/').first()).toHaveText(String(initial + 10), { timeout: 2000 })
  })
})
```

- [ ] **Step 10.2: 실행 (스킵 조건 자동)**

```bash
npx playwright test tests/e2e/mission.spec.ts
```
Expected: 시드 환경에 따라 skip 또는 PASS.

- [ ] **Step 10.3: 풀 단위 테스트 + tsc 최종 검증**

```bash
npx vitest run
npx tsc --noEmit
```
Expected: 모든 PASS.

- [ ] **Step 10.4: 커밋**

```bash
git add tests/e2e/mission.spec.ts
git commit -m "test(e2e): add mission page happy-path spec"
```

---

## P2 완료 검증

- [ ] `npx vitest run` — 모든 테스트 PASS (P1 92 + P2 신규)
- [ ] `npx tsc --noEmit` — 0 에러
- [ ] `npm run dev` 로 `/mission` 방문 → 시즌 상태별로 (no-challenge / not-enrolled / enrolled) 각 화면 확인
- [ ] 하단 탭에 "미션" 표시 + 정상 라우팅
- [ ] 카운트 +10 클릭 시 즉시 화면 반영, 실패 시 롤백

## 다음 플랜

- **P3 백엔드 잡** — daily-pass-check Edge Function + pg_cron + 면죄권 자동 차감
- **P4 Web Push** — Service Worker + VAPID + push_subscriptions + iOS 설치 가이드
- **P5 완주 인증 + 피드** — 인증서 + 영구 뱃지 + Realtime feed
- **P6 공지 + Enroll UI** — 홈 상단 공지 배너 (현재 P2 에는 mission 페이지 enroll 만 존재)

## Self-Review

- **Spec coverage:** P2 = UI only. 디자인 결정 (Q12 = 도장 벽 검정 테두리 + 빨강 R 로고, Q6 = 하단 탭 5번째, Q13 = +10/+20/+50 빠른 버튼 + 진행 링) 모두 태스크에 매핑됨.
- **Placeholder scan:** TBD/TODO 없음. Task 9 의 Step 9.3 는 "기존 enrolled 블록을 이렇게 교체" 형태로 부분 코드 — 엔지니어는 Task 8 의 `enrolled` 분기를 이 패턴으로 수정해야 함. 명시적 가이드 있음.
- **Type consistency:** 컴포넌트 props 가 P1 의 entity 타입 (`Challenge`, `MissionDayCell`) 과 use case 반환 타입 (`MissionBoard`) 을 직접 사용. drift 없음.
- **로고 렌더 검증:** StampCell `done` / `partial` 상태가 `background-image: url('/icon-192.png')` + CSS filter 로 빨강 R 표시 — Next.js public/ 자동 서빙됨. SSR 환경에서도 동작.
- **a11y:** 각 셀에 `aria-label` 설정 (예: "Day 47 달성", "오늘 (47/100)", "면죄권 사용"). 스크린 리더 호환.
- **낙관 업데이트 안전:** `overrideCount` 로컬 state, 실패 시 명시적 롤백, 에러 메시지 alert 영역. server state 와 client state 동기는 `router.refresh()` 로 처리.
