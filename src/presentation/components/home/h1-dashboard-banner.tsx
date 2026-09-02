const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

const REPORT_HREF = '/reports/mfrs-2026-h1-dashboard-20260804.html'
const IMAGE_URL =
  'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1400&q=80'

export function H1DashboardBanner() {
  return (
    <div style={{ padding: '12px 16px 0' }}>
      <a
        href={REPORT_HREF}
        target="_blank"
        rel="noopener noreferrer"
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
          backgroundImage:
            'linear-gradient(135deg, rgba(217,70,17,0.72) 0%, rgba(234,88,12,0.52) 45%, rgba(15,23,42,0.78) 100%),' +
            `url("${IMAGE_URL}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: '0 14px 32px rgba(120,53,15,0.35), 0 1px 0 rgba(255,255,255,0.06) inset',
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
            MFRS 2026 H1 · Summer Report
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
          <span aria-hidden style={{ fontSize: '0.85rem' }}>☀️</span>
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            fontFamily: FONT,
            fontSize: '1.35rem',
            fontWeight: 800,
            letterSpacing: '-0.6px',
            lineHeight: 1.22,
            marginBottom: 6,
            color: '#fff',
            textShadow: '0 2px 10px rgba(0,0,0,0.35)',
          }}
        >
          2026 상반기 대시보드 열렸어요
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            fontFamily: FONT,
            fontSize: '0.8rem',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.88)',
            letterSpacing: '-0.2px',
            marginBottom: 18,
            textShadow: '0 1px 6px rgba(0,0,0,0.35)',
          }}
        >
          2~7월 누적 러닝 데이터, 한 화면으로
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
              letterSpacing: '-0.2px',
            }}
          >
            <span style={{ fontSize: '0.7rem' }}>📊</span>
            9월 7일까지 공개
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
              color: '#7c2d12',
              fontFamily: FONT,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '-0.2px',
              boxShadow: '0 6px 18px rgba(120,53,15,0.35)',
            }}
          >
            대시보드 보기
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>→</span>
          </div>
        </div>
      </a>
    </div>
  )
}
