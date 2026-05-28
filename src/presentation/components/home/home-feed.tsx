'use client'

import { useState } from 'react'
import { RunFeed } from '../feed/run-feed'
import { MyRecordsTab } from '../my-records/my-records-tab'
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
              background: m.ranToday ? 'linear-gradient(135deg, #111111, #555)' : '#ddd',
              flexShrink: 0,
            }}>
              <AvatarImage
                name={m.memberName}
                avatarUrl={m.avatarUrl}
                size={43}
                bg={m.ranToday ? '#111' : '#bbb'}
                style={{ border: '2px solid #F7F7F5' }}
              />
            </div>
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
        <RunFeed runs={recentRuns} weeklyBars={weeklyBars} />
      ) : (
        <MyRecordsTab runs={myRuns} memberId={memberId} />
      )}
    </>
  )
}
