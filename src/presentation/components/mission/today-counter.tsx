'use client'

import { useEffect, useState } from 'react'

type Props = {
  count: number
  goal: number
  onSave: (next: number) => void
  disabled?: boolean
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const GOLD = '#d4a017'

export function TodayCounter({ count, goal, onSave, disabled = false }: Props) {
  const [input, setInput] = useState<string>(String(count))

  useEffect(() => {
    setInput(String(count))
  }, [count])

  const parsed = Number(input)
  const valid = Number.isFinite(parsed) && parsed >= 0
  const changed = valid && parsed !== count
  const over = count > goal
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
            background: over
              ? `conic-gradient(${GOLD} 0deg 360deg)`
              : `conic-gradient(#111 0deg ${ringDeg}deg, #EBEBEB ${ringDeg}deg 360deg)`,
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
          <span style={{
            fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1,
            color: over ? GOLD : '#111',
          }}>
            {count}
          </span>
          <span style={{ fontSize: 12, color: '#888', marginTop: 4 }}>/ {goal}</span>
        </div>
      </div>
      {over && (
        <div
          aria-label={`목표 초과 ${count - goal}개`}
          style={{
            fontSize: 12, fontWeight: 600, color: GOLD,
            background: '#FFF6E0', padding: '5px 11px', borderRadius: 999,
            marginTop: -8,
          }}
        >
          +{count - goal}개 초과 달성 🔥
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, width: '100%', alignItems: 'stretch' }}>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={input}
          disabled={disabled}
          aria-label="런지 횟수"
          onChange={(e) => setInput(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '12px 14px',
            fontSize: 16,
            fontWeight: 600,
            fontFamily: FONT,
            background: '#fff',
            border: '1px solid #EBEBEB',
            borderRadius: 12,
            color: '#111',
            textAlign: 'center',
          }}
        />
        <button
          type="button"
          disabled={disabled || !valid || !changed}
          onClick={() => valid && onSave(parsed)}
          style={{
            flex: 1,
            padding: '12px 0',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: FONT,
            background: disabled || !valid || !changed ? '#f0f0ee' : '#111',
            color: disabled || !valid || !changed ? '#888' : '#fff',
            border: 'none',
            borderRadius: 12,
            cursor: disabled || !valid || !changed ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          저장
        </button>
      </div>
      {!valid && (
        <div role="alert" style={{ fontSize: 12, color: '#b8231f' }}>
          0 이상 숫자를 입력하세요
        </div>
      )}
    </section>
  )
}
