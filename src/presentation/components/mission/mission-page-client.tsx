'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MissionBoard } from './mission-board'
import { ChallengeHeader } from './challenge-header'
import { TodayCounter } from './today-counter'
import { EnrollCard } from './enroll-card'
import { NoActiveChallenge } from './no-active-challenge'
import type { Challenge } from '@/domain/entities/challenge'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'

type EnrolledProps = {
  mode: 'enrolled'
  challenge: Challenge
  board: {
    cells: MissionDayCell[]
    streak: number
    completedDays: number
    passesRemaining: number
    todayIndex: number
    challengeId: string
  }
}

type NotEnrolledProps = {
  mode: 'not-enrolled'
  challenge: Challenge
}

type NoChallengeProps = {
  mode: 'no-challenge'
}

type Props = EnrolledProps | NotEnrolledProps | NoChallengeProps

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export function MissionPageClient(props: Props) {
  const router = useRouter()
  const [enrollPending, setEnrollPending] = useState(false)

  async function enroll(challengeId: string) {
    setEnrollPending(true)
    try {
      const res = await fetch('/api/challenges/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`참가 실패: ${err.error}`)
        return
      }
      router.refresh()
    } finally {
      setEnrollPending(false)
    }
  }

  const wrap: React.CSSProperties = {
    fontFamily: FONT,
    padding: '16px 16px 120px',
    background: '#F7F7F5',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  }

  if (props.mode === 'no-challenge') {
    return (
      <main style={wrap}>
        <NoActiveChallenge />
      </main>
    )
  }

  if (props.mode === 'not-enrolled') {
    return (
      <main style={wrap}>
        <EnrollCard
          title={props.challenge.title}
          description={props.challenge.description}
          startDate={props.challenge.startDate}
          registrationDeadline={props.challenge.registrationDeadline}
          onEnroll={() => enroll(props.challenge.id)}
          isPending={enrollPending}
        />
      </main>
    )
  }

  // enrolled
  const { challenge, board } = props
  const todayCell = board.todayIndex >= 0 ? board.cells[board.todayIndex] : null
  const todayCount = todayCell?.count ?? 0

  return (
    <main style={wrap}>
      <ChallengeHeader
        title={challenge.title}
        todayIndex={board.todayIndex}
        durationDays={challenge.durationDays}
        streak={board.streak}
        passesRemaining={board.passesRemaining}
        passCount={challenge.passCount}
      />
      {board.todayIndex >= 0 && (
        <TodayCounter
          count={todayCount}
          goal={challenge.goalPerDay}
          onAdd={async (delta) => {
            await fetch('/api/challenges/mission', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ delta }),
            })
            router.refresh()
          }}
        />
      )}
      <MissionBoard cells={board.cells} />
    </main>
  )
}
