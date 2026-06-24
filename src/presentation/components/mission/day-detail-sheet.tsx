'use client'

import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import { kstDateOf } from '@/lib/kst'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const RED = '#b8231f'
const GOLD = '#d4a017'
const GREEN = '#1e7e34'

type Props = {
  cell: MissionDayCell | null
  goal: number
  onClose: () => void
  revivedAt?: string | null
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${y}년 ${Number(m)}월 ${Number(d)}일`
}

function statusLabel(cell: MissionDayCell, goal: number): { text: string; color: string; bg: string } {
  if (cell.state === 'rest') return { text: '🌿 휴식', color: '#fff', bg: GREEN }
  if (cell.state === 'pass') return { text: '면죄권 사용', color: '#fff', bg: '#888' }
  if (cell.state === 'done') {
    const excess = cell.excess ?? 0
    if (excess > 0) return { text: `골드 보너스 +${excess}`, color: '#fff', bg: GOLD }
    return { text: '도장 완료', color: '#fff', bg: RED }
  }
  if (cell.state === 'partial') return { text: '진행 중', color: '#a37c00', bg: '#FFF6E0' }
  if (cell.state === 'today') return { text: '오늘', color: '#fff', bg: '#111' }
  if (cell.state === 'miss') return { text: '미완료', color: '#888', bg: '#f3f3ef' }
  return { text: '예정', color: '#999', bg: '#f3f3ef' }
}

export function DayDetailSheet({ cell, goal, onClose, revivedAt = null }: Props) {
  if (!cell) return null
  const status = statusLabel(cell, goal)
  // KST anchor matches leaderboard streak anchor
  const isPreRevival = revivedAt != null && cell.date < kstDateOf(revivedAt)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-detail-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'flex-end',
        zIndex: 1000,
        fontFamily: FONT,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', background: '#fff',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '24px 24px 32px',
          maxWidth: 520, margin: '0 auto',
        }}
      >
        <div style={{
          width: 36, height: 4, background: '#ddd', borderRadius: 999,
          margin: '0 auto 16px',
        }} />

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, color: '#888', margin: 0, letterSpacing: '0.05em' }}>
              Day {cell.dayIndex + 1}
            </p>
            <h2 id="day-detail-title" style={{
              fontSize: 18, fontWeight: 700, margin: '4px 0 0', letterSpacing: '-0.01em',
            }}>
              {formatDate(cell.date)}
            </h2>
            {isPreRevival && (
              <span style={{
                display: 'inline-block',
                marginTop: 6,
                fontSize: 11, fontWeight: 600,
                background: '#EDE9FE', color: '#7C3AED',
                padding: '2px 8px', borderRadius: 999,
              }}>
                재도전 이전 기록
              </span>
            )}
          </div>
          <span style={{
            fontSize: 12, fontWeight: 600,
            background: status.bg, color: status.color,
            padding: '5px 11px', borderRadius: 999,
            whiteSpace: 'nowrap',
          }}>
            {status.text}
          </span>
        </header>

        {cell.state !== 'rest' && cell.state !== 'future' && (
          <div style={{
            marginTop: 18, padding: '16px 18px',
            background: '#FAFAF8', borderRadius: 14,
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <span style={{ fontSize: 12, color: '#666' }}>런지 횟수</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>
              {cell.count + (cell.excess ?? 0)}<span style={{ fontSize: 12, color: '#999', fontWeight: 500 }}> / {goal}</span>
            </span>
          </div>
        )}

        {cell.note ? (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 11, color: '#888', margin: 0, letterSpacing: '0.05em' }}>
              오늘 한 줄
            </p>
            <p style={{
              fontSize: 14, color: '#111', margin: '6px 0 0',
              lineHeight: 1.6,
              background: '#FFF6F5',
              border: `1px solid #FFE9E7`,
              borderRadius: 12,
              padding: '14px 16px',
              whiteSpace: 'pre-wrap',
            }}>
              {cell.note}
            </p>
          </div>
        ) : cell.state !== 'future' && cell.state !== 'miss' && (
          <p style={{ fontSize: 12, color: '#bbb', margin: '14px 0 0' }}>
            이 날의 한 줄 메모는 없어요
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 22, width: '100%',
            padding: '13px 0',
            background: '#111', color: '#fff',
            border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 600, fontFamily: FONT,
            cursor: 'pointer',
          }}
        >
          닫기
        </button>
      </div>
    </div>
  )
}
