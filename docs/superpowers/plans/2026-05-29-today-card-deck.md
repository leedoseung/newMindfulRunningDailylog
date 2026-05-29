# Today Card Deck (Flip) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 화면 크루 스트립과 탭 전환기 사이에 "오늘의 달리기" 카드 덱을 추가한다. 오늘 달린 기록만 카드로 표시하고, 탭하면 달리기 전/중/후 생각이 보이도록 3D 플립 인터랙션을 적용한다. 기존 PhotoGrid/RunFeed 탭 피드는 그대로 유지한다.

**Architecture:** 새 `TodayCardDeck` 클라이언트 컴포넌트를 만들고 `home-feed.tsx`의 크루 스트립 아래, 탭 전환기 위에 삽입한다. 오늘 날짜(`YYYY-MM-DD`)로 필터링한 runs를 props로 받는다. GSAP `rotationY` 애니메이션으로 카드 앞/뒷면을 전환하고, 수평 드래그로 카드를 넘긴다.

**Tech Stack:** Next.js 14 App Router, React, GSAP 3 (이미 설치됨), TypeScript

**최종 디자인 참고:** `/Users/duvis/.gstack/projects/leedoseung-newMindfulRunningDailylog/designs/swipe-feed-20260528/mockup-v4-flip.html`

**⚠️ 모바일 주의사항:**
1. `touchAction: 'none'` — 카드 요소에 적용, iOS Safari 스크롤 충돌 방지
2. `addEventListener(..., { passive: false })` — useEffect 내 직접 등록 필수 (JSX onTouchMove 불가)
3. `willChange: 'transform'` — GPU 레이어 확보
4. `WebkitBackdropFilter` — iOS Safari backdrop-filter prefix 필요
5. `transformStyle: 'preserve-3d'` + `backfaceVisibility: 'hidden'` — 카드 플립 3D 설정

---

## 파일 구조

| 경로 | 역할 |
|------|------|
| `src/presentation/components/feed/today-card-deck.tsx` | **신규** — 오늘 카드 덱 전체 (스택 + 드래그 + 플립) |
| `src/presentation/components/home/home-feed.tsx` | **수정** — TodayCardDeck import 및 크루~탭 사이 삽입 |

---

## Task 1: TodayCardDeck 컴포넌트 생성

**Files:**
- Create: `src/presentation/components/feed/today-card-deck.tsx`

- [ ] **Step 1: 파일 생성**

```typescript
// src/presentation/components/feed/today-card-deck.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { DetailSheet } from './detail-sheet'
import { AvatarImage } from '../shared/avatar-image'
import type { RunLog } from '@/domain/entities/run-log'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

const GRADIENTS = [
  ['#0d0d30', '#e94560'],
  ['#091c10', '#00b09b'],
  ['#101624', '#4286f4'],
  ['#1c0824', '#f09433'],
  ['#071c1a', '#71b280'],
  ['#2c0c18', '#cc2366'],
  ['#1a1a2e', '#6a3093'],
  ['#0f2027', '#2c5364'],
]

function getGradient(id: string): [string, string] {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i)
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]!
}

// 카드 스택 위치 설정 (fromTop: 0=맨 위)
const STACK_ROTATIONS = [0, 2.5, -2, 3, -1.5]
function getStackPos(fromTop: number) {
  return {
    y: fromTop * 8,
    x: 0,
    rotation: STACK_ROTATIONS[fromTop] ?? 2,
    scale: 1 - fromTop * 0.04,
    zIndex: 50 - fromTop,
    opacity: fromTop <= 3 ? 1 : 0,
  }
}

type Props = {
  todayRuns: RunLog[]
  memberId?: string
}

export function TodayCardDeck({ todayRuns, memberId }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<RunLog | null>(null)

  const deckRef = useRef<HTMLDivElement>(null)
  // 각 카드의 DOM ref — runs 수만큼
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const orderRef = useRef<number[]>([])
  const isFlippedRef = useRef(false)
  const drag = useRef({ active: false, sx: 0, sy: 0, vx: 0, px: 0, pt: 0, moved: false })

  const runs = todayRuns.slice(0, 8) // 최대 8장

  // ── 스택 초기화 ───────────────────────────────────────────────────────────
  useEffect(() => {
    const count = runs.length
    if (count === 0) return
    orderRef.current = [...Array(count).keys()] // [0,1,...,n-1], 마지막이 top

    orderRef.current.forEach((runIdx, orderPos) => {
      const el = cardRefs.current[runIdx]
      if (!el) return
      const fromTop = count - 1 - orderPos
      gsap.set(el, { ...getStackPos(fromTop), transformPerspective: 1200, rotationY: 0 })
      el.style.pointerEvents = fromTop === 0 ? 'auto' : 'none'
    })
  }, [runs.length])

  // ── 헬퍼 ─────────────────────────────────────────────────────────────────
  function topEl() {
    const idx = orderRef.current[orderRef.current.length - 1]
    return idx !== undefined ? cardRefs.current[idx] ?? null : null
  }

  function applyStack(skipEl: HTMLDivElement | null = null, animate = true) {
    const order = orderRef.current
    const topIdx = order.length - 1
    order.forEach((runIdx, orderPos) => {
      const el = cardRefs.current[runIdx]
      if (!el || el === skipEl) return
      const fromTop = topIdx - orderPos
      el.style.pointerEvents = fromTop === 0 ? 'auto' : 'none'
      const pos = getStackPos(fromTop)
      if (animate) gsap.to(el, { ...pos, duration: 0.45, ease: 'back.out(1.7)', overwrite: 'auto' })
      else gsap.set(el, pos)
    })
  }

  // ── 플립 ─────────────────────────────────────────────────────────────────
  function flipCard() {
    const top = topEl()
    if (!top) return
    if (!isFlippedRef.current) {
      gsap.to(top, { rotationY: 180, duration: 0.5, ease: 'power2.inOut' })
      isFlippedRef.current = true
    } else {
      gsap.to(top, { rotationY: 0, duration: 0.45, ease: 'power2.inOut' })
      isFlippedRef.current = false
    }
  }

  // ── 카드 넘기기 ───────────────────────────────────────────────────────────
  function throwCard(dir: 1 | -1) {
    const top = topEl()
    if (!top) return
    const order = orderRef.current
    const topIdx = order.length - 1

    // 뒤 카드들 앞으로
    order.forEach((runIdx, orderPos) => {
      const el = cardRefs.current[runIdx]
      if (!el || el === top) return
      const fromTop = topIdx - orderPos
      gsap.to(el, { ...getStackPos(fromTop - 1), duration: 0.4, ease: 'back.out(1.4)', overwrite: 'auto' })
    })

    gsap.to(top, {
      x: dir * 520, y: 50, rotation: dir * 35, opacity: 0,
      duration: 0.38, ease: 'power2.in',
      onComplete: () => {
        const gone = orderRef.current.pop()!
        orderRef.current.unshift(gone)
        const el = cardRefs.current[gone]
        if (el) {
          gsap.set(el, { ...getStackPos(orderRef.current.length - 1), rotationY: 0 })
        }
        isFlippedRef.current = false
        applyStack(null, true)
        setCurrentIdx(prev => (prev + 1) % runs.length)
      },
    })
  }

  // ── 터치/마우스 이벤트 (useEffect로 직접 등록 — passive:false 필수) ──────
  useEffect(() => {
    const deckEl = deckRef.current
    if (!deckEl || runs.length === 0) return

    function onStart(x: number, y: number) {
      if (!isFlippedRef.current) gsap.killTweensOf(topEl())
      drag.current = { active: true, sx: x, sy: y, vx: 0, px: x, pt: Date.now(), moved: false }
    }

    function onMove(x: number, y: number) {
      if (!drag.current.active) return
      if (isFlippedRef.current) return // 뒤집혀 있을 땐 이동 없음
      const dx = x - drag.current.sx, dy = y - drag.current.sy
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) drag.current.moved = true
      const now = Date.now(), dt = now - drag.current.pt
      if (dt > 0) drag.current.vx = (x - drag.current.px) / dt
      drag.current.px = x; drag.current.pt = now
      if (!drag.current.moved) return

      const top = topEl(); if (!top) return
      gsap.set(top, { x: dx, y: dy, rotation: dx * 0.07 })

      const prog = Math.min(Math.abs(dx) / 100, 1)
      const order = orderRef.current
      const topIdx = order.length - 1
      order.forEach((runIdx, orderPos) => {
        const el = cardRefs.current[runIdx]
        if (!el || el === top) return
        const fromTop = topIdx - orderPos
        const cur = getStackPos(fromTop), nxt = getStackPos(fromTop - 1)
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
      const moved = drag.current.moved
      drag.current.active = false

      if (!moved) { flipCard(); return } // 탭 → 뒤집기 (앞/뒤 모두)

      const dx = x - drag.current.sx
      const top = topEl(); if (!top) return
      const shouldThrow = Math.abs(dx) > 75 || Math.abs(drag.current.vx) > 0.3

      if (shouldThrow) {
        throwCard((dx >= 0 ? 1 : -1) as 1 | -1)
      } else {
        gsap.to(top, { x: 0, y: 0, rotation: 0, duration: 0.65, ease: 'elastic.out(1,0.62)', overwrite: 'auto' })
        applyStack(top, true)
      }
    }

    function onMouseDown(e: MouseEvent) {
      if ((e.target as HTMLElement).closest('.tcd-card') === topEl()) onStart(e.clientX, e.clientY)
    }
    function onMouseMove(e: MouseEvent) { onMove(e.clientX, e.clientY) }
    function onMouseUp(e: MouseEvent) { onEnd(e.clientX) }

    // ⚠️ passive:false — iOS Safari e.preventDefault() 작동에 필수
    function onTouchStart(e: TouchEvent) {
      if ((e.target as HTMLElement).closest('.tcd-card') === topEl()) {
        e.preventDefault()
        onStart(e.touches[0]!.clientX, e.touches[0]!.clientY)
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (drag.current.active) { e.preventDefault(); onMove(e.touches[0]!.clientX, e.touches[0]!.clientY) }
    }
    function onTouchEnd(e: TouchEvent) { onEnd(e.changedTouches[0]!.clientX) }

    deckEl.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    deckEl.addEventListener('touchstart', onTouchStart, { passive: false })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)

    return () => {
      deckEl.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      deckEl.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [runs.length])

  if (runs.length === 0) return null

  return (
    <>
      {/* 섹션 레이블 */}
      <div style={{ padding: '0 22px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: FONT, fontSize: '0.48rem', fontWeight: 500, color: '#bbb', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
          오늘의 달리기
        </div>
        <div style={{ fontFamily: FONT, fontSize: '0.48rem', fontWeight: 500, color: '#ccc', background: 'rgba(0,0,0,0.05)', borderRadius: 8, padding: '2px 8px' }}>
          탭하면 일기 보기
        </div>
      </div>

      {/* 카드 덱 */}
      <div
        ref={deckRef}
        style={{ position: 'relative', height: 188, margin: '0 16px', perspective: 1200 }}
      >
        {runs.map((run, i) => {
          const [c1, c2] = getGradient(run.memberId)
          return (
            <div
              key={run.id}
              className="tcd-card"
              ref={el => { cardRefs.current[i] = el }}
              style={{
                position: 'absolute', inset: 0,
                borderRadius: 20,
                cursor: 'pointer',
                userSelect: 'none',
                willChange: 'transform',       // ⚠️ GPU 레이어
                touchAction: 'none',           // ⚠️ iOS 스크롤 충돌 방지
                transformStyle: 'preserve-3d', // ⚠️ 3D 플립 필수
              }}
            >
              {/* 앞면 */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden',
                backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
                boxShadow: '0 8px 28px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
              }}>
                {/* 배경 사진 */}
                {run.photoUrl && (
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${run.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                )}
                {/* 오버레이 */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 100%)' }} />
                {/* 광택 */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '42%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.07), transparent)', borderRadius: '20px 20px 0 0', pointerEvents: 'none' }} />
                {/* 플립 힌트 */}
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10,
                  padding: '3px 8px', fontFamily: FONT, fontSize: '0.48rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)',
                }}>
                  일기 보기 ↗
                </div>
                {/* 컨텐츠 */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: '14px 16px', gap: 12 }}>
                  {/* 달린 시간 링 */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 14, padding: '8px 12px',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: FONT, fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{run.durationMin}</span>
                    <span style={{ fontFamily: FONT, fontSize: '0.55rem', color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>분</span>
                  </div>
                  {/* 러너 정보 */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AvatarImage name={run.memberName} avatarUrl={run.memberAvatarUrl} size={20} bg="rgba(255,255,255,0.2)" color="#fff" />
                      <span style={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{run.memberName}</span>
                    </div>
                    {run.title && (
                      <div style={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 700, color: '#fff', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {run.title}
                      </div>
                    )}
                    <div style={{ fontFamily: FONT, fontSize: '0.5rem', color: 'rgba(255,255,255,0.45)' }}>{run.date}</div>
                  </div>
                </div>
              </div>

              {/* 뒷면 — 달리기 전/중/후 일기 */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden',
                backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
                boxShadow: '0 8px 28px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)',
              }}>
                {/* 광택 */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.07), transparent)', borderRadius: '20px 20px 0 0', pointerEvents: 'none' }} />
                {/* 뒷면 컨텐츠 */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px' }}>
                  {/* 헤더 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AvatarImage name={run.memberName} avatarUrl={run.memberAvatarUrl} size={20} bg="rgba(255,255,255,0.2)" color="#fff" />
                      <span style={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 700, color: '#fff' }}>{run.memberName}</span>
                    </div>
                    <span style={{ fontFamily: FONT, fontSize: '0.48rem', color: 'rgba(255,255,255,0.4)' }}>{run.date} · {run.durationMin}분</span>
                  </div>
                  {/* 생각 3줄 */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {[
                      { label: '달리기 전', text: run.thoughtBefore, icon: '🌅' },
                      { label: '달리기 중', text: run.thoughtDuring, icon: '🏃' },
                      { label: '달리기 후', text: run.thoughtAfter,  icon: '✨' },
                    ].map((row, ri, arr) => (
                      <div key={row.label} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        padding: '7px 0',
                        borderBottom: ri < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                      }}>
                        <div style={{ width: 22, height: 22, borderRadius: 8, background: 'rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                          {row.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: FONT, fontSize: '0.43rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 2 }}>
                            {row.label}
                          </div>
                          <div style={{ fontFamily: FONT, fontSize: '0.65rem', fontWeight: 500, color: 'rgba(255,255,255,0.88)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {row.text || '—'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', fontFamily: FONT, fontSize: '0.45rem', color: 'rgba(255,255,255,0.22)', letterSpacing: '1px', marginTop: 4 }}>
                    탭하면 닫힘
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 도트 인디케이터 */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 4 }}>
        {runs.map((_, i) => (
          <div key={i} style={{
            width: i === currentIdx ? 18 : 4,
            height: 4, borderRadius: 3,
            background: i === currentIdx ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.12)',
            transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            flexShrink: 0,
          }} />
        ))}
      </div>

      {selected && (
        <DetailSheet run={selected} open memberId={memberId} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
```

- [ ] **Step 2: TypeScript 확인**

```bash
cd /Users/duvis/DuvisProject/newDailyMindfulRunningApp
npx tsc --noEmit 2>&1 | grep "today-card-deck" | head -10
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/presentation/components/feed/today-card-deck.tsx
git commit -m "feat: add TodayCardDeck component with 3D flip interaction"
```

---

## Task 2: home-feed.tsx에 TodayCardDeck 삽입

**Files:**
- Modify: `src/presentation/components/home/home-feed.tsx`

크루 스트립 아래, 탭 전환기 위에 `TodayCardDeck`을 추가한다. `recentRuns`에서 오늘 날짜를 필터링해 `todayRuns`를 만들어 전달한다.

- [ ] **Step 1: import 추가**

`home-feed.tsx` 상단 import 블록에 추가:

```typescript
import { TodayCardDeck } from '../feed/today-card-deck'
```

- [ ] **Step 2: todayRuns 계산 추가**

`HomeFeed` 함수 내부, `useMemo` 블록들 아래에 추가:

```typescript
const todayStr = new Date().toISOString().split('T')[0]!
const todayRuns = recentRuns.filter(r => r.date === todayStr)
```

- [ ] **Step 3: JSX에 TodayCardDeck 삽입**

현재 `home-feed.tsx`에서 탭 전환기 바로 위(`Tab switcher` 주석 위)를 찾아 아래 코드를 삽입:

```tsx
{/* 오늘의 달리기 카드 덱 */}
{todayRuns.length > 0 && (
  <>
    <TodayCardDeck todayRuns={todayRuns} memberId={memberId} />
    <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '12px 22px 0' }} />
  </>
)}
```

- [ ] **Step 4: 빌드 확인**

```bash
npx tsc --noEmit 2>&1 | tail -5
```

Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add src/presentation/components/home/home-feed.tsx
git commit -m "feat: insert TodayCardDeck between crew strip and tab switcher"
```

---

## Task 3: 동작 검증

- [ ] **Step 1: 개발 서버 시작**

```bash
cd /Users/duvis/DuvisProject/newDailyMindfulRunningApp
npm run dev
```

- [ ] **Step 2: 브라우저 확인**

http://localhost:3000/home 접속 후:

- [ ] 오늘 달린 기록이 있을 때 "오늘의 달리기" 섹션 표시되는지 확인
- [ ] 카드 탭 → 3D 플립 애니메이션으로 뒷면(달리기 전/중/후) 표시 확인
- [ ] 뒷면에서 다시 탭 → 앞면으로 복귀 확인
- [ ] 카드 드래그 → 스와이프로 다음 카드 전환 확인
- [ ] 도트 인디케이터 업데이트 확인
- [ ] 오늘 달린 기록이 없을 때 섹션 미표시 확인 (`null` 반환)
- [ ] 기존 크루 스트립, 탭, PhotoGrid, RunFeed 정상 동작 확인

- [ ] **Step 3: 모바일 확인**

같은 Wi-Fi에서 `http://<로컬IP>:3000/home` 접속:

- [ ] iOS Safari: 카드 스와이프 중 페이지 스크롤 없이 동작하는지 (`touch-action: none` 효과)
- [ ] 카드 플립 60fps 부드러운지
- [ ] 뒷면 탭 → 앞면 복귀 동작하는지

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: today card deck — verified on mobile"
```
