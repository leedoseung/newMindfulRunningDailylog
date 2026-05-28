'use client'

import { useState } from 'react'
import { MemberRankRow } from './member-rank-row'
import { TodayRunModal } from './today-run-modal'
import { DiaryModal } from './diary-modal'
import type { MemberStats } from '@/domain/entities/member'

type Tab = 'total-time' | 'monthly' | 'count'

type Props = {
  stats: MemberStats[]
}

type ModalState = { memberId: string; memberName: string } | null

function formatStat(s: MemberStats, tab: Tab): { value: string; unit: string; sub: string } {
  switch (tab) {
    case 'total-time': {
      const h = Math.floor(s.totalMinutes / 60)
      return { value: String(h), unit: 'h', sub: `${s.totalCount}회 · 5월 ${s.monthlyCount}회` }
    }
    case 'monthly': {
      const mh = Math.floor(s.monthlyMinutes / 60)
      return { value: String(mh), unit: 'h', sub: `이번달 ${s.monthlyCount}회` }
    }
    case 'count':
      return { value: String(s.totalCount), unit: '회', sub: `이번달 ${s.monthlyCount}회` }
  }
}

function sortStats(stats: MemberStats[], tab: Tab): MemberStats[] {
  return [...stats].sort((a, b) => {
    switch (tab) {
      case 'total-time': return b.totalMinutes - a.totalMinutes
      case 'monthly':    return b.monthlyMinutes - a.monthlyMinutes
      case 'count':      return b.totalCount - a.totalCount
    }
  })
}

type PodRank = 1 | 2 | 3

function PodItem({ s, rank, tab }: { s: MemberStats; rank: PodRank; tab: Tab }) {
  const avatarSize = rank === 1 ? 58 : rank === 2 ? 48 : 44
  const avatarBg   = rank === 1 ? '#111111' : rank === 2 ? '#555555' : '#999999'
  const barHeight  = rank === 1 ? 52 : rank === 2 ? 36 : 26
  const barBg      = rank === 1 ? '#111111' : rank === 2 ? '#dddddd' : '#eeeeee'
  const fontSize   = rank === 1 ? '1rem' : rank === 2 ? '0.85rem' : '0.8rem'
  const stat       = formatStat(s, tab)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flex: 1, paddingBottom: rank !== 1 ? 0 : undefined }}>
      {rank === 1 && <div style={{ fontSize: '1rem', marginBottom: '2px' }}>🏆</div>}
      <div style={{
        width: avatarSize, height: avatarSize, borderRadius: '50%',
        background: avatarBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontWeight: 500, color: '#fff', fontSize,
      }}>
        {s.name.charAt(0)}
      </div>
      <div style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.68rem', fontWeight: 500, color: '#111111', textAlign: 'center' }}>
        {s.name}
      </div>
      <div style={{ fontSize: '0.63rem', fontWeight: 500, color: '#111111' }}>
        {stat.value}{stat.unit}
      </div>
      <div style={{ borderRadius: '10px 10px 0 0', width: '100%', height: barHeight, background: barBg }} />
    </div>
  )
}

function Podium({ top3, tab }: { top3: MemberStats[]; tab: Tab }) {
  const first  = top3[0]
  const second = top3[1]
  const third  = top3[2]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '10px', padding: '0 22px 20px' }}>
      {second && <PodItem s={second} rank={2} tab={tab} />}
      {first  && <PodItem s={first}  rank={1} tab={tab} />}
      {third  && <PodItem s={third}  rank={3} tab={tab} />}
    </div>
  )
}

export function LeaderboardList({ stats }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('total-time')
  const [todayRunTarget, setTodayRunTarget] = useState<ModalState>(null)
  const [diaryTarget, setDiaryTarget]       = useState<ModalState>(null)

  const sorted = sortStats(stats, activeTab)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'total-time', label: '누적 시간' },
    { key: 'monthly',    label: '이번달' },
    { key: 'count',      label: '횟수' },
  ]

  return (
    <>
      {/* 탭 */}
      <div style={{ display: 'flex', margin: '18px 22px 16px', background: '#ffffff', borderRadius: '12px', padding: '4px' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, textAlign: 'center', padding: '8px',
              fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.7rem', fontWeight: 500,
              color: activeTab === t.key ? '#fff' : '#888',
              background: activeTab === t.key ? '#111111' : 'transparent',
              borderRadius: '9px', border: 'none', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 포디엄 */}
      {sorted.length >= 2 && <Podium top3={sorted.slice(0, 3)} tab={activeTab} />}

      {/* 랭킹 목록 */}
      <div data-testid="leaderboard-list" style={{ paddingBottom: '40px' }}>
        {sorted.map((s, i) => {
          const stat = formatStat(s, activeTab)
          return (
            <MemberRankRow
              key={s.id}
              stats={s}
              rank={i + 1}
              statValue={stat.value}
              statUnit={stat.unit}
              statSub={stat.sub}
              onTodayRun={(id, name) => setTodayRunTarget({ memberId: id, memberName: name })}
              onDiary={(id, name) => setDiaryTarget({ memberId: id, memberName: name })}
            />
          )
        })}
      </div>

      <TodayRunModal
        memberId={todayRunTarget?.memberId ?? null}
        memberName={todayRunTarget?.memberName ?? ''}
        open={Boolean(todayRunTarget)}
        onClose={() => setTodayRunTarget(null)}
      />
      <DiaryModal
        memberId={diaryTarget?.memberId ?? null}
        memberName={diaryTarget?.memberName ?? ''}
        open={Boolean(diaryTarget)}
        onClose={() => setDiaryTarget(null)}
      />
    </>
  )
}
