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

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function DetailSheet({ run, open, onClose }: Props) {
  const [photoMode, setPhotoMode] = useState(false)
  const count = useCountUp(run?.durationMin ?? 0, open)

  useEffect(() => {
    if (!open) setPhotoMode(false)
  }, [open])

  if (!run) return null

  const hasPhoto = Boolean(run.photoUrl)

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
          background: open ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0)',
          transition: 'background 0.38s ease',
        }}
      />

      {/* Sheet */}
      <div
        data-testid="detail-sheet"
        style={{
          position: 'relative', width: '100%', height: '88vh',
          background: '#F7F7F5', borderRadius: '28px 28px 0 0',
          transform: open ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.52s cubic-bezier(0.32,0.72,0,1)',
          overflow: 'hidden', zIndex: 201,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Photo background (photo mode) */}
        {hasPhoto && (
          <div
            onClick={() => photoMode && setPhotoMode(false)}
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${run.photoUrl})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              transform: photoMode ? 'scale(1.04)' : 'scale(1.12)',
              opacity: photoMode ? 1 : 0,
              transition: 'transform 0.55s cubic-bezier(0.32,0.72,0,1), opacity 0.35s',
              pointerEvents: photoMode ? 'auto' : 'none',
              zIndex: 10,
              cursor: 'pointer',
            }}
          />
        )}

        {/* Top bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px 0', flexShrink: 0, position: 'relative', zIndex: 20,
        }}>
          {/* Handle */}
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
            width: 32, height: 3, background: 'rgba(0,0,0,0.12)', borderRadius: 2 }} />

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%', marginTop: 8,
              background: '#EBEBEA', border: 'none', color: '#111',
              fontSize: '0.85rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>

          {hasPhoto && (
            <button
              type="button"
              onClick={() => setPhotoMode(v => !v)}
              style={{
                background: '#111', border: 'none', borderRadius: 20,
                padding: '6px 14px', marginTop: 8,
                fontFamily: FONT, fontSize: '0.6rem', fontWeight: 500,
                color: '#fff', cursor: 'pointer',
              }}
            >{photoMode ? '텍스트 보기' : '사진 보기'}</button>
          )}
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: 'auto', scrollbarWidth: 'none',
          padding: '24px 24px 40px',
          opacity: photoMode ? 0 : 1,
          transition: 'opacity 0.25s',
          pointerEvents: photoMode ? 'none' : 'auto',
        }}>
          {/* Duration */}
          <div style={{
            fontFamily: FONT, fontSize: '0.52rem', fontWeight: 500,
            color: '#888', letterSpacing: '2px', textTransform: 'uppercase',
            marginBottom: 4,
          }}>달린 시간</div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
            <span style={{
              fontFamily: FONT, fontSize: '4.2rem', fontWeight: 300,
              color: '#111', lineHeight: 1, letterSpacing: '-2px',
            }}>{count}</span>
            <span style={{ fontFamily: FONT, fontSize: '1rem', fontWeight: 400, color: '#555' }}>분</span>
          </div>

          <div style={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 400, color: '#666', marginBottom: 16 }}>
            {run.memberName}
          </div>

          {/* Chips */}
          {(run.location || hasPhoto) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              {run.location && (
                <div style={{
                  background: '#EBEBEA', borderRadius: 20, padding: '4px 12px',
                  fontFamily: FONT, fontSize: '0.62rem', fontWeight: 400, color: '#555',
                }}>📍 {run.location}</div>
              )}
              {hasPhoto && (
                <div style={{
                  background: '#EBEBEA', borderRadius: 20, padding: '4px 12px',
                  fontFamily: FONT, fontSize: '0.62rem', fontWeight: 400, color: '#555',
                }}>📸 사진</div>
              )}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 20 }} />

          {/* Date + title */}
          <div style={{ fontFamily: FONT, fontSize: '0.62rem', fontWeight: 400, color: '#999', marginBottom: 8 }}>
            {run.date}
          </div>
          {run.title && (
            <div style={{
              fontFamily: FONT, fontSize: '1.15rem', fontWeight: 500,
              color: '#111', lineHeight: 1.35, marginBottom: 24,
            }}>"{run.title}"</div>
          )}

          {/* Thoughts */}
          {thoughts.length > 0 && (
            <>
              <div style={{
                fontFamily: FONT, fontSize: '0.5rem', fontWeight: 500,
                color: '#999', letterSpacing: '2px', textTransform: 'uppercase',
                marginBottom: 14,
              }}>Before · During · After</div>
              {thoughts.map(({ step, text }) => (
                <div key={step} style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  paddingBottom: 16, marginBottom: 16,
                  borderBottom: '1px solid rgba(0,0,0,0.07)',
                }}>
                  <div style={{
                    fontFamily: FONT, fontSize: '0.6rem', fontWeight: 500,
                    color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
                    whiteSpace: 'nowrap', paddingTop: 3, minWidth: 24,
                  }}>{step}</div>
                  <div style={{
                    fontFamily: FONT, fontSize: '0.88rem', fontWeight: 400,
                    color: '#333', lineHeight: 1.7,
                  }}>{text}</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Photo mode tap hint */}
        {hasPhoto && (
          <div style={{
            position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            borderRadius: 20, padding: '7px 16px',
            fontFamily: FONT, fontSize: '0.58rem', fontWeight: 500,
            color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap',
            opacity: photoMode ? 1 : 0, transition: 'opacity 0.3s',
            pointerEvents: 'none', zIndex: 20,
          }}>탭하면 텍스트 다시 보기</div>
        )}
      </div>
    </div>
  )
}
