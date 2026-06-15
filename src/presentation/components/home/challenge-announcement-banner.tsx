'use client'

import Link from 'next/link'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type SimpleChallenge = {
  id: string
  title: string
  description: string
  startDate: string
  registrationDeadline: string
  imageUrl?: string | null
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
  const daysUntilDeadline = diffDays(today, challenge.registrationDeadline)
  const started = today >= challenge.startDate
  const recruiting = today <= challenge.registrationDeadline
  const isLateRecruit = started && recruiting && !enrolled

  let kicker = 'NEW SEASON'
  let dayLabel = dDay > 0 ? `D-${dDay}` : dDay === 0 ? '오늘 시작' : `${-dDay}일째`
  let cta = enrolled ? '참가 중 ✓' : '참가 신청 →'
  let chipBg = '#b8231f'

  if (isLateRecruit) {
    kicker = '추가 모집 중'
    dayLabel = daysUntilDeadline === 0 ? '오늘 마감' : `D-${daysUntilDeadline} 마감`
    cta = '지금 합류하기 →'
    chipBg = '#d4a017'
  }

  const imageUrl = challenge.imageUrl

  return (
    <Link
      href="/mission"
      style={{
        position: 'relative',
        display: 'block',
        textDecoration: 'none',
        color: '#fff',
        borderRadius: 18,
        padding: 18,
        fontFamily: FONT,
        overflow: 'hidden',
        backgroundColor: '#111',
        backgroundImage: imageUrl
          ? `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.78) 100%), url("${imageUrl}")`
          : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <p style={{ fontSize: 10, letterSpacing: '0.1em', margin: 0, opacity: 0.85 }}>{kicker}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
          {challenge.title}
        </h2>
        <span style={{
          flexShrink: 0,
          fontSize: 12, fontWeight: 600,
          background: chipBg, padding: '4px 10px', borderRadius: 999,
        }}>
          {dayLabel}
        </span>
      </div>
      {challenge.description && (
        <p style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.88)',
          margin: '6px 0 0',
          whiteSpace: 'pre-line',
          lineHeight: 1.55,
          textShadow: '0 1px 3px rgba(0,0,0,0.6)',
        }}>
          {challenge.description}
        </p>
      )}
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.92)', margin: '12px 0 0', fontWeight: 600 }}>
        {cta}
      </p>
    </Link>
  )
}
