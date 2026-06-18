'use client'

import { CardShell } from './card-shell'

type Props = {
  maxStreak: number
  streakLastDows: string[]
}

export function StreakCard({ maxStreak, streakLastDows }: Props) {
  return (
    <CardShell
      label="연속 달리기 스트릭 카드"
      bg="linear-gradient(180deg, #1E1B4B, #7C2D92)"
    >
      <p
        style={{
          margin: '0 0 8px',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.12em',
          opacity: 0.7,
          textTransform: 'uppercase',
        }}
      >
        STREAK
      </p>

      <p
        style={{
          margin: '0 0 8px',
          fontSize: '5rem',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.05,
        }}
      >
        {maxStreak}일
      </p>

      <p
        style={{
          margin: '0 0 40px',
          fontSize: '1rem',
          fontWeight: 400,
          opacity: 0.8,
          letterSpacing: '-0.01em',
        }}
      >
        연속 달리기 최장 기록
      </p>

      {streakLastDows.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {streakLastDows.map((dow, i) => (
            <span
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#F472B6',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 700,
              }}
            >
              {dow}
            </span>
          ))}
        </div>
      )}
    </CardShell>
  )
}
