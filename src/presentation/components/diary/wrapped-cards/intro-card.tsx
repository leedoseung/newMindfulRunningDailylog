'use client'

import { CardShell } from './card-shell'

type Props = {
  memberName: string
  year: number
  month: number
}

export function IntroCard({ memberName, year, month }: Props) {
  return (
    <CardShell
      label="인트로 카드"
      bg="linear-gradient(180deg, #0F172A, #1E1B4B)"
    >
      <p
        style={{
          margin: '0 0 8px',
          fontSize: '0.875rem',
          fontWeight: 400,
          opacity: 0.7,
          letterSpacing: '0.05em',
        }}
      >
        {memberName}
      </p>

      <h1
        style={{
          margin: '0 0 12px',
          fontSize: '3.4rem',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
        }}
      >
        {year}.{month}
      </h1>

      <p
        style={{
          margin: '0 0 40px',
          fontSize: '1.25rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        너의 한 달
      </p>

      <p
        style={{
          margin: 0,
          fontSize: '0.875rem',
          fontWeight: 400,
          opacity: 0.55,
          letterSpacing: '0.02em',
        }}
      >
        탭해서 시작
      </p>
    </CardShell>
  )
}
