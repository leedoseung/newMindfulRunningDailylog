'use client'

import { useState } from 'react'
import { AvatarImage } from '../shared/avatar-image'
import type { ChallengeLeaderRow } from '@/application/use-cases/get-challenge-leaderboard'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const RED = '#b8231f'
const GOLD = '#d4a017'
const GREEN = '#1e7e34'

type Props = {
  rows: ChallengeLeaderRow[]
  durationDays: number
  goal: number
  currentMemberId?: string
}

function StatusBadge({ row, goal }: { row: ChallengeLeaderRow; goal: number }) {
  if (row.isCompleted) {
    return <span style={chip(GOLD, '#fff')}>완주 🏆</span>
  }
  if (row.isFailed) {
    return <span style={chip('#888', '#fff')}>중도이탈</span>
  }
  if (row.todayRest) {
    return <span style={chip(GREEN, '#fff')}>🌿 휴식</span>
  }
  if (row.todayDone) {
    const over = row.todayCount > goal
    return <span style={chip(over ? GOLD : RED, '#fff')}>
      {over ? `+${row.todayCount - goal} 보너스` : `${row.todayCount}개 완료`}
    </span>
  }
  if (row.todayCount > 0) {
    return <span style={chip('#FFF6E0', '#a37c00')}>{row.todayCount}개 진행 중</span>
  }
  return <span style={chip('#f3f3ef', '#999')}>대기</span>
}

function chip(bg: string, color: string): React.CSSProperties {
  return {
    fontFamily: FONT,
    fontSize: 11, fontWeight: 600,
    background: bg, color,
    padding: '3px 9px', borderRadius: 999,
    whiteSpace: 'nowrap',
  }
}

export function ChallengeRoster({ rows, durationDays, goal, currentMemberId }: Props) {
  const [open, setOpen] = useState(false)

  const total = rows.length
  const todayDoneRows = rows.filter(r => r.todayDone)
  const preview = todayDoneRows.slice(0, 12)
  const previewMore = Math.max(0, todayDoneRows.length - preview.length)

  return (
    <section
      aria-label="챌린지 참가자 진행"
      style={{
        background: '#fff',
        border: '1px solid #EBEBEB',
        borderRadius: 18,
        padding: 18,
        fontFamily: FONT,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
          오늘 완료한 사람들
        </h3>
        <span style={{ fontSize: 12, fontWeight: 600, color: RED }}>
          {todayDoneRows.length} / {total}명
        </span>
      </header>

      {todayDoneRows.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: '#999', padding: '8px 0 4px' }}>
          오늘 완료한 사람이 아직 없어요. 첫 번째가 되어보세요 🥇
        </p>
      ) : (
        <ul
          style={{
            margin: 0, padding: 0, listStyle: 'none',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
            gap: 10,
          }}
        >
          {preview.map((r) => {
            const isMe = currentMemberId && r.memberId === currentMemberId
            return (
              <li key={r.memberId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  padding: isMe ? 2 : 0, borderRadius: '50%',
                  background: isMe ? `linear-gradient(135deg, ${RED} 0%, ${GOLD} 100%)` : 'transparent',
                }}>
                  <AvatarImage name={r.name} avatarUrl={r.avatarUrl ?? ''} size={44} bg="#EBEBEB" color="#888" />
                </div>
                <span style={{
                  fontSize: 10, color: isMe ? RED : '#444',
                  fontWeight: isMe ? 700 : 500,
                  maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }} title={r.name}>{r.name}</span>
              </li>
            )
          })}
          {previewMore > 0 && (
            <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#999' }}>
              +{previewMore}
            </li>
          )}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          marginTop: 14, width: '100%',
          padding: '10px 0',
          background: 'transparent',
          border: '1px solid #EBEBEB',
          borderRadius: 12,
          fontSize: 12, fontWeight: 600,
          fontFamily: FONT, color: '#444',
          cursor: 'pointer',
        }}
        aria-expanded={open}
      >
        {open ? '접기 ▲' : `전체 참가자 진행 보기 (${total}명) ▼`}
      </button>

      {open && (
        <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r) => {
            const isMe = currentMemberId && r.memberId === currentMemberId
            return (
              <li
                key={r.memberId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px',
                  background: isMe ? '#FFF6F5' : '#FAFAF8',
                  border: isMe ? `1px solid ${RED}33` : '1px solid transparent',
                  borderRadius: 12,
                }}
              >
                <AvatarImage name={r.name} avatarUrl={r.avatarUrl ?? ''} size={36} bg="#EBEBEB" color="#888" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: '#111',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{r.name}</span>
                    {isMe && (
                      <span style={{ fontSize: 9, color: RED, background: '#FFE9E7', padding: '1px 5px', borderRadius: 4 }}>나</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span>🔥 최대 연속 {r.maxStreak}일</span>
                    <span>🏷 {r.completedDays}/{durationDays}일</span>
                    <span>면죄권 {r.passesRemaining}</span>
                  </div>
                </div>
                <StatusBadge row={r} goal={goal} />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
