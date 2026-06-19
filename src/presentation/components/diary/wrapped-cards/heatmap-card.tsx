'use client'

import { CardShell } from './card-shell'

type Props = {
  year: number
  month: number
  runDates: string[]
  totalRuns: number
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function firstDow(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}

export function HeatmapCard({ year, month, runDates, totalRuns }: Props) {
  const days = daysInMonth(year, month)
  const startDow = firstDow(year, month)
  const runSet = new Set(runDates)
  const ym = `${year}-${String(month).padStart(2, '0')}`

  const cells: Array<{ day: number | null; ran: boolean }> = []
  for (let i = 0; i < startDow; i++) cells.push({ day: null, ran: false })
  for (let d = 1; d <= days; d++) {
    const dateStr = `${ym}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, ran: runSet.has(dateStr) })
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, ran: false })

  return (
    <CardShell label="달력 카드" bg="linear-gradient(180deg, #0F172A 0%, #1E1B4B 100%)">
      <p style={{ margin: '0 0 6px', fontSize: '0.9rem', fontWeight: 500, opacity: 0.65, letterSpacing: '0.06em' }}>
        {year}.{month}
      </p>

      <p style={{
        margin: '0 0 24px',
        fontSize: '1.7rem',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        background: 'linear-gradient(90deg, #F472B6, #A78BFA)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        한 달의 모양
      </p>

      <div style={{ width: '100%', maxWidth: 320 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          marginBottom: 6,
        }}>
          {['일','월','화','수','목','금','토'].map(d => (
            <div key={d} style={{ fontSize: '0.62rem', fontWeight: 500, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>{d}</div>
          ))}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
        }}>
          {cells.map((c, i) => (
            <div
              key={i}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 4,
                background: c.day === null
                  ? 'transparent'
                  : c.ran
                    ? 'linear-gradient(135deg, #F472B6, #A78BFA)'
                    : 'rgba(255,255,255,0.06)',
                boxShadow: c.ran ? '0 4px 12px rgba(167,139,250,0.45)' : 'none',
                display: 'grid',
                placeItems: 'center',
                fontSize: '0.55rem',
                fontWeight: 600,
                color: c.ran ? '#fff' : 'rgba(255,255,255,0.35)',
              }}
            >
              {c.day !== null && c.day}
            </div>
          ))}
        </div>
      </div>

      <p style={{ margin: '20px 0 0', fontSize: '0.95rem', fontWeight: 500, opacity: 0.8 }}>
        {totalRuns}개의 빛나는 날
      </p>
    </CardShell>
  )
}
