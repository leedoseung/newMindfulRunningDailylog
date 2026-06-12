'use client'

import Link from 'next/link'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type SimpleChallenge = {
  id: string
  title: string
  description: string
  startDate: string
  registrationDeadline: string
}

type Props = {
  challenge: SimpleChallenge | null
  today: string  // 'YYYY-MM-DD' KST
  enrolled: boolean
}

function diffDays(today: string, target: string): number {
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number]
  const [yy, ym, yd] = target.split('-').map(Number) as [number, number, number]
  const t = Date.UTC(ty, tm - 1, td)
  const d = Date.UTC(yy, ym - 1, yd)
  return Math.round((d - t) / 86400000)
}

export function ChallengeAnnouncementBanner({ challenge, today, enrolled }: Props) {
  if (!challenge) return null

  const dDay = diffDays(today, challenge.startDate)
  const dayLabel = dDay > 0 ? `D-${dDay}` : dDay === 0 ? '오늘 시작' : `${-dDay}일째`

  return (
    <Link
      href="/mission"
      style={{
        display: 'block',
        textDecoration: 'none',
        background: '#111',
        color: '#fff',
        borderRadius: 18,
        padding: 18,
        fontFamily: FONT,
      }}
    >
      <p style={{ fontSize: 10, letterSpacing: '0.1em', margin: 0, opacity: 0.7 }}>NEW SEASON</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          {challenge.title}
        </h2>
        <span style={{
          fontSize: 12, fontWeight: 600,
          background: '#b8231f', padding: '4px 10px', borderRadius: 999,
        }}>
          {dayLabel}
        </span>
      </div>
      {challenge.description && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '6px 0 0' }}>
          {challenge.description}
        </p>
      )}
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', margin: '12px 0 0', fontWeight: 600 }}>
        {enrolled ? '참가 중 ✓' : '참가 신청 →'}
      </p>
    </Link>
  )
}
