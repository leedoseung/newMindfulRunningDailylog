'use client'

import { CardShell } from './card-shell'

const DOW = ['일', '월', '화', '수', '목', '금', '토']

type Props = {
  weekdayCounts: number[]
  topWeekday: { dow: number; label: string; count: number } | null
}

export function WeekdayCard({ weekdayCounts, topWeekday }: Props) {
  const max = Math.max(1, ...weekdayCounts)

  return (
    <CardShell
      label="요일 패턴 카드"
      bg="linear-gradient(180deg, #1B1E3D 0%, #4C1D95 100%)"
    >
      <p style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 400, opacity: 0.7 }}>
        이번 달 너는
      </p>

      <p style={{
        margin: '0 0 6px',
        fontSize: '3.4rem',
        fontWeight: 800,
        letterSpacing: '-0.04em',
        lineHeight: 1.05,
        background: 'linear-gradient(90deg, #F472B6, #A78BFA)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        {topWeekday ? `${topWeekday.label}요일` : '꾸준한'}
      </p>

      <p style={{ margin: '0 0 28px', fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
        러너였어
      </p>

      <div style={{
        width: '100%',
        maxWidth: 320,
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 8,
        alignItems: 'end',
        height: 110,
      }}>
        {weekdayCounts.map((c, i) => {
          const h = (c / max) * 100
          const isTop = topWeekday?.dow === i && c > 0
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: '100%',
                height: `${Math.max(6, h)}%`,
                borderRadius: 6,
                background: isTop
                  ? 'linear-gradient(180deg, #F472B6, #A78BFA)'
                  : c > 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.08)',
                transition: 'height 280ms ease',
              }} />
            </div>
          )
        })}
        {DOW.map((d, i) => (
          <div key={`l${i}`} style={{
            fontSize: '0.72rem',
            fontWeight: topWeekday?.dow === i ? 700 : 500,
            color: topWeekday?.dow === i ? '#fff' : 'rgba(255,255,255,0.55)',
            textAlign: 'center',
          }}>{d}</div>
        ))}
      </div>

      {topWeekday && (
        <p style={{ margin: '24px 0 0', fontSize: '0.95rem', fontWeight: 500, opacity: 0.8 }}>
          {topWeekday.label}요일에 {topWeekday.count}번 달렸어요
        </p>
      )}
    </CardShell>
  )
}
