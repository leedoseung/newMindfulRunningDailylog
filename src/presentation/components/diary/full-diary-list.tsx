import type { RunLog } from '@/domain/entities/run-log'

const DOW = ['일', '월', '화', '수', '목', '금', '토'] as const

function fmtDate(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}.${dd} ${DOW[d.getDay()]}`
}

type Props = {
  runs: RunLog[]
  year: number
  month: number
  memberId: string
  memberName: string
}

export function FullDiaryList({ runs, year, month, memberId, memberName }: Props) {
  const wrappedUrl = `/diary/${memberId}/${year}-${String(month).padStart(2, '0')}`

  return (
    <div
      style={{
        fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
        background: '#0a0a0a',
        color: '#f0f0f0',
        minHeight: '100vh',
        padding: '0 0 80px',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '40px 20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '1.8rem',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
          }}
        >
          {year}.{String(month).padStart(2, '0')} · {memberName}
        </h1>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: '0.875rem',
            fontWeight: 400,
            opacity: 0.5,
          }}
        >
          {runs.length}번의 달리기
        </p>
      </div>

      {/* Run cards */}
      <div style={{ padding: '16px 20px 0' }}>
        {runs.length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              opacity: 0.4,
              fontSize: '0.9rem',
              marginTop: '60px',
            }}
          >
            이 달의 달리기 기록이 없습니다.
          </p>
        ) : (
          runs.map((run) => <RunCard key={run.id} run={run} />)
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: '48px',
          padding: '0 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <a
          href={wrappedUrl}
          style={{
            display: 'inline-block',
            fontSize: '0.875rem',
            color: '#f0f0f0',
            opacity: 0.7,
            textDecoration: 'none',
            padding: '10px 20px',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
          }}
        >
          ← Wrapped로 돌아가기
        </a>
        <p
          style={{
            margin: 0,
            fontSize: '0.75rem',
            opacity: 0.3,
            textAlign: 'center',
          }}
        >
          Daily Mindful Running · daily-running.app
        </p>
      </div>
    </div>
  )
}

function RunCard({ run }: { run: RunLog }) {
  const hasPhoto = Boolean(run.photoUrl)
  const hasBefore = run.thoughtBefore.trim() !== ''
  const hasDuring = run.thoughtDuring.trim() !== ''
  const hasAfter = run.thoughtAfter.trim() !== ''
  const hasAnyThought = hasBefore || hasDuring || hasAfter

  const metaParts: string[] = []
  if (run.durationMin > 0) metaParts.push(`${run.durationMin}분`)
  if (run.location.trim()) metaParts.push(run.location.trim())
  if (run.runTime) metaParts.push(run.runTime)

  return (
    <div
      style={{
        marginBottom: '20px',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Card header */}
      <div style={{ padding: '16px 16px 12px' }}>
        <p
          style={{
            margin: '0 0 4px',
            fontSize: '0.8rem',
            fontWeight: 500,
            opacity: 0.5,
            letterSpacing: '0.02em',
          }}
        >
          {fmtDate(run.date)}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            lineHeight: 1.4,
          }}
        >
          {run.title}
        </p>
      </div>

      {/* Photo */}
      {hasPhoto && (
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            overflow: 'hidden',
            background: '#1a1a1a',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={run.photoUrl}
            alt={`${run.date} 달리기 사진`}
            loading="lazy"
            decoding="async"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      )}

      {/* Thought blocks */}
      {hasAnyThought && (
        <div style={{ padding: '12px 16px 4px' }}>
          {hasBefore && (
            <ThoughtBlock label="Before" text={run.thoughtBefore} />
          )}
          {hasDuring && (
            <ThoughtBlock label="During" text={run.thoughtDuring} />
          )}
          {hasAfter && (
            <ThoughtBlock label="After" text={run.thoughtAfter} />
          )}
        </div>
      )}

      {/* Meta line */}
      {metaParts.length > 0 && (
        <div
          style={{
            padding: hasAnyThought ? '8px 16px 14px' : '4px 16px 14px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.78rem',
              opacity: 0.4,
              letterSpacing: '0.01em',
            }}
          >
            {metaParts.join(' · ')}
          </p>
        </div>
      )}
    </div>
  )
}

function ThoughtBlock({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <p
        style={{
          margin: '0 0 3px',
          fontSize: '0.72rem',
          fontWeight: 600,
          opacity: 0.45,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '0.9rem',
          lineHeight: 1.6,
          opacity: 0.85,
          whiteSpace: 'pre-wrap',
          wordBreak: 'keep-all',
        }}
      >
        {text}
      </p>
    </div>
  )
}
