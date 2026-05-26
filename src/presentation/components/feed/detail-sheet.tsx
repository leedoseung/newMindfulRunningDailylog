'use client'

import type { RunLog } from '@/domain/entities/run-log'

type Props = {
  run: RunLog | null
  open: boolean
  onClose: () => void
}

export function DetailSheet({ run, open, onClose }: Props) {
  if (!run) return null

  const bgStyle: React.CSSProperties = run.photoUrl
    ? {
        backgroundImage: `url(${run.photoUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transform: open ? 'scale(1)' : 'scale(1.06)',
        transition: 'transform 0.4s ease',
      }
    : { background: '#111' }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        data-testid="detail-sheet-backdrop"
        className="absolute inset-0"
        style={bgStyle}
        onClick={onClose}
      />
      {/* Glass panel */}
      <div
        data-testid="detail-sheet"
        className="absolute bottom-0 left-0 right-0 p-6 pb-10"
        style={{
          backdropFilter: 'blur(22px)',
          background: 'rgba(0,0,0,0.22)',
          borderRadius: '26px 26px 0 0',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s ease',
        }}
      >
        <div className="text-4xl font-bold font-display text-white leading-none mb-1">
          {run.durationMin}분
        </div>
        <div className="text-sm text-white/60 mb-4">
          <span>{run.memberName}</span>
          {' · '}
          {run.date}
          {run.location ? ` · ${run.location}` : ''}
        </div>
        {run.title && (
          <div className="text-base text-white font-medium mb-4">{run.title}</div>
        )}
        <div className="space-y-3 text-sm text-white/80">
          {run.thoughtBefore && (
            <div>
              <span className="text-white/40 text-xs">달리기 전</span>
              <p className="mt-0.5">{run.thoughtBefore}</p>
            </div>
          )}
          {run.thoughtDuring && (
            <div>
              <span className="text-white/40 text-xs">달리는 중</span>
              <p className="mt-0.5">{run.thoughtDuring}</p>
            </div>
          )}
          {run.thoughtAfter && (
            <div>
              <span className="text-white/40 text-xs">달리기 후</span>
              <p className="mt-0.5">{run.thoughtAfter}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
