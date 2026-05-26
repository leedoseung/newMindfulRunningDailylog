'use client'

import { useState } from 'react'
import { RunFeed } from '../feed/run-feed'
import { MyRecordsTab } from '../my-records/my-records-tab'
import type { RunLog } from '@/domain/entities/run-log'

type Tab = 'all' | 'mine'

type Props = {
  recentRuns: RunLog[]
  myRuns: RunLog[]
  memberId: string
}

export function HomeFeed({ recentRuns, myRuns, memberId }: Props) {
  const [tab, setTab] = useState<Tab>('all')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: '전체 피드' },
    { key: 'mine', label: '내 기록' },
  ]

  return (
    <>
      <div style={{
        display: 'flex', margin: '0 22px 16px',
        background: '#ffffff', borderRadius: '12px', padding: '4px',
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, textAlign: 'center', padding: '8px',
              fontFamily: 'var(--font-raleway)', fontSize: '0.7rem', fontWeight: 700,
              color: tab === t.key ? '#fff' : '#888',
              background: tab === t.key ? '#2d3031' : 'transparent',
              borderRadius: '9px', border: 'none', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'all' ? (
        <RunFeed runs={recentRuns} />
      ) : (
        <MyRecordsTab runs={myRuns} memberId={memberId} />
      )}
    </>
  )
}
