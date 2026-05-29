'use client'

import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { AvatarImage } from '../shared/avatar-image'
import type { RunLog } from '@/domain/entities/run-log'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

const GRADIENTS: [string, string][] = [
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

  const deckRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const orderRef = useRef<number[]>([])
  const isFlippedRef = useRef(false)
  const drag = useRef({ active: false, sx: 0, sy: 0, vx: 0, px: 0, pt: 0, moved: false })

  const runs = todayRuns.slice(0, 8)

  useEffect(() => {
    const count = runs.length
    if (count === 0) return
    orderRef.current = [...Array(count).keys()]
    orderRef.current.forEach((runIdx, orderPos) => {
      const el = cardRefs.current[runIdx]
      if (!el) return
      const fromTop = count - 1 - orderPos
      gsap.set(el, { ...getStackPos(fromTop), rotationY: 0 })
      el.style.pointerEvents = fromTop === 0 ? 'auto' : 'none'
    })
  }, [runs.length])

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

  function throwCard(dir: 1 | -1) {
    const top = topEl()
    if (!top) return
    const order = orderRef.current
    const topIdx = order.length - 1
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
        const gone = orderRef.current.pop()
        if (gone === undefined) return
        orderRef.current.unshift(gone)
        const el = cardRefs.current[gone]
        if (el) gsap.set(el, { ...getStackPos(orderRef.current.length - 1), rotationY: 0 })
        isFlippedRef.current = false
        applyStack(null, true)
        setCurrentIdx(prev => (prev + 1) % runs.length)
      },
    })
  }

  useEffect(() => {
    const deckEl = deckRef.current
    if (!deckEl || runs.length === 0) return

    function onStart(x: number, y: number) {
      if (!isFlippedRef.current) gsap.killTweensOf(topEl())
      drag.current = { active: true, sx: x, sy: y, vx: 0, px: x, pt: Date.now(), moved: false }
    }

    function onMove(x: number, y: number) {
      if (!drag.current.active) return
      if (isFlippedRef.current) return
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
      if (!moved) { flipCard(); return }
      const dx = x - drag.current.sx
      const top = topEl(); if (!top) return
      if (Math.abs(dx) > 75 || Math.abs(drag.current.vx) > 0.3) {
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
    function onTouchCancel() {
      if (!drag.current.active) return
      drag.current.active = false
      const top = topEl()
      if (top) gsap.to(top, { x: 0, y: 0, rotation: 0, duration: 0.5, ease: 'elastic.out(1,0.62)', overwrite: 'auto' })
      applyStack(top, true)
    }

    deckEl.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    deckEl.addEventListener('touchstart', onTouchStart, { passive: false })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
    document.addEventListener('touchcancel', onTouchCancel)
    return () => {
      cardRefs.current.forEach(el => { if (el) gsap.killTweensOf(el) })
      deckEl.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      deckEl.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [runs.length])

  if (runs.length === 0) return null

  return (
    <>
      <div style={{ padding: '0 22px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: FONT, fontSize: '0.48rem', fontWeight: 500, color: '#bbb', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
          오늘의 달리기
        </div>
        <div style={{ fontFamily: FONT, fontSize: '0.48rem', fontWeight: 500, color: '#ccc', background: 'rgba(0,0,0,0.05)', borderRadius: 8, padding: '2px 8px' }}>
          탭하면 일기 보기
        </div>
      </div>

      <div ref={deckRef} style={{ position: 'relative', height: 188, margin: '0 16px', perspective: 1200 }}>
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
                willChange: 'transform',
                touchAction: 'none',
                transformStyle: 'preserve-3d',
                WebkitTransformStyle: 'preserve-3d',
              }}
            >
              {/* 앞면 */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 20,
                backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
                boxShadow: '0 8px 28px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
              }}>
                {run.photoUrl && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 20, backgroundImage: `url(${run.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                )}
                <div style={{ position: 'absolute', inset: 0, borderRadius: 20, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 100%)' }} />
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '42%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.07), transparent)', borderRadius: '20px 20px 0 0', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '3px 8px', fontFamily: FONT, fontSize: '0.48rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                  일기 보기 ↗
                </div>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: '14px 16px', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '8px 12px', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', flexShrink: 0 }}>
                    <span style={{ fontFamily: FONT, fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{run.durationMin}</span>
                    <span style={{ fontFamily: FONT, fontSize: '0.55rem', color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>분</span>
                  </div>
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

              {/* 뒷면 */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 20,
                backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
                boxShadow: '0 8px 28px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.07), transparent)', borderRadius: '20px 20px 0 0', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AvatarImage name={run.memberName} avatarUrl={run.memberAvatarUrl} size={20} bg="rgba(255,255,255,0.2)" color="#fff" />
                      <span style={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 700, color: '#fff' }}>{run.memberName}</span>
                    </div>
                    <span style={{ fontFamily: FONT, fontSize: '0.48rem', color: 'rgba(255,255,255,0.4)' }}>{run.date} · {run.durationMin}분</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {[
                      { label: '달리기 전', text: run.thoughtBefore, icon: '🌅' },
                      { label: '달리기 중', text: run.thoughtDuring, icon: '🏃' },
                      { label: '달리기 후', text: run.thoughtAfter,  icon: '✨' },
                    ].map((row, ri, arr) => (
                      <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: ri < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
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

    </>
  )
}
