'use client'

import { useState, useEffect, Fragment } from 'react'
import { RunCard } from './run-card'
import { DetailSheet } from './detail-sheet'
import { AvatarImage } from '../shared/avatar-image'
import type { RunLog } from '@/domain/entities/run-log'
import type { WeeklyBar } from '../home/home-feed'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

type Props = {
  runs: RunLog[]
  weeklyBars: WeeklyBar[]
  triggerRun?: RunLog | null
  onTriggerConsumed?: () => void
  memberId?: string
}

const GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
  'linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)',
  'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  'linear-gradient(135deg, #373b44 0%, #4286f4 100%)',
  'linear-gradient(135deg, #6a3093 0%, #a044ff 100%)',
  'linear-gradient(135deg, #1d976c 0%, #93f9b9 100%)',
  'linear-gradient(135deg, #e96c4c 0%, #c41818 100%)',
]

function getGradient(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i)
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
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
            fontFamily: FONT, fontSize: '2rem', fontWeight: 900,
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
          <div style={{ fontFamily: FONT, fontSize: '1.3rem', fontWeight: 500, color: '#fff' }}>
            {totalHours}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'rgba(255,255,255,0.5)', marginLeft: 2 }}>h</span>
          </div>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>누적 달린 시간</div>
        </div>
      </div>

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

// 좌우 열의 높이 패턴 — 서로 어긋나게 배치해 마소리 느낌
const HEIGHTS_L: number[] = [200, 130, 170, 115, 190, 145]
const HEIGHTS_R: number[] = [130, 195, 115, 175, 140, 200]
const hL = (i: number) => HEIGHTS_L[i % HEIGHTS_L.length]!
const hR = (i: number) => HEIGHTS_R[i % HEIGHTS_R.length]!

function GridCell({ run, height, onClick }: { run: RunLog; height: number; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 16, overflow: 'hidden',
        position: 'relative', height,
        cursor: 'pointer', flexShrink: 0,
        background: run.photoUrl ? '#111' : getGradient(run.memberId),
      }}
    >
      {run.photoUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${run.photoUrl})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.72) 100%)',
      }} />
      {!run.photoUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          paddingBottom: 36,
        }}>
          <AvatarImage
            name={run.memberName}
            avatarUrl={run.memberAvatarUrl}
            size={44}
            bg="rgba(255,255,255,0.2)"
            color="#fff"
          />
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 10px' }}>
        <div style={{
          fontFamily: FONT, fontSize: '0.62rem', fontWeight: 600,
          color: '#fff', marginBottom: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {run.memberName}
        </div>
        {run.title && (
          <div style={{
            fontFamily: FONT, fontSize: '0.52rem',
            color: 'rgba(255,255,255,0.78)', lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            "{run.title}"
          </div>
        )}
      </div>
    </div>
  )
}

export function PhotoGrid({ runs, weeklyBars, memberId }: { runs: RunLog[]; weeklyBars: WeeklyBar[]; memberId?: string }) {
  const [selected, setSelected] = useState<RunLog | null>(null)

  const leftRuns  = runs.filter((_, i) => i % 2 === 0)
  const rightRuns = runs.filter((_, i) => i % 2 !== 0)

  return (
    <>
      <div style={{ padding: '0 16px 12px' }}>
        <CommunityPulseCard weeklyBars={weeklyBars} runs={runs} />
      </div>

      {runs.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888', padding: '40px 0', fontSize: '0.875rem' }}>
          최근 달리기 기록이 없습니다
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 4, padding: '0 16px 40px' }}>
          {/* 왼쪽 열 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {leftRuns.map((run, rowIdx) => (
              <GridCell
                key={run.id}
                run={run}
                height={hL(rowIdx)}
                onClick={() => setSelected(run)}
              />
            ))}
          </div>
          {/* 오른쪽 열 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {rightRuns.map((run, rowIdx) => (
              <GridCell
                key={run.id}
                run={run}
                height={hR(rowIdx)}
                onClick={() => setSelected(run)}
              />
            ))}
          </div>
        </div>
      )}

      {selected && (
        <DetailSheet run={selected} open={Boolean(selected)} onClose={() => setSelected(null)} memberId={memberId} />
      )}
    </>
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
