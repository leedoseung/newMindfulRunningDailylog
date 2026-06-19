'use client'

import Link from 'next/link'

type Props = {
  memberId: string
  year: number
  month: number
  thisMonthRunCount: number
}

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
          textDecoration: 'none',
          background: 'linear-gradient(135deg, #7C2D92 0%, #1E1B4B 100%)',
          borderRadius: 16,
          padding: '18px 20px',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', right: -10, top: -10,
          fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
          fontSize: '5rem', fontWeight: 800, letterSpacing: '-3px',
          color: 'rgba(255,255,255,0.06)', pointerEvents: 'none', userSelect: 'none', lineHeight: 1,
        }}>
          {month}
        </div>

        <div style={{
          fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
          fontSize: '0.6rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.6)', marginBottom: 8,
        }}>
          {year}.{month} 일기장
        </div>

        <div style={{
          fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
          fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.5px',
          lineHeight: 1.25, marginBottom: 6,
        }}>
          이번 달 한 달 모아보기
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 12,
        }}>
          <div style={{
            fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
            fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)',
          }}>
            {thisMonthRunCount > 0 ? `이번 달 ${thisMonthRunCount}번 달림` : '쉬어가는 달'}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.15)', borderRadius: 999,
            padding: '6px 14px',
            fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
            fontSize: '0.72rem', fontWeight: 600,
          }}>
            보기 <span style={{ fontSize: '0.85rem' }}>→</span>
          </div>
        </div>
      </Link>
    </div>
  )
}
