import type { RunLog } from '@/domain/entities/run-log'

type Props = {
  run: RunLog
  onClick: (run: RunLog) => void
}

export function RunCard({ run, onClick }: Props) {
  const hasPhoto = run.photoUrl !== ''

  const style: React.CSSProperties = hasPhoto
    ? {
        backgroundImage: `url(${run.photoUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {}

  return (
    <button
      type="button"
      onClick={() => onClick(run)}
      className={[
        'relative w-full rounded-2xl overflow-hidden text-left transition-transform active:scale-95',
        hasPhoto ? 'h-48' : 'h-28 bg-card',
      ].join(' ')}
      style={style}
    >
      {hasPhoto && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      )}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <div className="text-2xl font-bold font-display text-white leading-none">
          {run.durationMin}분
        </div>
        <div className="text-xs text-white/50 mt-1">{run.memberName}</div>
        {run.title && (
          <div className="text-xs text-white/60 mt-0.5 line-clamp-1">{run.title}</div>
        )}
      </div>
    </button>
  )
}
