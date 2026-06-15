'use client'

import { useEffect, useState } from 'react'

type Props = {
  count: number               // cumulative count today (from server)
  goal: number                // bonus goal (default 100)
  goalMin?: number            // stamp threshold (default 10)
  note?: string | null
  onAdd: (delta: number, note: string | null) => void
  onSetAbsolute?: (next: number, note: string | null) => void
  onRest?: () => void
  disabled?: boolean
  restAvailable?: boolean
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const GOLD = '#d4a017'
const GREEN = '#1e7e34'
const RED = '#b8231f'
const NOTE_MAX = 50

export function TodayCounter({
  count, goal, goalMin = 10, note = null, onAdd, onSetAbsolute, onRest,
  disabled = false, restAvailable = true,
}: Props) {
  const [delta, setDelta] = useState<string>('')
  const [noteInput, setNoteInput] = useState<string>(note ?? '')
  const [editMode, setEditMode] = useState(false)
  const [editValue, setEditValue] = useState<string>(String(count))

  useEffect(() => { setNoteInput(note ?? '') }, [note])
  useEffect(() => { setEditValue(String(count)) }, [count])

  const parsedDelta = Number(delta)
  const validDelta = Number.isFinite(parsedDelta) && parsedDelta > 0
  const parsedEdit = Number(editValue)
  const validEdit = Number.isFinite(parsedEdit) && parsedEdit >= 0

  const stamped = count >= goalMin
  const over = count > goal
  const ratio = Math.min(count / goal, 1)
  const ringDeg = ratio * 360

  let stampLabel = `최소 ${goalMin}개로 도장이 찍혀요`
  if (over) stampLabel = `골드 보너스 +${count - goal}`
  else if (stamped) stampLabel = `오늘 도장 완료 (${count}/${goal})`

  function handleAdd() {
    if (!validDelta || disabled) return
    onAdd(parsedDelta, noteInput.trim() || null)
    setDelta('')
  }

  function handleEditSave() {
    if (!validEdit || !onSetAbsolute) return
    onSetAbsolute(parsedEdit, noteInput.trim() || null)
    setEditMode(false)
  }

  return (
    <section
      style={{
        fontFamily: FONT, background: '#fff',
        border: '1px solid #EBEBEB', borderRadius: 18, padding: 24,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
      }}
    >
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: over
            ? `conic-gradient(${GOLD} 0deg 360deg)`
            : `conic-gradient(${stamped ? RED : '#111'} 0deg ${ringDeg}deg, #EBEBEB ${ringDeg}deg 360deg)`,
        }} />
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

      {!editMode && (
        <>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="add-input" style={{ fontSize: 11, color: '#888', fontFamily: FONT }}>
              이번에 추가할 횟수
            </label>
            <div style={{ display: 'flex', gap: 8, width: '100%', alignItems: 'stretch' }}>
              <input
                id="add-input"
                type="number" inputMode="numeric" min={1} step={1}
                value={delta} disabled={disabled}
                placeholder="예: 30"
                aria-label="이번에 추가할 횟수"
                onChange={(e) => setDelta(e.target.value)}
                style={{
                  flex: 1, minWidth: 0, padding: '12px 14px',
                  fontSize: 16, fontWeight: 600, fontFamily: FONT,
                  background: '#fff', border: '1px solid #EBEBEB',
                  borderRadius: 12, color: '#111', textAlign: 'center',
                }}
              />
              <button
                type="button"
                disabled={disabled || !validDelta}
                onClick={handleAdd}
                style={{
                  flex: 1, padding: '12px 0',
                  fontSize: 14, fontWeight: 600, fontFamily: FONT,
                  background: disabled || !validDelta ? '#f0f0ee' : '#111',
                  color: disabled || !validDelta ? '#888' : '#fff',
                  border: 'none', borderRadius: 12,
                  cursor: disabled || !validDelta ? 'not-allowed' : 'pointer',
                }}
              >
                저장
              </button>
            </div>
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
            >
              {restAvailable ? '🌿 오늘은 쉬어가요' : '이번 주 휴식 끝'}
            </button>
          )}

          {onSetAbsolute && (
            <button
              type="button"
              onClick={() => setEditMode(true)}
              disabled={disabled}
              style={{
                background: 'none', border: 'none',
                color: '#888', fontSize: 12, fontFamily: FONT,
                textDecoration: 'underline', cursor: 'pointer', padding: 0,
              }}
            >
              오늘 누적 횟수 수정
            </button>
          )}
        </>
      )}

      {editMode && onSetAbsolute && (
        <>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="edit-input" style={{ fontSize: 11, color: '#888', fontFamily: FONT }}>
              누적 횟수를 직접 입력 (덮어쓰기)
            </label>
            <input
              id="edit-input"
              type="number" inputMode="numeric" min={0} step={1}
              value={editValue} disabled={disabled}
              aria-label="누적 런지 횟수"
              onChange={(e) => setEditValue(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px',
                fontSize: 16, fontWeight: 600, fontFamily: FONT,
                background: '#fff', border: '1px solid #EBEBEB',
                borderRadius: 12, color: '#111', textAlign: 'center',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button
              type="button"
              onClick={() => { setEditMode(false); setEditValue(String(count)) }}
              style={{
                flex: 1, padding: '12px 0',
                fontSize: 14, fontWeight: 600, fontFamily: FONT,
                background: '#f0f0ee', color: '#666',
                border: 'none', borderRadius: 12, cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              type="button"
              disabled={disabled || !validEdit}
              onClick={handleEditSave}
              style={{
                flex: 1, padding: '12px 0',
                fontSize: 14, fontWeight: 600, fontFamily: FONT,
                background: !validEdit || disabled ? '#f0f0ee' : '#111',
                color: !validEdit || disabled ? '#888' : '#fff',
                border: 'none', borderRadius: 12,
                cursor: !validEdit || disabled ? 'not-allowed' : 'pointer',
              }}
            >
              덮어쓰기 저장
            </button>
          </div>
        </>
      )}

      {!editMode && delta && !validDelta && (
        <div role="alert" style={{ fontSize: 12, color: RED }}>
          1 이상 숫자를 입력하세요
        </div>
      )}
    </section>
  )
}
