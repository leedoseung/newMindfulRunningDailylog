import type { MissionDayCell } from '@/domain/entities/mission-day-cell'

type Props = { cell: MissionDayCell }

function seededRotation(date: string): number {
  let hash = 0
  for (let i = 0; i < date.length; i++) hash = ((hash << 5) - hash) + date.charCodeAt(i)
  const norm = (Math.abs(hash) % 1000) / 1000  // 0~1
  return (norm - 0.5) * 16  // -8 ~ +8 deg
}

export function StampCell({ cell }: Props) {
  const rotation = seededRotation(cell.date)

  const base: React.CSSProperties = {
    aspectRatio: '1 / 1',
    position: 'relative',
    borderRadius: '50%',
    transform: `rotate(${rotation}deg)`,
  }

  if (cell.state === 'done') {
    return (
      <div
        data-state="done"
        role="img"
        style={{
          aspectRatio: base.aspectRatio,
          position: 'relative',
          borderRadius: base.borderRadius,
        }}
        aria-label={`Day ${cell.dayIndex + 1} 달성${(cell.excess ?? 0) > 0 ? ` +${cell.excess ?? 0}` : ''}`}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '1.5px solid #111',
            borderRadius: base.borderRadius,
            backgroundImage: "url('/icon-192.png')",
            backgroundSize: '75%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            filter: 'brightness(0) saturate(100%) invert(15%) sepia(95%) saturate(4200%) hue-rotate(355deg) brightness(0.85) contrast(1.1)',
            transform: `rotate(${rotation}deg)`,
          }}
        />
        {(cell.excess ?? 0) > 0 && (
          <span
            data-testid="excess-badge"
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: '#d4a017',
              color: '#fff',
              fontSize: 8,
              fontWeight: 700,
              padding: '1px 4px',
              borderRadius: 999,
              lineHeight: 1,
              border: '1.5px solid #fff',
              minWidth: 14,
              textAlign: 'center',
              zIndex: 2,
            }}
          >
            +{cell.excess ?? 0}
          </span>
        )}
      </div>
    )
  }

  if (cell.state === 'today') {
    return (
      <div
        data-state="today"
        role="img"
        style={{
          ...base,
          border: '2px dashed #111',
          transform: 'none',
        }}
        aria-label={`오늘 (${cell.count}/100)`}
      />
    )
  }

  if (cell.state === 'partial') {
    return (
      <div
        data-state="partial"
        role="img"
        style={{
          ...base,
          border: '1px solid #c8c8c4',
          backgroundImage: "url('/icon-192.png')",
          backgroundSize: '70%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          opacity: 0.45,
        }}
        aria-label={`부분 달성 ${cell.count}/100`}
      />
    )
  }

  if (cell.state === 'rest') {
    return (
      <div
        data-state="rest"
        role="img"
        style={{
          ...base,
          border: '1.5px solid #1e7e34',
          background: '#E8F5EC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          transform: 'none',
        }}
        aria-label={`휴식일${cell.note ? ` (${cell.note})` : ''}`}
        title={cell.note ?? '쉬어가는 날'}
      >
        🌿
      </div>
    )
  }

  if (cell.state === 'pass') {
    return (
      <div
        data-state="pass"
        role="img"
        style={{
          ...base,
          border: '1px solid #c8c8c4',
          background: 'repeating-linear-gradient(45deg, #f0f0ee, #f0f0ee 3px, #fff 3px, #fff 6px)',
        }}
        aria-label="면죄권 사용"
      />
    )
  }

  if (cell.state === 'miss') {
    return (
      <div
        data-state="miss"
        role="img"
        style={{
          ...base,
          border: '1px solid #f0e0e0',
          background: '#fef5f5',
          transform: 'none',
        }}
        aria-label="미달성"
      />
    )
  }

  return (
    <div
      data-state="future"
      role="img"
      style={{
        ...base,
        border: '1px dashed #d8d8d4',
        background: 'transparent',
        opacity: 0.5,
        transform: 'none',
      }}
      aria-label="미래 날짜"
    />
  )
}
