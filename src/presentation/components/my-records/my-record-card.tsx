'use client'

import { useEffect, useRef, useState } from 'react'
import type { RunLog } from '@/domain/entities/run-log'

type Props = {
  run: RunLog
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
  onOpen?: () => void
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

const SHORT_MONTH = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

export function MyRecordCard({ run, deleting, onEdit, onDelete, onOpen }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const d = new Date(run.date + 'T00:00:00')
  const month = SHORT_MONTH[d.getMonth()]
  const day = d.getDate()
  const weekday = d.toLocaleDateString('ko-KR', { weekday: 'short' })

  function handleRowClick(e: React.MouseEvent) {
    if (!onOpen) return
    const target = e.target as HTMLElement
    if (target.closest('[data-row-stop]')) return
    onOpen()
  }

  return (
    <div
      ref={rootRef}
      onClick={handleRowClick}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } } : undefined}
      className={onOpen ? 'focus-ring' : undefined}
      style={{
        position: 'relative',
        display: 'grid', gridTemplateColumns: '52px 1fr auto',
        gap: 14, alignItems: 'center',
        padding: '14px 20px',
        background: 'var(--mr-surface)',
        borderBottom: '1px solid var(--mr-divider)',
        opacity: deleting ? 0.5 : 1, transition: 'opacity 0.2s',
        fontFamily: FONT,
        cursor: onOpen ? 'pointer' : 'default',
      }}
    >
      <div style={{
        textAlign: 'center', padding: '8px 0',
        background: 'var(--mr-surface-2)', borderRadius: 10, border: '1px solid var(--mr-border)',
        lineHeight: 1.2,
      }}>
        <div style={{ fontSize: '0.6rem', color: 'var(--mr-text-2)', fontWeight: 600, letterSpacing: 0.2 }}>{month}</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--mr-text-1)', lineHeight: 1 }}>{day}</div>
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '0.95rem', fontWeight: 600, color: 'var(--mr-text-1)',
          marginBottom: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {run.title || '제목 없음'}
        </div>
        <div style={{
          fontSize: '0.75rem', color: 'var(--mr-text-2)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {weekday} · {run.location || '장소 미입력'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '0.95rem', fontWeight: 700, color: 'var(--mr-text-1)',
            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          }}>{run.durationMin}<span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--mr-text-2)', marginLeft: 2 }}>분</span></div>
        </div>
        <button
          type="button"
          aria-label="메뉴"
          data-row-stop
          className="focus-ring"
          onClick={() => setMenuOpen(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--mr-text-3)', padding: '6px 4px 6px 8px', lineHeight: 1,
            fontSize: '1.1rem', letterSpacing: 1,
          }}
        >
          ⋯
        </button>
      </div>

      {menuOpen && (
        <div data-row-stop style={{
          position: 'absolute', top: '52px', right: '12px', zIndex: 20,
          background: 'var(--mr-surface)', borderRadius: 12,
          boxShadow: 'var(--mr-shadow-pop)',
          overflow: 'hidden', minWidth: 120,
          border: '1px solid var(--mr-border)',
        }}>
          <button type="button" onClick={() => { setMenuOpen(false); onEdit() }}
            style={{ display: 'block', width: '100%', padding: '12px 18px', textAlign: 'left', border: 'none', background: 'none', fontSize: '0.85rem', color: 'var(--mr-text-1)', cursor: 'pointer', fontFamily: FONT }}>
            수정
          </button>
          <div style={{ height: 1, background: 'var(--mr-divider)' }} />
          <button type="button" onClick={() => { setMenuOpen(false); onDelete() }}
            style={{ display: 'block', width: '100%', padding: '12px 18px', textAlign: 'left', border: 'none', background: 'none', fontSize: '0.85rem', color: 'var(--mr-danger)', cursor: 'pointer', fontFamily: FONT }}>
            삭제
          </button>
        </div>
      )}
    </div>
  )
}
