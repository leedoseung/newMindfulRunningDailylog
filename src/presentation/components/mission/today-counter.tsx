'use client'

type Props = {
  count: number
  goal: number
  onAdd: (delta: number) => void
  disabled?: boolean
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const DELTAS = [10, 20, 50] as const

export function TodayCounter({ count, goal, onAdd, disabled = false }: Props) {
  const displayCount = Math.min(count, goal)
  const ratio = Math.min(count / goal, 1)
  const ringDeg = ratio * 360

  return (
    <section
      style={{
        fontFamily: FONT,
        background: '#fff',
        border: '1px solid #EBEBEB',
        borderRadius: 18,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `conic-gradient(#111 0deg ${ringDeg}deg, #EBEBEB ${ringDeg}deg 360deg)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 10,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {displayCount}
          </span>
          <span style={{ fontSize: 12, color: '#888', marginTop: 4 }}>/ {goal}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        {DELTAS.map(d => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => onAdd(d)}
            style={{
              flex: 1,
              padding: '12px 0',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: FONT,
              background: disabled ? '#f0f0ee' : '#111',
              color: disabled ? '#888' : '#fff',
              border: 'none',
              borderRadius: 12,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            +{d}
          </button>
        ))}
      </div>
    </section>
  )
}
