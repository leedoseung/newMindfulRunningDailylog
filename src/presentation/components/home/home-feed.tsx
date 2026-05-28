'use client'

import { useState, useCallback, useEffect } from 'react'
import { RunFeed, PhotoGrid } from '../feed/run-feed'
import { DetailSheet } from '../feed/detail-sheet'
import { AvatarImage } from '../shared/avatar-image'
import type { RunLog } from '@/domain/entities/run-log'

export type CrewMember = {
  memberId: string
  memberName: string
  ranToday: boolean
  todayMinutes: number
  avatarUrl: string
}

export type WeeklyBar = {
  label: string
  count: number
  isToday: boolean
}

type Tab = 'all' | 'mine'

type Props = {
  recentRuns: RunLog[]
  myRuns: RunLog[]
  memberId: string
  crew: CrewMember[]
  weeklyBars: WeeklyBar[]
}

function CrewStrip({ crew, todayCount, onCrewClick }: { crew: CrewMember[]; todayCount: number; onCrewClick: (memberId: string) => void }) {
  if (crew.length === 0) return null
  return (
    <div style={{ padding: '4px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        fontSize: '0.6rem', fontWeight: 600, color: '#999',
        letterSpacing: '1.5px', textTransform: 'uppercase',
      }}>
        오늘 함께 달린 마인드풀러너 · {todayCount}명
      </div>
      <div style={{
        display: 'flex', gap: 12, overflowX: 'auto',
        scrollbarWidth: 'none', paddingTop: 6, paddingBottom: 6, paddingLeft: 6, paddingRight: 6,
      }}>
        {crew.map(m => (
          <div key={m.memberId} onClick={() => onCrewClick(m.memberId)} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 5, flexShrink: 0,
            cursor: 'pointer',
          }}>
            {m.ranToday ? (
              /* Instagram-style spinning gradient ring */
              <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'conic-gradient(from 0deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888, #833ab4, #fd1d1d, #fcb045, #f09433)',
                  animation: 'spin-gradient 3s linear infinite',
                }} />
                <div style={{
                  position: 'absolute', inset: 3, borderRadius: '50%',
                  background: '#F7F7F5',
                }} />
                <div style={{ position: 'absolute', inset: 5 }}>
                  <AvatarImage name={m.memberName} avatarUrl={m.avatarUrl} size={44} bg="#111" />
                </div>
              </div>
            ) : (
              <AvatarImage name={m.memberName} avatarUrl={m.avatarUrl} size={46} bg="#CCC" />
            )}
            <div style={{
              fontSize: '0.55rem', fontWeight: 500,
              color: m.ranToday ? '#111111' : '#bbb',
              maxWidth: 48, textAlign: 'center',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {m.memberName}
            </div>
            <div style={{
              fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.58rem', fontWeight: 500,
              color: m.ranToday ? '#111111' : '#ddd',
            }}>
              {m.ranToday ? `${m.todayMinutes}분` : '–'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function HomeFeed({ recentRuns, myRuns, memberId, crew, weeklyBars }: Props) {
  const [tab, setTab] = useState<Tab>('all')
  const [triggerRun, setTriggerRun] = useState<RunLog | null>(null)
  const [autoOpenRun, setAutoOpenRun] = useState<RunLog | null>(null)
  const todayCount = crew.filter(c => c.ranToday).length

  useEffect(() => {
    const stored = sessionStorage.getItem('openRun')
    if (!stored) return
    sessionStorage.removeItem('openRun')
    try {
      setAutoOpenRun(JSON.parse(stored) as RunLog)
    } catch {}
  }, [])

  const handleCrewClick = useCallback((crewMemberId: string) => {
    const run = recentRuns.find(r => r.memberId === crewMemberId) ?? null
    if (!run) return
    setTab('all')
    setTriggerRun(run)
  }, [recentRuns])

  const tabs = [
    { key: 'all' as Tab, label: '전체 피드' },
    { key: 'mine' as Tab, label: '내 기록' },
  ]

  return (
    <>
      <CrewStrip crew={crew} todayCount={todayCount} onCrewClick={handleCrewClick} />

      <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '14px 22px' }} />

      {/* Tab switcher */}
      <div style={{
        display: 'flex', margin: '0 22px 18px',
        background: '#e4e5e6', borderRadius: '10px', padding: '3px',
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, textAlign: 'center', padding: '7px',
              fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.65rem', fontWeight: 500,
              color: tab === t.key ? '#111111' : '#888',
              background: tab === t.key ? '#fff' : 'transparent',
              borderRadius: '8px', border: 'none', cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'all' ? (
        <PhotoGrid runs={recentRuns} weeklyBars={weeklyBars} memberId={memberId} />
      ) : (
        <RunFeed runs={myRuns} weeklyBars={weeklyBars} memberId={memberId} isMyFeed />
      )}

      <DetailSheet
        run={autoOpenRun}
        open={Boolean(autoOpenRun)}
        onClose={() => setAutoOpenRun(null)}
        memberId={memberId}
      />
    </>
  )
}
