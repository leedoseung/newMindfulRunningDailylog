'use client'

import Link from 'next/link'

type Props = {
  memberId: string
  year: number
  month: number
  thisMonthRunCount: number
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function DiaryEntryBanner({ memberId, year, month, thisMonthRunCount }: Props) {
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`
  const href = `/diary/${memberId}/${yearMonth}`

  return (
    <div style={{ padding: '12px 16px 0' }}>
      <Link
        href={href}
        prefetch={false}
        style={{
          display: 'block',
          position: 'relative',
          textDecoration: 'none',
          color: '#fff',
          borderRadius: 20,
          padding: '20px 22px 18px',
          background:
            'radial-gradient(120% 140% at 100% 0%, rgba(244,114,182,0.45) 0%, rgba(167,139,250,0.18) 36%, transparent 64%),' +
            'radial-gradient(90% 110% at 0% 100%, rgba(56,189,248,0.28) 0%, transparent 60%),' +
            'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4C1D95 100%)',
          overflow: 'hidden',
          boxShadow: '0 14px 32px rgba(30,27,75,0.32), 0 1px 0 rgba(255,255,255,0.04) inset',
          isolation: 'isolate',
        }}
      >
        {/* Soft glow orb */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: -40,
            top: -40,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(244,114,182,0.55) 0%, rgba(244,114,182,0) 70%)',
            filter: 'blur(2px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Outline month numeral */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: 16,
            bottom: -28,
            fontFamily: FONT,
            fontSize: '7.5rem',
            fontWeight: 800,
            letterSpacing: '-6px',
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: '1.5px rgba(255,255,255,0.16)',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
          }}
        >
          {month}
        </div>

        {/* Eyebrow row */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: FONT,
              fontSize: '0.58rem',
              fontWeight: 700,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            Monthly Diary · {year}.{String(month).padStart(2, '0')}
          </span>
          <span
            aria-hidden
            style={{
              flex: 1,
              height: 1,
              background:
                'linear-gradient(90deg, rgba(255,255,255,0.18), rgba(255,255,255,0))',
            }}
          />
          <span aria-hidden style={{ fontSize: '0.7rem' }}>✨</span>
        </div>

        {/* Title */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            fontFamily: FONT,
            fontSize: '1.32rem',
            fontWeight: 800,
            letterSpacing: '-0.6px',
            lineHeight: 1.22,
            marginBottom: 4,
            background:
              'linear-gradient(90deg, #FFFFFF 0%, #FBCFE8 65%, #C4B5FD 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          이번 달, 한 줄로 모아보기
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            fontFamily: FONT,
            fontSize: '0.78rem',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.75)',
            letterSpacing: '-0.2px',
            marginBottom: 16,
          }}
        >
          나만의 월간 회고 카드를 펼쳐보세요
        </div>

        {/* Footer row */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 11px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.10)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.10)',
              fontFamily: FONT,
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.92)',
              letterSpacing: '-0.2px',
            }}
          >
            <span style={{ fontSize: '0.7rem' }}>🏃</span>
            {thisMonthRunCount > 0 ? `이번 달 ${thisMonthRunCount}번` : '쉬어가는 달'}
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 999,
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.78))',
              color: '#1E1B4B',
              fontFamily: FONT,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '-0.2px',
              boxShadow: '0 6px 18px rgba(244,114,182,0.30)',
            }}
          >
            펼쳐보기
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>→</span>
          </div>
        </div>
      </Link>
    </div>
  )
}
