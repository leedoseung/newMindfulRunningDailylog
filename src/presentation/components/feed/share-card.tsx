'use client'

import { forwardRef } from 'react'
import type { RunLog } from '@/domain/entities/run-log'

const FONT = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
const W = 375

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

type Props = { run: RunLog }

/* ── 사진 있을 때: A-2 (사진 상단 고정 + 다크 하단) ── */
function PhotoCard({ run }: Props) {
  const thoughts = [
    { label: '전', text: run.thoughtBefore },
    { label: '중', text: run.thoughtDuring },
    { label: '후', text: run.thoughtAfter },
  ].filter(t => t.text)

  return (
    <div style={{ width: W, background: '#0a0a0a', overflow: 'hidden' }}>
      {/* 사진 상단 */}
      <div style={{ position: 'relative', height: 240, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={run.photoUrl}
          alt=""
          crossOrigin="anonymous"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 75%, rgba(10,10,10,1) 100%)',
        }} />
        <div style={{
          position: 'absolute', top: 20, left: 22,
          fontSize: 8, fontWeight: 700, letterSpacing: '2.5px',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontFamily: FONT,
        }}>Mindful Running</div>
        <div style={{
          position: 'absolute', top: 20, right: 22,
          fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', fontFamily: FONT,
        }}>{formatDate(run.date)}</div>
        <div style={{ position: 'absolute', bottom: 18, left: 22, right: 22 }}>
          {run.title && (
            <div style={{
              fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: FONT,
              lineHeight: 1.25, letterSpacing: '-0.3px', marginBottom: 5,
            }}>"{run.title}"</div>
          )}
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.5px', fontFamily: FONT }}>
            {run.durationMin}분{run.location ? ` · ${run.location}` : ''} · {run.memberName}
          </div>
        </div>
      </div>

      {/* 다크 텍스트 영역 */}
      <div style={{ padding: '20px 22px 28px' }}>
        {thoughts.map(({ label, text }, i) => (
          <div key={label} style={{
            display: 'flex', gap: 12, padding: '12px 0',
            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <span style={{
              fontSize: 7.5, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.25)', width: 18, flexShrink: 0, paddingTop: 2, fontFamily: FONT,
            }}>{label}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, fontFamily: FONT }}>{text}</span>
          </div>
        ))}
        <div style={{
          marginTop: 18, paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.18)', textAlign: 'center', fontFamily: FONT,
        }}>Mindful Running</div>
      </div>
    </div>
  )
}

/* ── 사진 없을 때: 브랜드 카드 ── */
function BrandCard({ run }: Props) {
  const thoughts = [
    { label: '전', text: run.thoughtBefore },
    { label: '중', text: run.thoughtDuring },
    { label: '후', text: run.thoughtAfter },
  ].filter(t => t.text)

  return (
    <div style={{ width: W, background: '#111111', overflow: 'hidden', position: 'relative' }}>

      {/* 배경 로고 워터마크 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon-192.png"
        alt=""
        crossOrigin="anonymous"
        style={{
          position: 'absolute', right: -30, top: 30,
          width: 220, height: 220, objectFit: 'contain',
          opacity: 0.06, pointerEvents: 'none',
          filter: 'invert(1)',
        }}
      />

      {/* 상단 헤더 영역 */}
      <div style={{ padding: '36px 26px 0', position: 'relative' }}>

        {/* 로고 + 브랜드명 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt=""
            crossOrigin="anonymous"
            style={{ width: 22, height: 22, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.55 }}
          />
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '2.5px',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontFamily: FONT,
          }}>Mindful Running</span>
        </div>

        {/* 달린 시간 — 큼직하게 */}
        <div style={{ marginBottom: 6 }}>
          <span style={{
            fontSize: 72, fontWeight: 200, color: '#fff', lineHeight: 1,
            letterSpacing: '-3px', fontFamily: FONT,
          }}>{run.durationMin}</span>
          <span style={{
            fontSize: 18, fontWeight: 300, color: 'rgba(255,255,255,0.4)',
            marginLeft: 6, fontFamily: FONT,
          }}>분</span>
        </div>

        {/* 제목 */}
        {run.title && (
          <div style={{
            fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.3, letterSpacing: '-0.2px', marginBottom: 10, fontFamily: FONT,
          }}>"{run.title}"</div>
        )}

        {/* 메타 칩 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 32 }}>
          <span style={{
            fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: FONT,
            background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '4px 10px',
            letterSpacing: '0.3px',
          }}>{run.memberName}</span>
          {run.location && (
            <span style={{
              fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: FONT,
              background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '4px 10px',
            }}>{run.location}</span>
          )}
          <span style={{
            fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: FONT,
            background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '4px 10px',
          }}>{formatDate(run.date)}</span>
        </div>
      </div>

      {/* 구분선 */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 26px' }} />

      {/* 생각 기록 */}
      <div style={{ padding: '20px 26px 32px', position: 'relative' }}>
        {thoughts.length > 0 ? (
          thoughts.map(({ label, text }, i) => (
            <div key={label} style={{
              display: 'flex', gap: 14, padding: '11px 0',
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <span style={{
                fontSize: 7, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.22)', width: 18, flexShrink: 0, paddingTop: 3, fontFamily: FONT,
              }}>{label}</span>
              <span style={{
                fontSize: 11.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.7, fontFamily: FONT,
              }}>{text}</span>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', padding: '12px 0', fontFamily: FONT }}>
            기록 없음
          </div>
        )}
      </div>

      {/* 하단 푸터 */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '14px 26px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-192.png"
          alt=""
          crossOrigin="anonymous"
          style={{ width: 12, height: 12, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.2 }}
        />
        <span style={{
          fontSize: 7.5, letterSpacing: '2.5px', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.18)', fontFamily: FONT,
        }}>Mindful Running</span>
      </div>
    </div>
  )
}

/* ── 외부에서 ref로 캡처하는 래퍼 ── */
export const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard({ run }, ref) {
  return (
    <div ref={ref}>
      {run.photoUrl ? <PhotoCard run={run} /> : <BrandCard run={run} />}
    </div>
  )
})
