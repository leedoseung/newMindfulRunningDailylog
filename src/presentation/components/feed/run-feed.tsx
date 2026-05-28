'use client'

import { useState, useEffect, Fragment } from 'react'
import { RunCard } from './run-card'
import { DetailSheet } from './detail-sheet'
import type { RunLog } from '@/domain/entities/run-log'
import type { WeeklyBar } from '../home/home-feed'

type Props = {
  runs: RunLog[]
  weeklyBars: WeeklyBar[]
  triggerRun?: RunLog | null
  onTriggerConsumed?: () => void
  memberId?: string
}

function CommunityPulseCard({ weeklyBars, runs }: { weeklyBars: WeeklyBar[]; runs: RunLog[] }) {
  const totalThisWeek = runs.length
  const participants = new Set(runs.map(r => r.memberId)).size
  const totalHours = Math.floor(runs.reduce((s, r) => s + r.durationMin, 0) / 60)
  const maxCount = Math.max(...weeklyBars.map(b => b.count), 1)

  return (
    <div style={{
      background: 'linear-gradient(135deg, #111111 0%, #1a6fd8 100%)',
      borderRadius: 22, padding: '18px 18px',
      boxShadow: '0 6px 20px rgba(46,145,252,0.3)',
    }}>
      <div style={{
        fontSize: '0.6rem', fontWeight: 500,
        color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px',
        textTransform: 'uppercase', marginBottom: 8,
      }}>이번 주 마인드풀러너 현황</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{
            fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '2rem', fontWeight: 900,
            color: '#fff', lineHeight: 1, letterSpacing: '-1px',
          }}>
            {totalThisWeek}
            <span style={{ fontSize: '1rem', fontWeight: 400, marginLeft: 2, color: 'rgba(255,255,255,0.5)' }}>회</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
            {participants}명이 이번주에 달렸어요
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '1.3rem', fontWeight: 500, color: '#fff',
          }}>
            {totalHours}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'rgba(255,255,255,0.5)', marginLeft: 2 }}>h</span>
          </div>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>누적 달린 시간</div>
        </div>
      </div>

      {/* 7-day bar chart */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36 }}>
          {weeklyBars.map(bar => (
            <div key={bar.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{
                width: '100%', borderRadius: '3px 3px 0 0',
                height: bar.count > 0 ? `${Math.max((bar.count / maxCount) * 100, 15)}%` : '4px',
                background: bar.isToday ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
              }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
          {weeklyBars.map(bar => (
            <div key={bar.label} style={{
              flex: 1, textAlign: 'center', fontSize: '0.5rem',
              color: bar.isToday ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
              fontWeight: bar.isToday ? 700 : 400,
            }}>{bar.label}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RunFeed({ runs, weeklyBars, triggerRun, onTriggerConsumed, memberId }: Props) {
  const [selected, setSelected] = useState<RunLog | null>(null)

  useEffect(() => {
    if (!triggerRun) return
    const id = setTimeout(() => {
      document.getElementById(`run-${triggerRun.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setSelected(triggerRun)
      onTriggerConsumed?.()
    }, 60)
    return () => clearTimeout(id)
  }, [triggerRun])

  function cardType(run: RunLog, i: number): 'hero' | 'photo' | 'white' {
    if (i === 0) return 'hero'
    if (run.photoUrl) return 'photo'
    return 'white'
  }

  return (
    <>
      <div data-testid="run-feed" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px 20px' }}>
        {runs.length === 0 ? (
          <>
            <p style={{ textAlign: 'center', color: '#888', padding: '40px 0 24px', fontSize: '0.875rem' }}>
              최근 달리기 기록이 없습니다
            </p>
            <CommunityPulseCard weeklyBars={weeklyBars} runs={runs} />
          </>
        ) : (
          runs.map((run, i) => (
            <Fragment key={run.id}>
              <div id={`run-${run.id}`}>
                <RunCard run={run} cardType={cardType(run, i)} onClick={setSelected} />
              </div>
              {i === 0 && (
                <CommunityPulseCard weeklyBars={weeklyBars} runs={runs} />
              )}
            </Fragment>
          ))
        )}
      </div>

      {selected && (
        <DetailSheet run={selected} open={Boolean(selected)} onClose={() => setSelected(null)} memberId={memberId} />
      )}
    </>
  )
}
