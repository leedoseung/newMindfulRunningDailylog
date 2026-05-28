'use client'

import { useState } from 'react'
import type { RunLog } from '@/domain/entities/run-log'

type Props = {
  run: RunLog
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

export function MyRecordCard({ run, deleting, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      style={{
        margin: '0 22px 8px', background: '#fff', borderRadius: '16px',
        padding: '16px 18px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
        opacity: deleting ? 0.5 : 1, transition: 'opacity 0.2s', position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.65rem', color: '#888', marginBottom: '4px' }}>
            {formatDate(run.date)} · {run.location || '장소 미입력'} · {run.durationMin}분
          </div>
          <div style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.88rem', fontWeight: 500, color: '#111111' }}>
            {run.title || '제목 없음'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '1.1rem', color: '#ccc', padding: '0 0 0 12px', lineHeight: 1,
            letterSpacing: '2px',
          }}
        >
          ···
        </button>
      </div>

      {menuOpen && (
        <div
          style={{
            position: 'absolute', top: '44px', right: '16px', zIndex: 10,
            background: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            overflow: 'hidden', minWidth: '100px',
          }}
        >
          <button
            type="button"
            onClick={() => { setMenuOpen(false); onEdit() }}
            style={{ display: 'block', width: '100%', padding: '12px 18px', textAlign: 'left', border: 'none', background: 'none', fontSize: '0.82rem', color: '#111111', cursor: 'pointer' }}
          >
            수정
          </button>
          <button
            type="button"
            onClick={() => { setMenuOpen(false); onDelete() }}
            style={{ display: 'block', width: '100%', padding: '12px 18px', textAlign: 'left', border: 'none', background: 'none', fontSize: '0.82rem', color: '#ef4444', cursor: 'pointer' }}
          >
            삭제
          </button>
        </div>
      )}
    </div>
  )
}
