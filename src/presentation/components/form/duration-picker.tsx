'use client'

type Props = {
  value: number
  onChange: (v: number) => void
}

const BUTTONS = [
  { delta: -10, label: '-10', sm: true },
  { delta: -1,  label: '-1',  sm: false },
  { delta:  1,  label: '+1',  sm: false },
  { delta:  10, label: '+10', sm: true },
]

export function DurationPicker({ value, onChange }: Props) {
  const adj = (delta: number) => onChange(Math.max(1, value + delta))

  return (
    <div style={{ background: '#2d3031', borderRadius: '20px', padding: '28px 24px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '0.6rem', fontWeight: 600, color: '#555', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>
        Minutes — 제한 없음
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px', marginBottom: '20px' }}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
          style={{
            fontFamily: 'var(--font-raleway)', fontSize: '5rem', fontWeight: 800,
            color: '#fff', lineHeight: 1, letterSpacing: '-3px',
            minWidth: '140px', textAlign: 'center',
            background: 'transparent', border: 'none', outline: 'none',
          }}
        />
        <span style={{ fontSize: '1.1rem', fontWeight: 300, color: '#555' }}>분</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {BUTTONS.map(({ delta, label, sm }) => (
          <button
            key={delta}
            type="button"
            onClick={() => adj(delta)}
            style={{
              background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '12px',
              padding: '12px 0',
              fontFamily: 'var(--font-raleway)',
              fontSize: sm ? '0.78rem' : '0.85rem',
              fontWeight: 700,
              color: sm ? '#888' : '#fff',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: '0.62rem', color: '#444', marginTop: '12px' }}>
        버튼으로 조절하거나 숫자를 직접 탭해 입력하세요
      </div>
    </div>
  )
}
