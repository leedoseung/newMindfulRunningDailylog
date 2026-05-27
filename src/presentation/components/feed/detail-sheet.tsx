'use client'

import { useEffect, useRef, useState } from 'react'
import type { RunLog } from '@/domain/entities/run-log'

type Props = {
  run: RunLog | null
  open: boolean
  onClose: () => void
}

function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!active) { setValue(0); return }
    timerRef.current = setTimeout(() => {
      const t0 = performance.now()
      const duration = 800
      const tick = (now: number) => {
        const p = Math.min((now - t0) / duration, 1)
        const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
        setValue(Math.round(e * target))
        if (p < 1) rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }, 180)
    return () => {
      clearTimeout(timerRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [target, active])

  return value
}

export function DetailSheet({ run, open, onClose }: Props) {
  const [photoMode, setPhotoMode] = useState(false)
  const count = useCountUp(run?.durationMin ?? 0, open)

  useEffect(() => {
    if (!open) setPhotoMode(false)
  }, [open])

  if (!run) return null

  const hasPhoto = Boolean(run.photoUrl)

  const bgStyle: React.CSSProperties = run.photoUrl
    ? {
        backgroundImage: `url(${run.photoUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transform: photoMode ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 0.5s cubic-bezier(0.32,0.72,0,1)',
      }
    : { background: 'linear-gradient(170deg, #1a1c1d 0%, #2d3031 100%)' }

  const thoughts = [
    { step: '전', text: run.thoughtBefore },
    { step: '중', text: run.thoughtDuring },
    { step: '후', text: run.thoughtAfter },
  ].filter(t => t.text)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      pointerEvents: open ? 'all' : 'none',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      {/* Backdrop */}
      <div
        data-testid="detail-sheet-backdrop"
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: open ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
          transition: 'background 0.38s ease',
        }}
      />

      {/* Sheet */}
      <div
        data-testid="detail-sheet"
        onClick={() => { if (photoMode) setPhotoMode(false) }}
        style={{
          position: 'relative', width: '100%', height: '88vh',
          background: '#0a0a0a', borderRadius: '28px 28px 0 0',
          transform: open ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.52s cubic-bezier(0.32,0.72,0,1)',
          overflow: 'hidden', zIndex: 201,
        }}
      >
        {/* Photo background */}
        <div style={{ position: 'absolute', inset: 0, ...bgStyle }} />

        {/* Top button bar */}
        <div style={{
          position: 'absolute', top: 16, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 20px', zIndex: 20,
        }}>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClose() }}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
              border: 'none', color: 'rgba(255,255,255,0.85)',
              fontSize: '0.9rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>

          {hasPhoto && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setPhotoMode(v => !v) }}
              style={{
                background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.18)', borderRadius: 20,
                padding: '5px 13px',
                fontFamily: 'var(--font-raleway)', fontSize: '0.58rem', fontWeight: 700,
                color: 'rgba(255,255,255,0.82)', cursor: 'pointer',
              }}
            >{photoMode ? '텍스트 보기' : '사진 보기'}</button>
          )}
        </div>

        {/* Glass panel */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
          background: 'rgba(0,0,0,0.22)', borderRadius: '26px 26px 0 0',
          maxHeight: '72%', overflowY: 'auto', scrollbarWidth: 'none',
          padding: '18px 22px 32px',
          transform: photoMode ? 'translateY(108%)' : 'translateY(0)',
          opacity: photoMode ? 0 : 1,
          transition: 'transform 0.48s cubic-bezier(0.32,0.72,0,1), opacity 0.35s',
          pointerEvents: photoMode ? 'none' : 'auto',
          zIndex: 10,
        }}>
          {/* Handle bar */}
          <div style={{
            width: 32, height: 3, background: 'rgba(255,255,255,0.2)',
            borderRadius: 2, margin: '0 auto 18px',
          }} />

          <div style={{
            fontFamily: 'var(--font-raleway)', fontSize: '0.56rem', fontWeight: 600,
            color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase',
            marginBottom: 5,
          }}>달린 시간</div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{
              fontFamily: 'var(--font-raleway)', fontSize: '4.2rem', fontWeight: 800,
              color: '#fff', lineHeight: 1, letterSpacing: '-2px',
            }}>{count}</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 300, color: 'rgba(255,255,255,0.35)' }}>분</span>
          </div>

          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.32)', marginTop: 6 }}>
            {run.memberName}
          </div>

          {run.location && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
              <div style={{
                background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 20, padding: '3px 10px', fontSize: '0.6rem', color: 'rgba(255,255,255,0.58)',
              }}>📍 {run.location}</div>
            </div>
          )}

          <div style={{ padding: '16px 0 0' }}>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.28)', marginBottom: 3 }}>
              {run.date}
            </div>
            {run.title && (
              <div style={{
                fontFamily: 'var(--font-raleway)', fontSize: '1.1rem', fontWeight: 700,
                color: '#fff', lineHeight: 1.3, marginBottom: 16,
              }}>{run.title}</div>
            )}

            {thoughts.length > 0 && (
              <>
                <div style={{
                  fontFamily: 'var(--font-raleway)', fontSize: '0.54rem', fontWeight: 600,
                  color: 'rgba(255,255,255,0.18)', letterSpacing: '2px', textTransform: 'uppercase',
                  marginBottom: 12,
                }}>Before · During · After</div>
                {thoughts.map(({ step, text }) => (
                  <div key={step} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.07)',
                    marginBottom: 12,
                  }}>
                    <div style={{
                      fontSize: '0.55rem', fontWeight: 500, color: 'rgba(255,255,255,0.2)',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      whiteSpace: 'nowrap', paddingTop: 3, minWidth: 28,
                    }}>{step}</div>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.65 }}>
                      {text}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {hasPhoto && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setPhotoMode(true) }}
              style={{
                display: 'block', width: '100%', marginTop: 16, padding: 13,
                background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 12,
                fontFamily: 'var(--font-raleway)', fontSize: '0.74rem', fontWeight: 600,
                color: 'rgba(255,255,255,0.25)', cursor: 'pointer',
              }}
            >텍스트 닫고 사진 보기</button>
          )}
        </div>

        {/* Photo-mode tap hint */}
        {hasPhoto && (
          <div style={{
            position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
            padding: '7px 16px',
            fontFamily: 'var(--font-raleway)', fontSize: '0.58rem', fontWeight: 600,
            color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap',
            opacity: photoMode ? 1 : 0, transition: 'opacity 0.3s',
            pointerEvents: 'none', zIndex: 5,
          }}>사진 탭하면 텍스트 다시 보기</div>
        )}
      </div>
    </div>
  )
}
