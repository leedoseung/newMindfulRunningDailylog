'use client'

import { useState } from 'react'
import { RunFeed } from '../feed/run-feed'
import { MyRecordsTab } from '../my-records/my-records-tab'
import type { RunLog } from '@/domain/entities/run-log'

export type CrewMember = {
  memberId: string
  memberName: string
  ranToday: boolean
  todayMinutes: number
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

function CrewStrip({ crew, todayCount }: { crew: CrewMember[]; todayCount: number }) {
  if (crew.length === 0) return null
  return (
    <div style={{ padding: '4px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        fontSize: '0.6rem', fontWeight: 600, color: '#999',
        letterSpacing: '1.5px', textTransform: 'uppercase',
      }}>
        오늘 함께 달린 크루 · {todayCount}명
      </div>
      <div style={{
        display: 'flex', gap: 12, overflowX: 'auto',
        scrollbarWidth: 'none', paddingBottom: 2,
      }}>
        {crew.map(m => (
          <div key={m.memberId} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 5, flexShrink: 0,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', padding: 2.5,
              background: m.ranToday
                ? 'linear-gradient(135deg, #2E91FC, #6dd5fa)'
                : '#ddd',
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: m.ranToday ? '#2d3031' : '#bbb',
                border: '2px solid #F0F1F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-raleway)', fontSize: '0.85rem',
                fontWeight: 800, color: '#fff',
              }}>
                {m.memberName[0]}
              </div>
            </div>
            <div style={{
              fontSize: '0.55rem', fontWeight: 500,
              color: m.ranToday ? '#2d3031' : '#bbb',
              maxWidth: 48, textAlign: 'center',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {m.memberName}
            </div>
            <div style={{
              fontFamily: 'var(--font-raleway)', fontSize: '0.58rem', fontWeight: 700,
              color: m.ranToday ? '#2E91FC' : '#ddd',
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
  const todayCount = crew.filter(c => c.ranToday).length

  const tabs = [
    { key: 'all' as Tab, label: '전체 피드' },
    { key: 'mine' as Tab, label: '내 기록' },
  ]

  return (
    <>
      <CrewStrip crew={crew} todayCount={todayCount} />

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
              fontFamily: 'var(--font-raleway)', fontSize: '0.65rem', fontWeight: 700,
              color: tab === t.key ? '#2d3031' : '#888',
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
        <RunFeed runs={recentRuns} weeklyBars={weeklyBars} />
      ) : (
        <MyRecordsTab runs={myRuns} memberId={memberId} />
      )}
    </>
  )
}
