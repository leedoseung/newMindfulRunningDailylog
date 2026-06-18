'use client'

import { CardShell } from './card-shell'

type Props = {
  totalRuns: number
  totalMinutes: number
}

export function TotalCard({ totalRuns, totalMinutes }: Props) {
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  return (
    <CardShell
      label="총 달리기 카드"
      bg="linear-gradient(180deg, #0F172A, #1E1B4B)"
    >
      <p
        style={{
          margin: '0 0 16px',
          fontSize: '1rem',
          fontWeight: 400,
          opacity: 0.7,
          letterSpacing: '-0.01em',
        }}
      >
        이번 달 너는
      </p>

      <p
        style={{
          margin: '0 0 4px',
          fontSize: '4.5rem',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.05,
          background: 'linear-gradient(90deg, #F472B6, #A78BFA)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {totalRuns}번
      </p>

      <p
        style={{
          margin: '0 0 24px',
          fontSize: '1.5rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        달렸어
      </p>

      <p
        style={{
          margin: 0,
          fontSize: '1rem',
          fontWeight: 400,
          opacity: 0.75,
        }}
      >
        총 {hours}시간 {mins}분
      </p>
    </CardShell>
  )
}
