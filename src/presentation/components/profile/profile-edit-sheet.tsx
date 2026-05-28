'use client'

import { useState, useEffect } from 'react'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = {
  open: boolean
  name: string
  generation: string
  instaId: string
  onClose: () => void
  onSaved: (updated: { name: string; generation: string; instaId: string }) => void
}

export function ProfileEditSheet({ open, name, generation, instaId, onClose, onSaved }: Props) {
  const [nameVal, setNameVal]   = useState(name)
  const [genVal, setGenVal]     = useState(generation)
  const [instaVal, setInstaVal] = useState(instaId)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (open) {
      setNameVal(name)
      setGenVal(generation)
      setInstaVal(instaId)
      setError('')
    }
  }, [open, name, generation, instaId])

  async function handleSave() {
    if (!nameVal.trim()) { setError('이름을 입력해주세요'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameVal.trim(), generation: genVal.trim(), instaId: instaVal.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? '저장 실패')
      }
      onSaved({ name: nameVal.trim(), generation: genVal.trim(), instaId: instaVal.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#F7F7F5', border: 'none', borderRadius: 14,
    padding: '14px 16px', fontFamily: FONT, fontSize: '0.92rem', color: '#111',
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: FONT, fontSize: '0.58rem', fontWeight: 600, color: '#999',
    letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8, display: 'block',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          zIndex: 200, opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderRadius: '24px 24px 0 0',
        zIndex: 201, padding: '0 0 40px',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E5E5E5' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 22px 20px',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: '0.88rem', color: '#888', padding: 0 }}
          >
            취소
          </button>
          <span style={{ fontFamily: FONT, fontSize: '0.92rem', fontWeight: 600, color: '#111' }}>프로필 수정</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: FONT, fontSize: '0.88rem', fontWeight: 600,
              color: saving ? '#ccc' : '#111', padding: 0,
            }}
          >
            {saving ? '저장 중' : '저장'}
          </button>
        </div>

        {/* Fields */}
        <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>이름</label>
            <input
              type="text"
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              placeholder="이름"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>기수</label>
            <input
              type="text"
              value={genVal}
              onChange={e => setGenVal(e.target.value)}
              placeholder="예: 3"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>인스타그램 ID</label>
            <input
              type="text"
              value={instaVal}
              onChange={e => setInstaVal(e.target.value.replace(/^@/, ''))}
              placeholder="instagram_id"
              style={{ ...inputStyle, fontFamily: 'monospace' }}
            />
          </div>

          {error && (
            <div style={{ fontSize: '0.78rem', color: '#ef4444' }}>{error}</div>
          )}
        </div>
      </div>
    </>
  )
}
