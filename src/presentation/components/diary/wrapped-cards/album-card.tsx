'use client'

import { useEffect, useState } from 'react'
import { CardShell } from './card-shell'
import { PhotoLightbox } from './photo-lightbox'

type AlbumPhoto = {
  runId: string
  photoUrl: string
  date: string
}

type Props = {
  photos: AlbumPhoto[]
  overflow: number
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const STAGE_INTERVAL_MS = 1800

export function AlbumCard({ photos, overflow }: Props) {
  const [stageIdx, setStageIdx] = useState(0)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const total = photos.length

  // Auto-rotate the stage with a slow Ken Burns feel
  useEffect(() => {
    if (total <= 1) return
    if (lightboxIdx !== null) return
    const t = window.setInterval(() => {
      setStageIdx(i => (i + 1) % total)
    }, STAGE_INTERVAL_MS)
    return () => window.clearInterval(t)
  }, [total, lightboxIdx])

  if (total === 0) return null

  const stage = photos[stageIdx]
  if (!stage) return null

  return (
    <CardShell label="앨범 카드" bg="linear-gradient(180deg, #050505 0%, #111 100%)">
      <div style={{
        width: '100%',
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontFamily: FONT,
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 4,
            }}>
              Album · {total}장{overflow > 0 ? ` (+${overflow})` : ''}
            </div>
            <div style={{
              fontFamily: FONT,
              fontSize: '1.6rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              background: 'linear-gradient(90deg, #FFFFFF, #FBCFE8 60%, #C4B5FD)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              한 달, 한 장씩
            </div>
          </div>
        </div>

        {/* Stage — featured photo, Ken Burns auto-rotation */}
        <button
          type="button"
          onClick={() => setLightboxIdx(stageIdx)}
          aria-label="자세히 보기"
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4 / 5',
            maxHeight: '52vh',
            borderRadius: 16,
            overflow: 'hidden',
            background: '#1a1a1a',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
          }}
        >
          {photos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.runId}
              src={p.photoUrl}
              alt={`${p.date} 달리기 사진`}
              loading={i === stageIdx ? 'eager' : 'lazy'}
              decoding="async"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: i === stageIdx ? 1 : 0,
                transition: 'opacity 450ms ease',
                transform: i === stageIdx ? 'scale(1.06)' : 'scale(1)',
                transitionProperty: 'opacity, transform',
                transitionDuration: '450ms, 1800ms',
                transitionTimingFunction: 'ease, linear',
              }}
            />
          ))}
          {/* Bottom date overlay */}
          <div style={{
            position: 'absolute',
            left: 0, right: 0, bottom: 0,
            padding: '40px 16px 14px',
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 100%)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            fontFamily: FONT,
            color: '#fff',
            textAlign: 'left',
          }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.3px' }}>
              {formatDateLabel(stage.date)}
            </div>
            <div style={{ fontSize: '0.66rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
              {stageIdx + 1} / {total}
            </div>
          </div>
        </button>

        {/* Film strip — horizontal scroll, all photos */}
        <div
          role="list"
          aria-label="사진 목록"
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 4,
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {photos.map((p, i) => {
            const active = i === stageIdx
            return (
              <button
                key={p.runId}
                type="button"
                onClick={() => setStageIdx(i)}
                onDoubleClick={() => setLightboxIdx(i)}
                aria-label={`${p.date} 사진 보기`}
                role="listitem"
                style={{
                  flex: '0 0 auto',
                  width: 54,
                  height: 54,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: active ? '2px solid #F472B6' : '2px solid transparent',
                  padding: 0,
                  background: '#222',
                  cursor: 'pointer',
                  scrollSnapAlign: 'start',
                  transition: 'transform 200ms ease, border-color 200ms ease',
                  transform: active ? 'scale(1.06)' : 'scale(1)',
                  position: 'relative',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photoUrl}
                  alt={`${p.date} 썸네일`}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </button>
            )
          })}
        </div>

        <div style={{
          fontFamily: FONT,
          fontSize: '0.68rem',
          fontWeight: 500,
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'center',
        }}>
          탭하여 자세히 보기 · 좌우로 스크롤
        </div>
      </div>

      {lightboxIdx !== null && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </CardShell>
  )
}

function formatDateLabel(d: string): string {
  const [, m, day] = d.split('-')
  if (!m || !day) return d
  return `${Number(m)}월 ${Number(day)}일`
}
