'use client'

import { useEffect, useState } from 'react'

type Props = {
  count: number
  goal: number              // bonus goal (default 100)
  goalMin?: number          // stamp threshold (default 10)
  note?: string | null
  onSave: (next: number, note: string | null) => void
  onRest?: () => void
  disabled?: boolean
  restAvailable?: boolean   // weekly rest budget remaining
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const GOLD = '#d4a017'
const GREEN = '#1e7e34'
const RED = '#b8231f'
const NOTE_MAX = 50

export function TodayCounter({
  count, goal, goalMin = 10, note = null, onSave, onRest,
  disabled = false, restAvailable = true,
}: Props) {
  const [input, setInput] = useState<string>(String(count))
  const [noteInput, setNoteInput] = useState<string>(note ?? '')

  useEffect(() => { setInput(String(count)) }, [count])
  useEffect(() => { setNoteInput(note ?? '') }, [note])

  const parsed = Number(input)
  const valid = Number.isFinite(parsed) && parsed >= 0
  const countChanged = valid && parsed !== count
  const noteChanged = (noteInput || '') !== (note ?? '')
  const changed = countChanged || (valid && noteChanged)
  const stamped = count >= goalMin
  const over = count > goal
  const ratio = Math.min(count / goal, 1)
  const ringDeg = ratio * 360

  let ringColor = '#EBEBEB'
  let stampLabel = `최소 ${goalMin}개로 도장이 찍혀요`
  if (over) { ringColor = GOLD; stampLabel = `골드 보너스 +${count - goal}` }
  else if (stamped) { ringColor = RED; stampLabel = `오늘 도장 완료 (${count}/${goal})` }

  return (
    <section
      style={{
        fontFamily: FONT, background: '#fff',
        border: '1px solid #EBEBEB', borderRadius: 18, padding: 24,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
      }}
    >
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: over
              ? `conic-gradient(${GOLD} 0deg 360deg)`
              : `conic-gradient(${stamped ? RED : '#111'} 0deg ${ringDeg}deg, #EBEBEB ${ringDeg}deg 360deg)`,
          }}
        />
        <div style={{
          position: 'absolute', inset: 10, borderRadius: '50%', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        }}>
          <span style={{
            fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1,
            color: over ? GOLD : stamped ? RED : '#111',
          }}>
            {count}
          </span>
          <span style={{ fontSize: 12, color: '#888', marginTop: 4 }}>/ {goal}</span>
        </div>
      </div>

      <div aria-live="polite" style={{
        fontSize: 12, fontWeight: 600,
        color: over ? GOLD : stamped ? RED : '#666',
      }}>
        {stampLabel}
      </div>

      <div style={{ display: 'flex', gap: 8, width: '100%', alignItems: 'stretch' }}>
        <input
          type="number" inputMode="numeric" min={0} step={1}
          value={input} disabled={disabled}
          aria-label="런지 횟수"
          onChange={(e) => setInput(e.target.value)}
          style={{
            flex: 1, minWidth: 0, padding: '12px 14px',
            fontSize: 16, fontWeight: 600, fontFamily: FONT,
            background: '#fff', border: '1px solid #EBEBEB',
            borderRadius: 12, color: '#111', textAlign: 'center',
          }}
        />
        <button
          type="button"
          disabled={disabled || !valid || !changed}
          onClick={() => valid && onSave(parsed, noteInput.trim() || null)}
          style={{
            flex: 1, padding: '12px 0',
            fontSize: 14, fontWeight: 600, fontFamily: FONT,
            background: disabled || !valid || !changed ? '#f0f0ee' : '#111',
            color: disabled || !valid || !changed ? '#888' : '#fff',
            border: 'none', borderRadius: 12,
            cursor: disabled || !valid || !changed ? 'not-allowed' : 'pointer',
          }}
        >
          저장
        </button>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="mindful-note" style={{ fontSize: 11, color: '#888', fontFamily: FONT }}>
          오늘 한 줄 ({noteInput.length}/{NOTE_MAX})
        </label>
        <input
          id="mindful-note"
          type="text"
          maxLength={NOTE_MAX}
          value={noteInput}
          placeholder="기분, 호흡, 자세… 오늘 어땠나요?"
          disabled={disabled}
          onChange={(e) => setNoteInput(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px',
            fontSize: 13, fontFamily: FONT,
            background: '#FAFAF8', border: '1px solid #EBEBEB',
            borderRadius: 10, color: '#111',
          }}
        />
      </div>

      {onRest && (
        <button
          type="button"
          onClick={onRest}
          disabled={disabled || !restAvailable}
          style={{
            width: '100%', padding: '10px 0',
            fontSize: 13, fontWeight: 600, fontFamily: FONT,
            background: 'transparent',
            color: restAvailable ? GREEN : '#bbb',
            border: `1px dashed ${restAvailable ? GREEN : '#ddd'}`,
            borderRadius: 12,
            cursor: !disabled && restAvailable ? 'pointer' : 'not-allowed',
          }}
          title={restAvailable ? '주 1회 휴식 가능' : '이번 주 휴식권을 모두 사용했어요'}
        >
          {restAvailable ? '🌿 오늘은 쉬어가요' : '이번 주 휴식 끝'}
        </button>
      )}

      {!valid && (
        <div role="alert" style={{ fontSize: 12, color: RED }}>
          0 이상 숫자를 입력하세요
        </div>
      )}
    </section>
  )
}
