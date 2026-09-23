import Link from 'next/link'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function SeasonWrapBanner() {
  return (
    <div style={{ padding: '12px 16px 0' }}>
      <Link
        href="/mission"
        prefetch={false}
        style={{
          display: 'block',
          position: 'relative',
          textDecoration: 'none',
          color: '#fff',
          borderRadius: 20,
          padding: '22px 22px 20px',
          minHeight: 168,
          overflow: 'hidden',
          isolation: 'isolate',
          background:
            'radial-gradient(120% 140% at 100% 0%, rgba(244,114,182,0.38) 0%, rgba(167,139,250,0.16) 40%, transparent 65%),' +
            'radial-gradient(80% 100% at 0% 100%, rgba(56,189,248,0.28) 0%, transparent 60%),' +
            'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4C1D95 100%)',
          boxShadow: '0 14px 32px rgba(30,27,75,0.32), 0 1px 0 rgba(255,255,255,0.06) inset',
        }}
      >
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
              color: 'rgba(255,255,255,0.78)',
            }}
          >
            SEASON WRAP · LUNGE 100
          </span>
          <span
            aria-hidden
            style={{
              flex: 1,
              height: 1,
              background:
                'linear-gradient(90deg, rgba(255,255,255,0.28), rgba(255,255,255,0))',
            }}
          />
          <span aria-hidden style={{ fontSize: '0.85rem' }}>🌱</span>
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            fontFamily: FONT,
            fontSize: '1.32rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.24,
            marginBottom: 6,
            color: '#fff',
            textShadow: '0 2px 10px rgba(0,0,0,0.28)',
          }}
        >
          우리의 100일이 담긴 이야기
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            fontFamily: FONT,
            fontSize: '0.8rem',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.88)',
            letterSpacing: '-0.01em',
            marginBottom: 18,
            textShadow: '0 1px 6px rgba(0,0,0,0.28)',
          }}
        >
          런지 시즌1을 함께 걸어온 44명의 도장과 한 줄들.
        </div>

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
              background: 'rgba(0,0,0,0.28)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.18)',
              fontFamily: FONT,
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.95)',
              letterSpacing: '-0.02em',
            }}
          >
            <span style={{ fontSize: '0.7rem' }}>📖</span>
            10월 15일까지 열려요
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 999,
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,255,255,0.82))',
              color: '#312E81',
              fontFamily: FONT,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              boxShadow: '0 6px 18px rgba(76,29,149,0.32)',
            }}
          >
            돌아보기
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>→</span>
          </div>
        </div>
      </Link>
    </div>
  )
}
