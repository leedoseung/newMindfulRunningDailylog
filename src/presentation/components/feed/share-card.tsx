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

/* ── 사진 있을 때: 풀블리드 9:16 ── */
function PhotoCard({ run }: Props) {
  const thoughts = [
    { label: '전', text: run.thoughtBefore },
    { label: '중', text: run.thoughtDuring },
    { label: '후', text: run.thoughtAfter },
  ].filter(t => t.text)

  return (
    <div style={{ width: W, background: '#0a0a0a' }}>
      {/* 사진 영역 — 320px 고정, objectFit:cover로 비율 유지 */}
      <div style={{ position: 'relative', height: 400, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={run.photoUrl}
          alt=""
          data-photo
          crossOrigin="anonymous"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {/* 상단 로고 + 날짜 */}
        <div style={{
          position: 'absolute', top: 20, left: 20, right: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="" crossOrigin="anonymous"
              style={{ width: 14, height: 14, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
            <span style={{
              fontSize: 8, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.9)', fontFamily: FONT, textShadow: '0 1px 4px rgba(0,0,0,0.7)',
            }}>Mindful Running</span>
          </div>
          <span style={{
            fontSize: 9, color: 'rgba(255,255,255,0.8)', letterSpacing: '1px',
            fontFamily: FONT, textShadow: '0 1px 4px rgba(0,0,0,0.7)',
          }}>{formatDate(run.date)}</span>
        </div>
        {/* 하단 페이드 — 사진→다크 전환 */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
          background: 'linear-gradient(to bottom, rgba(10,10,10,0) 0%, rgba(10,10,10,1) 100%)',
        }} />
      </div>

      {/* 텍스트 영역 — auto height, 절대 안 짤림 */}
      <div style={{ padding: '16px 22px 28px' }}>
        {run.title && (
          <div style={{
            fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: FONT,
            lineHeight: 1.25, letterSpacing: '-0.3px', marginBottom: 8,
          }}>"{run.title}"</div>
        )}
        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: FONT,
          marginBottom: 16, letterSpacing: '0.3px',
        }}>
          {[`${run.durationMin}분`, run.location, run.memberName].filter(Boolean).join(' · ')}
        </div>
        {thoughts.map(({ label, text }, i) => (
          <div key={label} style={{
            display: 'flex', gap: 12, padding: '10px 0',
            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
          }}>
            <span style={{
              fontSize: 7, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.28)', width: 18, flexShrink: 0, paddingTop: 2, fontFamily: FONT,
            }}>{label}</span>
            <span style={{
              fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, fontFamily: FONT,
            }}>{text}</span>
          </div>
        ))}
        <div style={{
          marginTop: 20, paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.07)',
          fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontFamily: FONT,
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
