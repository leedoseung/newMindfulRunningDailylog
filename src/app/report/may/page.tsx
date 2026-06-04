'use client'
import { useRouter } from 'next/navigation'

export default function MayReportPage() {
  const router = useRouter()
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#faf8f3', zIndex: 0 }}>
      <button
        type="button"
        onClick={() => router.back()}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,0.1)', borderRadius: 20,
          padding: '7px 14px',
          fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
          fontSize: '0.82rem', fontWeight: 500, color: '#111',
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        ← 돌아가기
      </button>
      <iframe
        src="/reports/may-dashboard.html"
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="MFRS 어드밴스 5기 2-5월 누적 인사이트"
      />
    </div>
  )
}
