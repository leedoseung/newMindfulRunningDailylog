'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RunFeed, PhotoGrid } from '../feed/run-feed'
import { TodayCardDeck } from '../feed/today-card-deck'
import { DetailSheet } from '../feed/detail-sheet'
import { AvatarImage } from '../shared/avatar-image'
import { DonationBanner } from './donation-banner'
import { InsightsBanner } from './insights-banner'
import type { RunLog } from '@/domain/entities/run-log'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

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
  weeklyTotalHours?: number
  initialOffset?: number
  memberName?: string
  memberAvatarUrl?: string
}

function MiniBarChart({ bars }: { bars: WeeklyBar[] }) {
  const maxCount = Math.max(...bars.map(b => b.count), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32 }}>
        {bars.map(bar => (
          <div key={bar.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{
              borderRadius: '3px 3px 0 0',
              height: bar.count > 0 ? `${Math.max((bar.count / maxCount) * 100, 18)}%` : 3,
              background: bar.isToday ? '#111' : '#e0e0e0',
              transition: 'height 0.4s',
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {bars.map(bar => (
          <div key={bar.label} style={{
            flex: 1, textAlign: 'center',
            fontFamily: FONT, fontSize: '0.42rem',
            color: bar.isToday ? '#111' : '#ccc',
            fontWeight: bar.isToday ? 700 : 400,
          }}>
            {bar.label}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatsHeader({
  tab, crew, todayCount, onCrewClick,
  weeklyBars, weeklyTotalRuns, weeklyParticipants, weeklyTotalHours,
  myWeeklyBars, myWeekCount, myWeekHours, myWeekRemMin,
}: {
  tab: Tab
  crew: CrewMember[]
  todayCount: number
  onCrewClick: (id: string) => void
  weeklyBars: WeeklyBar[]
  weeklyTotalRuns: number
  weeklyParticipants: number
  weeklyTotalHours: number
  myWeeklyBars: WeeklyBar[]
  myWeekCount: number
  myWeekHours: number
  myWeekRemMin: number
}) {
  const isMine = tab === 'mine'

  return (
    <div style={{ padding: '8px 22px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* 통계 헤더 — 탭에 따라 전환 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontFamily: FONT, fontSize: '0.52rem', fontWeight: 600,
            color: '#777', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6,
            transition: 'opacity 0.2s',
          }}>
            {isMine ? '이번 주 나의 기록' : '이번 주 마인드풀러너'}
          </div>

          {isMine ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: FONT, fontSize: '1.7rem', fontWeight: 800, color: '#111', letterSpacing: '-1px', lineHeight: 1 }}>
                {myWeekCount}
              </span>
              <span style={{ fontFamily: FONT, fontSize: '0.7rem', color: '#999', fontWeight: 400 }}>회</span>
              {myWeekCount > 0 && (
                <>
                  <span style={{ color: '#e0e0e0', fontSize: '0.7rem' }}>·</span>
                  <span style={{ fontFamily: FONT, fontSize: '0.82rem', fontWeight: 600, color: '#444' }}>
                    {myWeekHours > 0 ? `${myWeekHours}h` : ''}{myWeekRemMin > 0 ? ` ${myWeekRemMin}m` : myWeekHours === 0 ? '0m' : ''}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: FONT, fontSize: '1.7rem', fontWeight: 800, color: '#111', letterSpacing: '-1px', lineHeight: 1 }}>
                {weeklyTotalRuns}
              </span>
              <span style={{ fontFamily: FONT, fontSize: '0.7rem', color: '#999', fontWeight: 400 }}>회</span>
              <span style={{ color: '#e0e0e0', fontSize: '0.7rem' }}>·</span>
              <span style={{ fontFamily: FONT, fontSize: '0.82rem', fontWeight: 600, color: '#444' }}>{weeklyParticipants}명</span>
              {weeklyTotalHours > 0 && (
                <>
                  <span style={{ color: '#e0e0e0', fontSize: '0.7rem' }}>·</span>
                  <span style={{ fontFamily: FONT, fontSize: '0.82rem', fontWeight: 500, color: '#888' }}>
                    {weeklyTotalHours}h
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <MiniBarChart bars={isMine ? myWeeklyBars : weeklyBars} />
      </div>

      {/* 구분선 */}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.05)' }} />

      {/* 크루 원형 — 전체 피드 탭에만 표시 */}
      {!isMine && crew.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            fontFamily: FONT, fontSize: '0.52rem', fontWeight: 600,
            color: '#777', letterSpacing: '1.2px', textTransform: 'uppercase',
          }}>
            오늘 달린 멤버 · {todayCount}명
          </div>
          <div style={{
            display: 'flex', gap: 12, overflowX: 'auto',
            scrollbarWidth: 'none', paddingTop: 2, paddingBottom: 6, paddingLeft: 2, paddingRight: 2,
          }}>
            {crew.map(m => (
              <div key={m.memberId} onClick={() => onCrewClick(m.memberId)} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 5, flexShrink: 0, cursor: 'pointer',
              }}>
                {m.ranToday ? (
                  <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: 'conic-gradient(from 0deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888, #833ab4, #fd1d1d, #fcb045, #f09433)',
                      animation: 'spin-gradient 3s linear infinite',
                    }} />
                    <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: '#F7F7F5' }} />
                    <div style={{ position: 'absolute', inset: 5 }}>
                      <AvatarImage name={m.memberName} avatarUrl={m.avatarUrl} size={44} bg="#111" />
                    </div>
                  </div>
                ) : (
                  <AvatarImage name={m.memberName} avatarUrl={m.avatarUrl} size={46} bg="#CCC" />
                )}
                <div style={{
                  fontFamily: FONT, fontSize: '0.55rem', fontWeight: 500,
                  color: m.ranToday ? '#111111' : '#bbb',
                  maxWidth: 48, textAlign: 'center',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {m.memberName}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function HomeFeed({ recentRuns, myRuns, memberId, crew, weeklyBars, weeklyTotalHours = 0, initialOffset = 20, memberName = '', memberAvatarUrl = '' }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('all')
  const [refreshing, setRefreshing] = useState(false)
  const pullStartY = useRef(0)
  const pullDeltaY = useRef(0)
  const isPulling = useRef(false)
  const [triggerRun, setTriggerRun] = useState<RunLog | null>(null)
  const [autoOpenRun, setAutoOpenRun] = useState<RunLog | null>(null)

  const todayCount = crew.filter(c => c.ranToday).length
  const todayStr = new Date().toISOString().split('T')[0]!
  const todayRuns = recentRuns.filter(r => r.date === todayStr)
  const weeklyTotalRuns = weeklyBars.reduce((s, b) => s + b.count, 0)
  const weeklyParticipants = crew.length

  // 내 이번 주 통계
  const { myWeeklyBars, myWeekCount, myWeekHours, myWeekRemMin } = useMemo(() => {
    const now = new Date()
    const bars = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() - 6 + i)
      const dateStr = d.toISOString().split('T')[0]!
      const count = myRuns.filter(r => r.date === dateStr).length
      return { label: DAY_LABELS[d.getDay()] ?? '?', count, isToday: i === 6 }
    })
    const cutoff = new Date(now)
    cutoff.setDate(now.getDate() - 6)
    const cutoffStr = cutoff.toISOString().split('T')[0]!
    const weekRuns = myRuns.filter(r => r.date >= cutoffStr)
    const totalMin = weekRuns.reduce((s, r) => s + r.durationMin, 0)
    return {
      myWeeklyBars: bars,
      myWeekCount: weekRuns.length,
      myWeekHours: Math.floor(totalMin / 60),
      myWeekRemMin: totalMin % 60,
    }
  }, [myRuns])

  useEffect(() => {
    const stored = sessionStorage.getItem('openRun')
    if (!stored) return
    sessionStorage.removeItem('openRun')
    try { setAutoOpenRun(JSON.parse(stored) as RunLog) } catch {}
  }, [])

  // visibilitychange: 앱 복귀 시 자동 갱신
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [router])

  // pull-to-refresh
  useEffect(() => {
    const el = document.documentElement

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop > 0) return
      pullStartY.current = e.touches[0]!.clientY
      isPulling.current = true
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return
      pullDeltaY.current = e.touches[0]!.clientY - pullStartY.current
    }

    const onTouchEnd = () => {
      if (!isPulling.current) return
      isPulling.current = false
      if (pullDeltaY.current > 72) {
        setRefreshing(true)
        router.refresh()
        setTimeout(() => setRefreshing(false), 1000)
      }
      pullDeltaY.current = 0
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [router])

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
      {refreshing && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          height: 36, marginTop: 4,
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '2px solid #e0e0e0',
            borderTopColor: '#2f6b4f',
            animation: 'spin 0.7s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}
      <div style={{ height: 12 }} />
      <InsightsBanner />
      <DonationBanner />

      <StatsHeader
        tab={tab}
        crew={crew}
        todayCount={todayCount}
        onCrewClick={handleCrewClick}
        weeklyBars={weeklyBars}
        weeklyTotalRuns={weeklyTotalRuns}
        weeklyParticipants={weeklyParticipants}
        weeklyTotalHours={weeklyTotalHours}
        myWeeklyBars={myWeeklyBars}
        myWeekCount={myWeekCount}
        myWeekHours={myWeekHours}
        myWeekRemMin={myWeekRemMin}
      />

      <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '16px 22px 0' }} />

      {todayRuns.length > 0 && (
        <>
          <div style={{ height: 16 }} />
          <TodayCardDeck todayRuns={todayRuns} memberId={memberId} onRunClick={run => setAutoOpenRun(run)} />
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '12px 22px 0' }} />
        </>
      )}

      {/* Tab switcher */}
      <div style={{
        display: 'flex', margin: '14px 22px 18px',
        background: '#e4e5e6', borderRadius: '10px', padding: '3px',
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, textAlign: 'center', padding: '7px',
              fontFamily: FONT, fontSize: '0.65rem', fontWeight: 500,
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
        <PhotoGrid
          runs={recentRuns}
          memberId={memberId}
          memberName={memberName}
          memberAvatarUrl={memberAvatarUrl}
          triggerRun={triggerRun}
          onTriggerConsumed={() => setTriggerRun(null)}
          initialOffset={initialOffset}
        />
      ) : (
        <RunFeed runs={myRuns} memberId={memberId} memberName={memberName} memberAvatarUrl={memberAvatarUrl} />
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
