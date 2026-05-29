# Swipe Card Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `PhotoGrid`(마소리 레이아웃)를 GSAP 기반 스와이프 카드 덱으로 교체해 홈 피드의 카드를 한 장씩 좌우로 스와이프할 수 있게 한다.

**Architecture:** 새 `SwipeCardDeck` 클라이언트 컴포넌트가 `PhotoGrid`를 대체한다. GSAP `gsap.to/set`으로 카드 스택 위치·회전·스케일을 제어하고, `useEffect` + 직접 `addEventListener`로 터치 이벤트를 처리한다(passive:false 필요). 무한스크롤은 "카드 2장 남으면 fetch"로 유지한다.

**Tech Stack:** Next.js 14 App Router, React, GSAP 3, TypeScript

**⚠️ 모바일 주의사항 (반드시 지켜야 함):**
1. **`touch-action: none`** — 카드 요소에 CSS로 명시. 없으면 iOS Safari가 스와이프를 스크롤로 처리함.
2. **`addEventListener` 직접 사용** — JSX `onTouchMove` prop은 passive를 끌 수 없음. `useEffect` 안에서 `{ passive: false }` 옵션으로 등록해야 `e.preventDefault()`가 작동함.
3. **`overscroll-behavior: none`** — 카드 덱 컨테이너에 적용해 iOS 당겨서-새로고침 방지.
4. **`will-change: transform`** — 카드 요소에 적용해 GPU 레이어 확보. 제거하면 저사양 Android에서 버벅임.
5. **backdrop-filter 성능** — Glass 효과는 구형 Android(2021년 이전)에서 무거울 수 있음. 필요 시 `@supports`로 분기.

---

## 파일 구조

| 경로 | 역할 |
|------|------|
| `src/presentation/components/feed/swipe-card-deck.tsx` | **신규** — 카드 스택 + 드래그 로직 전체 |
| `src/presentation/components/feed/run-feed.tsx` | **수정** — `PhotoGrid` export 유지(하위호환), `SwipeCardDeck` 추가 export |
| `src/presentation/components/home/home-feed.tsx` | **수정** — `PhotoGrid` → `SwipeCardDeck` 교체 |

---

## Task 1: GSAP 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: GSAP 패키지 설치**

```bash
cd /Users/duvis/DuvisProject/newDailyMindfulRunningApp
npm install gsap
```

Expected output: `added 1 package` (gsap ~3.12.x)

- [ ] **Step 2: 타입 확인**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Expected: 에러 없음 (GSAP는 자체 타입 포함)

- [ ] **Step 3: 커밋**

```bash
git add package.json package-lock.json
git commit -m "chore: install gsap for swipe card animation"
```

---

## Task 2: SwipeCardDeck 컴포넌트 생성

**Files:**
- Create: `src/presentation/components/feed/swipe-card-deck.tsx`

이 컴포넌트는 `PhotoGrid`와 동일한 props를 받아서 완전히 대체된다.

- [ ] **Step 1: 파일 생성**

```typescript
// src/presentation/components/feed/swipe-card-deck.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { DetailSheet } from './detail-sheet'
import { AvatarImage } from '../shared/avatar-image'
import type { RunLog } from '@/domain/entities/run-log'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const PAGE_LIMIT = 20

// 카드 인덱스 fromTop(0=맨 위)에 따른 스택 위치
const STACK_ROTATIONS = [0, 2.8, -2.2, 3.5, -1.8]

function getPos(fromTop: number) {
  return {
    y: fromTop * 11,
    x: 0,
    rotation: STACK_ROTATIONS[fromTop] ?? 2,
    scale: 1 - fromTop * 0.05,
    zIndex: 60 - fromTop,
    opacity: fromTop <= 3 ? 1 : 0,
  }
}

const GRADIENTS = [
  'linear-gradient(150deg,#0d0d30 0%,#e94560 100%)',
  'linear-gradient(150deg,#091c10 0%,#00b09b 100%)',
  'linear-gradient(150deg,#101624 0%,#4286f4 100%)',
  'linear-gradient(150deg,#1c0824 0%,#f09433 100%)',
  'linear-gradient(150deg,#071c1a 0%,#71b280 100%)',
  'linear-gradient(150deg,#2c0c18 0%,#cc2366 100%)',
  'linear-gradient(150deg,#1a1a2e 0%,#6a3093 100%)',
  'linear-gradient(150deg,#0f2027 0%,#2c5364 100%)',
]

function getGradient(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i)
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]!
}

function RunCard({
  run, cardRef, onClick,
}: {
  run: RunLog
  cardRef: React.RefObject<HTMLDivElement>
  onClick: () => void
}) {
  const bg = run.photoUrl
    ? { backgroundImage: `url(${run.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: getGradient(run.memberId) }

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      style={{
        position: 'absolute',
        width: '100%', height: '100%',
        borderRadius: 26,
        overflow: 'hidden',
        cursor: 'grab',
        userSelect: 'none',
        willChange: 'transform',      // ⚠️ GPU 레이어 확보 — 제거 금지
        transformOrigin: '50% 110%',
        // ⚠️ touch-action: none — iOS Safari 스크롤 충돌 방지. 제거하면 스와이프 안 됨
        touchAction: 'none',
        overscrollBehavior: 'none',   // ⚠️ 당겨서-새로고침 방지
        boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 8px 20px rgba(0,0,0,0.35)',
      }}
    >
      {/* 배경 */}
      <div style={{ position: 'absolute', inset: 0, ...bg }} />
      {/* 그라디언트 오버레이 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, transparent 0%, transparent 35%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.82) 100%)',
      }} />
      {/* 상단 광택 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.06), transparent)',
        borderRadius: '26px 26px 0 0',
        pointerEvents: 'none',
      }} />

      {/* 컨텐츠 */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 16 }}>
        {/* 상단: 날짜 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{
            background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 20, padding: '4px 10px',
            fontFamily: FONT, fontSize: '0.52rem', fontWeight: 600,
            color: 'rgba(255,255,255,0.80)',
          }}>
            {run.date}
          </div>
        </div>

        {/* 중앙: 달린 시간 링 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!run.photoUrl && (
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.15)',
              background: 'rgba(0,0,0,0.20)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: FONT, fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-2px', lineHeight: 1 }}>
                {run.durationMin}
              </span>
              <span style={{ fontFamily: FONT, fontSize: '0.6rem', color: 'rgba(255,255,255,0.55)' }}>분</span>
            </div>
          )}
        </div>

        {/* 하단: 러너 정보 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <AvatarImage name={run.memberName} avatarUrl={run.memberAvatarUrl} size={24} bg="rgba(255,255,255,0.2)" color="#fff" />
            <span style={{ fontFamily: FONT, fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.80)' }}>
              {run.memberName}
            </span>
          </div>
          {run.title && (
            <div style={{
              fontFamily: FONT, fontSize: '0.94rem', fontWeight: 700,
              color: '#fff', lineHeight: 1.3, letterSpacing: '-0.3px',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {run.title}
            </div>
          )}
          <div style={{ display: 'flex', gap: 5 }}>
            {[`⏱ ${run.durationMin}분`].map(chip => (
              <div key={chip} style={{
                background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, padding: '3px 8px',
                fontFamily: FONT, fontSize: '0.52rem', fontWeight: 600, color: 'rgba(255,255,255,0.60)',
              }}>
                {chip}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LIKE / SKIP 배지 */}
      <div className="badge-like" style={{
        position: 'absolute', top: 22, left: 18,
        padding: '5px 12px', borderRadius: 7,
        fontSize: '0.8rem', fontWeight: 800, letterSpacing: 2,
        color: '#4ade80', border: '2.5px solid #4ade80',
        transform: 'rotate(-22deg)', opacity: 0, pointerEvents: 'none',
      }}>LIKE</div>
      <div className="badge-skip" style={{
        position: 'absolute', top: 22, right: 18,
        padding: '5px 12px', borderRadius: 7,
        fontSize: '0.8rem', fontWeight: 800, letterSpacing: 2,
        color: '#f87171', border: '2.5px solid #f87171',
        transform: 'rotate(22deg)', opacity: 0, pointerEvents: 'none',
      }}>SKIP</div>
    </div>
  )
}

type Props = {
  runs: RunLog[]
  memberId?: string
  triggerRun?: RunLog | null
  onTriggerConsumed?: () => void
  initialOffset?: number
}

export function SwipeCardDeck({ runs: initialRuns, memberId, triggerRun, onTriggerConsumed, initialOffset = PAGE_LIMIT }: Props) {
  const [runs, setRuns] = useState<RunLog[]>(initialRuns)
  const [offset, setOffset] = useState(initialOffset)
  const [hasMore, setHasMore] = useState(initialRuns.length >= PAGE_LIMIT)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<RunLog | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)

  // triggerRun 지원 (크루 원형 클릭 시 해당 카드 열기)
  useEffect(() => {
    if (!triggerRun) return
    setSelected(triggerRun)
    onTriggerConsumed?.()
  }, [triggerRun])

  // 카드 ref 배열 (최대 DECK_SIZE개 슬롯 고정)
  const DECK_SIZE = 5
  const cardRefs = useRef<(React.RefObject<HTMLDivElement>)[]>(
    Array.from({ length: DECK_SIZE }, () => ({ current: null } as React.RefObject<HTMLDivElement>))
  )
  const deckRef = useRef<HTMLDivElement>(null)

  // order: order[last] = 맨 위 카드 인덱스 (0-based, runs 배열 인덱스)
  const orderRef = useRef<number[]>([])
  const currentIdxRef = useRef(0)

  // 무한스크롤 — 카드 2장 남으면 fetch
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const res = await fetch(`/api/runs?offset=${offset}&limit=${PAGE_LIMIT}`)
      const json = await res.json() as { runs: RunLog[]; hasMore: boolean }
      setRuns(prev => [...prev, ...json.runs])
      setOffset(prev => prev + json.runs.length)
      setHasMore(json.hasMore)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [loading, hasMore, offset])

  // 스택 초기화 및 카드 덱 GSAP 설정
  useEffect(() => {
    const visibleCount = Math.min(runs.length, DECK_SIZE)
    if (visibleCount === 0) return

    // order 초기화: [0,1,2,3,4] 중 마지막이 top
    orderRef.current = Array.from({ length: visibleCount }, (_, i) => i)

    // 초기 위치 세팅
    orderRef.current.forEach((runIdx, orderPos) => {
      const fromTop = visibleCount - 1 - orderPos
      const el = cardRefs.current[runIdx]?.current
      if (el) {
        gsap.set(el, getPos(fromTop))
        el.style.pointerEvents = fromTop === 0 ? 'auto' : 'none'
      }
    })
  }, []) // 초기 1회만

  // ── 드래그 상태 (ref — 리렌더 불필요)
  const drag = useRef({ active: false, sx: 0, sy: 0, velX: 0, px: 0, pt: 0 })

  const applyStack = useCallback((skipEl: HTMLDivElement | null = null, animate = true) => {
    const order = orderRef.current
    const topIdx = order.length - 1
    order.forEach((runIdx, orderPos) => {
      const el = cardRefs.current[runIdx]?.current
      if (!el || el === skipEl) return
      const fromTop = topIdx - orderPos
      const pos = getPos(fromTop)
      el.style.pointerEvents = fromTop === 0 ? 'auto' : 'none'
      if (animate) {
        gsap.to(el, { ...pos, duration: 0.5, ease: 'back.out(1.6)', overwrite: 'auto' })
      } else {
        gsap.set(el, pos)
      }
    })
  }, [])

  const getTopEl = useCallback(() => {
    const order = orderRef.current
    const runIdx = order[order.length - 1]
    return runIdx !== undefined ? cardRefs.current[runIdx]?.current ?? null : null
  }, [])

  const throwCard = useCallback((dir: 1 | -1) => {
    const topEl = getTopEl()
    if (!topEl) return

    // 뒤 카드들 앞으로
    const order = orderRef.current
    const topIdx = order.length - 1
    order.forEach((runIdx, orderPos) => {
      const el = cardRefs.current[runIdx]?.current
      if (!el || el === topEl) return
      const fromTop = topIdx - orderPos
      gsap.to(el, { ...getPos(fromTop - 1), duration: 0.45, ease: 'back.out(1.4)', overwrite: 'auto' })
    })

    gsap.to(topEl, {
      x: dir * 580, y: 80, rotation: dir * 38, opacity: 0,
      duration: 0.4, ease: 'power2.in',
      onComplete: () => {
        // 맨 위 카드를 맨 아래로 순환
        const gone = orderRef.current.pop()!
        orderRef.current.unshift(gone)
        const el = cardRefs.current[gone]?.current
        if (el) gsap.set(el, getPos(orderRef.current.length - 1))

        applyStack(null, true)

        const newIdx = (currentIdxRef.current + 1) % Math.min(runs.length, DECK_SIZE)
        currentIdxRef.current = newIdx
        setCurrentIdx(newIdx)

        // 카드 2장 남으면 더 로드
        if (hasMore && orderRef.current.length <= 2) loadMore()
      },
    })
  }, [getTopEl, applyStack, runs.length, hasMore, loadMore])

  // ── 터치/마우스 이벤트 — useEffect로 직접 등록 (passive:false 필요)
  useEffect(() => {
    const deckEl = deckRef.current
    if (!deckEl) return

    function onStart(x: number, y: number) {
      const topEl = getTopEl()
      if (!topEl) return
      gsap.killTweensOf(topEl)
      drag.current = { active: true, sx: x, sy: y, velX: 0, px: x, pt: Date.now() }
    }

    function onMove(x: number, y: number) {
      if (!drag.current.active) return
      const d = drag.current
      const dx = x - d.sx, dy = y - d.sy
      const now = Date.now(), dt = now - d.pt
      if (dt > 0) d.velX = (x - d.px) / dt
      d.px = x; d.pt = now

      const topEl = getTopEl()
      if (!topEl) return
      gsap.set(topEl, { x: dx, y: dy, rotation: dx * 0.07 })

      // LIKE / SKIP 배지
      const likeB = topEl.querySelector<HTMLElement>('.badge-like')
      const skipB = topEl.querySelector<HTMLElement>('.badge-skip')
      const t = 40
      if (likeB && skipB) {
        if (dx > t)       { likeB.style.opacity = String(Math.min((dx - t) / 70, 1)); skipB.style.opacity = '0' }
        else if (dx < -t) { skipB.style.opacity = String(Math.min((-dx - t) / 70, 1)); likeB.style.opacity = '0' }
        else              { likeB.style.opacity = '0'; skipB.style.opacity = '0' }
      }

      // 뒤 카드 peek
      const prog = Math.min(Math.abs(dx) / 110, 1)
      const order = orderRef.current
      const topIdx = order.length - 1
      order.forEach((runIdx, orderPos) => {
        const el = cardRefs.current[runIdx]?.current
        if (!el || el === topEl) return
        const fromTop = topIdx - orderPos
        const cur = getPos(fromTop), nxt = getPos(fromTop - 1)
        gsap.set(el, {
          y: gsap.utils.interpolate(cur.y, nxt.y, prog),
          scale: gsap.utils.interpolate(cur.scale, nxt.scale, prog),
          rotation: gsap.utils.interpolate(cur.rotation, nxt.rotation, prog),
          opacity: gsap.utils.interpolate(cur.opacity, nxt.opacity, prog),
        })
      })
    }

    function onEnd(x: number) {
      if (!drag.current.active) return
      drag.current.active = false
      const dx = x - drag.current.sx
      const topEl = getTopEl()
      if (!topEl) return

      const likeB = topEl.querySelector<HTMLElement>('.badge-like')
      const skipB = topEl.querySelector<HTMLElement>('.badge-skip')
      if (likeB) likeB.style.opacity = '0'
      if (skipB) skipB.style.opacity = '0'

      const shouldThrow = Math.abs(dx) > 85 || Math.abs(drag.current.velX) > 0.33
      if (shouldThrow) {
        throwCard((dx >= 0 ? 1 : -1) as 1 | -1)
      } else {
        // 스프링 스냅백
        gsap.to(topEl, { x: 0, y: 0, rotation: 0, duration: 0.65, ease: 'elastic.out(1,0.62)', overwrite: 'auto' })
        applyStack(topEl, true)
      }
    }

    // ── Mouse
    function onMouseDown(e: MouseEvent) {
      if ((e.target as HTMLElement).closest('.run-card-el') === getTopEl()) {
        onStart(e.clientX, e.clientY)
      }
    }
    function onMouseMove(e: MouseEvent) { onMove(e.clientX, e.clientY) }
    function onMouseUp(e: MouseEvent) { onEnd(e.clientX) }

    // ── Touch (⚠️ passive:false — JSX prop으로 불가, 직접 등록 필수)
    function onTouchStart(e: TouchEvent) {
      if ((e.target as HTMLElement).closest('.run-card-el') === getTopEl()) {
        e.preventDefault()
        onStart(e.touches[0]!.clientX, e.touches[0]!.clientY)
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (drag.current.active) {
        e.preventDefault() // ⚠️ passive:false 아니면 이 호출 무시됨
        onMove(e.touches[0]!.clientX, e.touches[0]!.clientY)
      }
    }
    function onTouchEnd(e: TouchEvent) { onEnd(e.changedTouches[0]!.clientX) }

    deckEl.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    deckEl.addEventListener('touchstart', onTouchStart, { passive: false }) // ⚠️
    document.addEventListener('touchmove', onTouchMove, { passive: false }) // ⚠️
    document.addEventListener('touchend', onTouchEnd)

    return () => {
      deckEl.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      deckEl.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [getTopEl, applyStack, throwCard])

  const visibleRuns = runs.slice(0, DECK_SIZE)
  const totalVisible = visibleRuns.length

  return (
    <>
      {totalVisible === 0 ? (
        <p style={{ textAlign: 'center', color: '#888', padding: '40px 0', fontSize: '0.875rem' }}>
          최근 달리기 기록이 없습니다
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0 16px' }}>
          {/* 카드 덱 */}
          <div
            ref={deckRef}
            style={{ position: 'relative', width: 310, height: 388, flexShrink: 0 }}
          >
            {visibleRuns.map((run, i) => (
              <RunCard
                key={run.id}
                run={run}
                cardRef={cardRefs.current[i]! as React.RefObject<HTMLDivElement>}
                onClick={() => setSelected(run)}
              />
            ))}
          </div>

          {/* 도트 인디케이터 */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 14 }}>
            {visibleRuns.map((_, i) => (
              <div key={i} style={{
                width: i === currentIdx ? 20 : 5,
                height: 5, borderRadius: 4,
                background: i === currentIdx ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.18)',
                transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                flexShrink: 0,
              }} />
            ))}
            <span style={{
              fontFamily: FONT, fontSize: '0.52rem',
              color: 'rgba(255,255,255,0.22)', marginLeft: 6,
            }}>
              {currentIdx + 1} / {totalVisible}{hasMore ? '+' : ''}
            </span>
          </div>

          {loading && (
            <div style={{ marginTop: 8, fontSize: '0.65rem', color: '#666' }}>불러오는 중...</div>
          )}
        </div>
      )}

      {selected && (
        <DetailSheet run={selected} open={Boolean(selected)} onClose={() => setSelected(null)} memberId={memberId} />
      )}
    </>
  )
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
cd /Users/duvis/DuvisProject/newDailyMindfulRunningApp
npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음 또는 `swipe-card-deck.tsx`와 무관한 기존 에러만

- [ ] **Step 3: 커밋**

```bash
git add src/presentation/components/feed/swipe-card-deck.tsx
git commit -m "feat: add SwipeCardDeck component with GSAP spring physics"
```

---

## Task 3: run-feed.tsx에 SwipeCardDeck re-export 추가

**Files:**
- Modify: `src/presentation/components/feed/run-feed.tsx`

`PhotoGrid`는 그대로 두고 `SwipeCardDeck`을 re-export해서 import 경로를 통일한다.

- [ ] **Step 1: run-feed.tsx 끝에 re-export 추가**

파일 맨 끝에 한 줄 추가:

```typescript
export { SwipeCardDeck } from './swipe-card-deck'
```

- [ ] **Step 2: 빌드 확인**

```bash
npx tsc --noEmit 2>&1 | tail -5
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/presentation/components/feed/run-feed.tsx
git commit -m "feat: re-export SwipeCardDeck from run-feed"
```

---

## Task 4: home-feed.tsx에서 PhotoGrid → SwipeCardDeck 교체

**Files:**
- Modify: `src/presentation/components/home/home-feed.tsx`

- [ ] **Step 1: import 교체**

현재 (`home-feed.tsx` 4번째 줄):
```typescript
import { RunFeed, PhotoGrid } from '../feed/run-feed'
```

변경 후:
```typescript
import { RunFeed, SwipeCardDeck } from '../feed/run-feed'
```

- [ ] **Step 2: JSX에서 PhotoGrid → SwipeCardDeck 교체**

현재 (`home-feed.tsx` 290~298번째 줄 부근):
```tsx
{tab === 'all' ? (
  <PhotoGrid
    runs={recentRuns}
    memberId={memberId}
    triggerRun={triggerRun}
    onTriggerConsumed={() => setTriggerRun(null)}
    initialOffset={initialOffset}
  />
) : (
```

변경 후:
```tsx
{tab === 'all' ? (
  <SwipeCardDeck
    runs={recentRuns}
    memberId={memberId}
    triggerRun={triggerRun}
    onTriggerConsumed={() => setTriggerRun(null)}
    initialOffset={initialOffset}
  />
) : (
```

- [ ] **Step 3: 빌드 확인**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/presentation/components/home/home-feed.tsx
git commit -m "feat: replace PhotoGrid with SwipeCardDeck in home feed"
```

---

## Task 5: 개발 서버에서 동작 검증

**검증 항목:**

- [ ] **Step 1: 개발 서버 시작**

```bash
cd /Users/duvis/DuvisProject/newDailyMindfulRunningApp
npm run dev
```

- [ ] **Step 2: 브라우저에서 확인 (데스크탑)**

http://localhost:3000/home 접속 후:
- 홈 피드 `전체 피드` 탭에 카드 스택이 보이는지 확인
- 마우스 드래그로 카드 스와이프되는지 확인
- snap-back 시 elastic bounce 확인
- 카드 날아갈 때 뒤 카드가 앞으로 나오는지 확인
- 도트 인디케이터 업데이트 확인
- 크루 원형 클릭 시 DetailSheet 열리는지 확인

- [ ] **Step 3: 모바일 디바이스 확인 (iOS Safari / Android Chrome)**

같은 Wi-Fi에서 `http://<로컬IP>:3000/home` 접속:

체크리스트:
- [ ] 카드 스와이프가 페이지 스크롤 없이 작동하는가 (`touch-action: none` 효과)
- [ ] 스와이프 도중 iOS 고무줄 효과 없는가 (`overscroll-behavior: none` 효과)
- [ ] 애니메이션이 60fps로 부드러운가 (`will-change: transform` 효과)
- [ ] LIKE / SKIP 배지가 드래그 방향에 맞게 나타나는가
- [ ] `내 기록` 탭은 기존 RunFeed 그대로인가

- [ ] **Step 4: 최종 커밋**

모든 항목 통과 시:

```bash
git add -A
git commit -m "feat: swipe card deck — mobile verified"
```

---

## 주의사항 요약 (구현 중 반드시 확인)

| 항목 | 위치 | 잘못되면 |
|------|------|---------|
| `touchAction: 'none'` | RunCard 스타일 | iOS에서 스와이프 안 되고 페이지 스크롤만 됨 |
| `addEventListener(..., { passive: false })` | useEffect | `e.preventDefault()` 무시돼 스크롤 충돌 |
| `overscrollBehavior: 'none'` | 카드 덱 컨테이너 | iOS 당겨서-새로고침 발동 |
| `willChange: 'transform'` | RunCard 스타일 | 저사양 Android에서 애니메이션 끊김 |
| `WebkitBackdropFilter` | 유리 효과 스타일 | iOS Safari에서 유리 효과 미적용 |
| `gsap.killTweensOf(topEl)` | dragStart | 진행 중 애니메이션 안 끊으면 위치 점프 |
