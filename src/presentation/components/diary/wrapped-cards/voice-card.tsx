'use client'

import type { RunLog } from '@/domain/entities/run-log'
import { CardShell } from './card-shell'

type Props = {
  quote: {
    run: RunLog
    text: string
  }
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  return `${parts[1]}.${parts[2]}`
}

export function VoiceCard({ quote }: Props) {
  const dateFmt = formatDate(quote.run.date)

  return (
    <CardShell
      label="너의 한 마디 카드"
      bg="#FAFAFA"
      textColor="#111"
    >
      <p
        style={{
          margin: '0 0 20px',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.1em',
          opacity: 0.5,
          textTransform: 'uppercase',
        }}
      >
        너의 한 마디
      </p>

      <p
        style={{
          margin: '0 0 24px',
          fontSize: '1.4rem',
          fontWeight: 700,
          fontStyle: 'italic',
          lineHeight: 1.55,
          letterSpacing: '-0.02em',
          maxWidth: '320px',
          color: '#111',
        }}
      >
        &ldquo;{quote.text}&rdquo;
      </p>

      <p
        style={{
          margin: 0,
          fontSize: '0.8125rem',
          fontWeight: 400,
          opacity: 0.55,
          letterSpacing: '0.02em',
        }}
      >
        {dateFmt} · {quote.run.title}
      </p>
    </CardShell>
  )
}
