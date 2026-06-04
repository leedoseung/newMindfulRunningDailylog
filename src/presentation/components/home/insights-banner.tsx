import Link from 'next/link'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function InsightsBanner() {
  return (
    <Link href="/report/may" style={{ textDecoration: 'none', display: 'block', margin: '0 0 12px' }}>
      <div style={{
        margin: '0 16px',
        background: 'linear-gradient(135deg, #1f4a37, #2f6b4f)',
        borderRadius: 18,
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 16px rgba(31,74,55,0.22)',
        cursor: 'pointer',
      }}>
        <div>
          <div style={{
            fontFamily: FONT, fontSize: '0.48rem', fontWeight: 600,
            color: 'rgba(255,255,255,0.65)', letterSpacing: '2px',
            textTransform: 'uppercase', marginBottom: 5,
          }}>
            MFRS 어드밴스 5기
          </div>
          <div style={{
            fontFamily: FONT, fontSize: '0.95rem', fontWeight: 700,
            color: '#fff', lineHeight: 1.3,
          }}>
            2–5월 누적 인사이트 📊
          </div>
          <div style={{
            fontFamily: FONT, fontSize: '0.65rem', fontWeight: 400,
            color: 'rgba(255,255,255,0.7)', marginTop: 4,
          }}>
            크루 달리기 데이터 대시보드 보기 →
          </div>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', flexShrink: 0,
        }}>
          📈
        </div>
      </div>
    </Link>
  )
}
