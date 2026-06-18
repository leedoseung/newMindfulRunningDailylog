'use client'

import { CardShell } from './card-shell'

type Props = {
  year: number
  month: number
}

export function RestCard({ year, month }: Props) {
  return (
    <CardShell
      label="쉬어가는 달 카드"
      bg="linear-gradient(135deg, #7C2D92, #0F172A)"
    >
      <p
        style={{
          margin: '0 0 16px',
          fontSize: '2.5rem',
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        🌙
      </p>

      <h2
        style={{
          margin: '0 0 8px',
          fontSize: '2rem',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.2,
        }}
      >
        쉬어가는 달
      </h2>

      <p
        style={{
          margin: '0 0 24px',
          fontSize: '0.875rem',
          fontWeight: 400,
          opacity: 0.65,
          letterSpacing: '0.01em',
        }}
      >
        {year}.{month}
      </p>

      <p
        style={{
          margin: 0,
          fontSize: '1.05rem',
          fontWeight: 400,
          opacity: 0.8,
          lineHeight: 1.6,
          maxWidth: '260px',
        }}
      >
        다음 달에 다시 만나자
      </p>
    </CardShell>
  )
}
