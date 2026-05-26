'use client'

import { useState } from 'react'
import { MemberRankRow } from './member-rank-row'
import { TodayRunModal } from './today-run-modal'
import { DiaryModal } from './diary-modal'
import type { MemberStats } from '@/domain/entities/member'

type Props = {
  stats: MemberStats[]
}

type ModalState = { memberId: string; memberName: string } | null

export function LeaderboardList({ stats }: Props) {
  const [todayRunTarget, setTodayRunTarget] = useState<ModalState>(null)
  const [diaryTarget, setDiaryTarget] = useState<ModalState>(null)

  return (
    <>
      <div data-testid="leaderboard-list">
        {stats.map((s, i) => (
          <MemberRankRow
            key={s.id}
            stats={s}
            rank={i + 1}
            onTodayRun={(id, name) => setTodayRunTarget({ memberId: id, memberName: name })}
            onDiary={(id, name) => setDiaryTarget({ memberId: id, memberName: name })}
          />
        ))}
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
