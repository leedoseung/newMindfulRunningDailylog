'use client'

import { useEffect, useRef, useState, type TouchEvent } from 'react'

type Photo = { runId: string; photoUrl: string; date: string }

type Props = {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

function formatDate(d: string): string {
  // YYYY-MM-DD → M월 D일
  const [, m, day] = d.split('-')
  if (!m || !day) return d
  return `${Number(m)}월 ${Number(day)}일`
}

export function PhotoLightbox({ photos, initialIndex, onClose }: Props) {
  const [idx, setIdx] = useState(initialIndex)
  const touchStart = useRef<{ x: number; t: number } | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIdx(i => Math.min(photos.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photos.length, onClose])

  function onTouchStart(e: TouchEvent<HTMLDivElement>) {
    const t = e.touches[0]
    if (!t) return
    touchStart.current = { x: t.clientX, t: Date.now() }
  }

  function onTouchEnd(e: TouchEvent<HTMLDivElement>) {
    const s = touchStart.current
    if (!s) return
    const end = e.changedTouches[0]
    if (!end) return
    const dx = end.clientX - s.x
    if (Math.abs(dx) > 40) {
      setIdx(i => (dx > 0 ? Math.max(0, i - 1) : Math.min(photos.length - 1, i + 1)))
    }
  }

  const current = photos[idx]
  if (!current) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="사진 자세히 보기"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.94)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top) + 12px) 16px 12px',
        color: '#fff',
      }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
          {idx + 1} / {photos.length}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            borderRadius: 999,
            width: 36,
            height: 36,
            color: '#fff',
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{
        flex: 1,
        display: 'grid',
        placeItems: 'center',
        padding: '0 8px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.runId}
          src={current.photoUrl}
          alt={`${current.date} 달리기 사진`}
          loading="eager"
          decoding="async"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: 8,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        />

        {idx > 0 && (
          <button
            type="button"
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            aria-label="이전 사진"
            style={navBtn('left')}
          >‹</button>
        )}
        {idx < photos.length - 1 && (
          <button
            type="button"
            onClick={() => setIdx(i => Math.min(photos.length - 1, i + 1))}
            aria-label="다음 사진"
            style={navBtn('right')}
          >›</button>
        )}
      </div>

      <div style={{
        padding: '14px 18px calc(env(safe-area-inset-bottom) + 18px)',
        textAlign: 'center',
        color: '#fff',
      }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.3px' }}>
          {formatDate(current.date)}
        </div>
      </div>
    </div>
  )
}

function navBtn(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    top: '50%',
    [side]: 8,
    transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.10)',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    width: 40,
    height: 40,
    fontSize: '1.6rem',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    lineHeight: 1,
  }
}
