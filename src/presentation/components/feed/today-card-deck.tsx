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
  onRunClick: (run: RunLog) => void
}

export function TodayCardDeck({ todayRuns, memberId, onRunClick }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0)

  const deckRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const orderRef = useRef<number[]>([])
  const onRunClickRef = useRef(onRunClick)
  onRunClickRef.current = onRunClick

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
      gsap.set(el, getStackPos(fromTop))
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
        if (el) gsap.set(el, getStackPos(orderRef.current.length - 1))
        applyStack(null, true)
        setCurrentIdx(prev => (prev + 1) % runs.length)
      },
    })
  }

  useEffect(() => {
    const deckEl = deckRef.current
    if (!deckEl || runs.length === 0) return

    function onStart(x: number, y: number) {
      gsap.killTweensOf(topEl())
      drag.current = { active: true, sx: x, sy: y, vx: 0, px: x, pt: Date.now(), moved: false }
    }

    function onMove(x: number, y: number) {
      if (!drag.current.active) return
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
      if (!moved) {
        const topIdx = orderRef.current[orderRef.current.length - 1]
        if (topIdx !== undefined) {
          const run = runs[topIdx]
          if (run) onRunClickRef.current(run)
        }
        return
      }
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
      <div style={{ padding: '0 22px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: FONT, fontSize: '0.52rem', fontWeight: 600, color: '#666', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
          오늘의 달리기
        </div>
        <div style={{ fontFamily: FONT, fontSize: '0.5rem', fontWeight: 500, color: '#999' }}>
          {runs.length}명 · 탭하면 상세보기
        </div>
      </div>

      <div ref={deckRef} style={{ position: 'relative', height: 248, margin: '0 16px' }}>
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
              }}
            >
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 20,
                background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
                boxShadow: '0 8px 28px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
              }}>
                {run.photoUrl && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 20, backgroundImage: `url(${run.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                )}
                <div style={{ position: 'absolute', inset: 0, borderRadius: 20, background: 'linear-gradient(to bottom, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.68) 100%)' }} />
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.07), transparent)', borderRadius: '20px 20px 0 0', pointerEvents: 'none' }} />
                {run.likeCount > 0 && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12, zIndex: 2,
                    background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(6px)',
                    borderRadius: 20, padding: '4px 10px',
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontFamily: FONT, fontSize: '0.72rem', fontWeight: 700,
                    color: '#fff',
                  }}>
                    ♥ {run.likeCount}
                  </div>
                )}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: '18px 18px', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '10px 14px', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', flexShrink: 0 }}>
                    <span style={{ fontFamily: FONT, fontSize: '1.6rem', fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{run.durationMin}</span>
                    <span style={{ fontFamily: FONT, fontSize: '0.58rem', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>분</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <AvatarImage name={run.memberName} avatarUrl={run.memberAvatarUrl} size={22} bg="rgba(255,255,255,0.2)" color="#fff" />
                      <span style={{ fontFamily: FONT, fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{run.memberName}</span>
                    </div>
                    {run.title && (
                      <div style={{ fontFamily: FONT, fontSize: '0.82rem', fontWeight: 700, color: '#fff', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {run.title}
                      </div>
                    )}
                    <div style={{ fontFamily: FONT, fontSize: '0.52rem', color: 'rgba(255,255,255,0.45)' }}>{run.date}</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 4 }}>
        {runs.map((_, i) => (
          <div key={i} style={{
            width: i === currentIdx ? 18 : 4,
            height: 4, borderRadius: 3,
            background: i === currentIdx ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)',
            transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            flexShrink: 0,
          }} />
        ))}
      </div>
    </>
  )
}
