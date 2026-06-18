'use client'

import type { RunLog } from '@/domain/entities/run-log'
import { CardShell } from './card-shell'

type Props = {
  run: RunLog
}

function formatDate(dateStr: string): string {
  // dateStr = 'YYYY-MM-DD'
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  return `${parts[1]}.${parts[2]}`
}

export function LongestCard({ run }: Props) {
  const hours = Math.floor(run.durationMin / 60)
  const mins = run.durationMin % 60
  const dateFmt = formatDate(run.date)

  const bg = run.photoUrl
    ? `linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.7) 100%), url(${run.photoUrl}) center / cover`
    : 'linear-gradient(135deg, #FB7185, #F472B6)'

  const quote =
    run.thoughtAfter.length > 50
      ? run.thoughtAfter.slice(0, 50) + '…'
      : run.thoughtAfter

  return (
    <CardShell label="가장 길게 달린 날 카드" bg={bg}>
      <p
        style={{
          margin: '0 0 12px',
          fontSize: '0.875rem',
          fontWeight: 400,
          opacity: 0.8,
          letterSpacing: '0.02em',
        }}
      >
        가장 길게 달린 날
      </p>

      <p
        style={{
          margin: '0 0 8px',
          fontSize: '2.4rem',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
        }}
      >
        {hours}h {mins}m
      </p>

      <p
        style={{
          margin: '0 0 24px',
          fontSize: '0.875rem',
          fontWeight: 400,
          opacity: 0.8,
        }}
      >
        {run.location} · {dateFmt}
      </p>

      {quote && (
        <p
          style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 400,
            fontStyle: 'italic',
            opacity: 0.9,
            maxWidth: '320px',
            lineHeight: 1.55,
          }}
        >
          &ldquo;{quote}&rdquo;
        </p>
      )}
    </CardShell>
  )
}
