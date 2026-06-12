'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MissionBoard } from './mission-board'
import { ChallengeHeader } from './challenge-header'
import { TodayCounter } from './today-counter'
import { EnrollCard } from './enroll-card'
import { NoActiveChallenge } from './no-active-challenge'
import { IOSInstallGuideSheet } from './ios-install-guide-sheet'
import { PushConsentSheet } from './push-consent-sheet'
import { usePushSubscribe } from './use-push-subscribe'
import { CompletionSheet } from './completion-sheet'
import { ParticipantList } from './participant-list'
import type { Challenge } from '@/domain/entities/challenge'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'
import type { ChallengeParticipantView } from '@/application/use-cases/get-challenge-participants'

type EnrolledProps = {
  mode: 'enrolled'
  challenge: Challenge
  participation: ChallengeParticipation
  board: {
    cells: MissionDayCell[]
    streak: number
    completedDays: number
    passesRemaining: number
    todayIndex: number
    challengeId: string
  }
  participants?: ChallengeParticipantView[]
  currentMemberId?: string
}

type NotEnrolledProps = {
  mode: 'not-enrolled'
  challenge: Challenge
  participants?: ChallengeParticipantView[]
  currentMemberId?: string
}

type NoChallengeProps = {
  mode: 'no-challenge'
}

type Props = EnrolledProps | NotEnrolledProps | NoChallengeProps

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

function isIOSWithoutPWA(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (!isIOS) return false
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return !standalone
}

export function MissionPageClient(props: Props) {
  const router = useRouter()
  const [enrollPending, setEnrollPending] = useState(false)
  const [overrideCount, setOverrideCount] = useState<number | null>(null)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [countPending, setCountPending] = useState(false)
  const [showIosSheet, setShowIosSheet] = useState(false)
  const [showPushConsent, setShowPushConsent] = useState(false)
  const [completionDismissed, setCompletionDismissed] = useState(false)
  const inFlightRef = useRef(false)
  const push = usePushSubscribe()

  async function saveCount(next: number, prevCount: number) {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setCountPending(true)
    setOverrideCount(next)
    setOverrideError(null)
    try {
      const res = await fetch('/api/challenges/mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: next }),
      })
      if (!res.ok) {
        const err = await res.json()
        setOverrideCount(prevCount)
        setOverrideError(err.error ?? 'UNKNOWN')
        return
      }
      const log = await res.json()
      setOverrideCount(typeof log.count === 'number' ? log.count : next)
      router.refresh()
    } catch (err) {
      setOverrideCount(prevCount)
      setOverrideError(String(err))
    } finally {
      inFlightRef.current = false
      setCountPending(false)
    }
  }

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
      // Show consent FIRST. router.refresh() would replace this page with
      // the enrolled view while the sheet is still up; defer it to the
      // consent callbacks so the sheet stays mounted until the user acts.
      setShowPushConsent(true)
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
        {props.participants && (
          <ParticipantList
            participants={props.participants}
            currentMemberId={props.currentMemberId}
          />
        )}
        <PushConsentSheet
          open={showPushConsent}
          onAllow={() => {
            setShowPushConsent(false)
            if (isIOSWithoutPWA()) setShowIosSheet(true)
            else push.subscribe()
            router.refresh()
          }}
          onLater={() => {
            setShowPushConsent(false)
            router.refresh()
          }}
        />
        <IOSInstallGuideSheet
          open={showIosSheet}
          onClose={() => setShowIosSheet(false)}
        />
      </main>
    )
  }

  // enrolled
  const { challenge, board, participation } = props
  const todayCell = board.todayIndex >= 0 ? board.cells[board.todayIndex] : null
  const todayCount = todayCell?.count ?? 0
  const isCompleted = !!participation.completedAt
  const isFailed = !!participation.failedAt
  const canLog = board.todayIndex >= 0 && !isCompleted && !isFailed

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
      {canLog && (
        <>
          <TodayCounter
            count={overrideCount ?? todayCount}
            goal={challenge.goalPerDay}
            onSave={(next) => saveCount(next, overrideCount ?? todayCount)}
            disabled={countPending}
          />
          {overrideError && (
            <div role="alert" style={{ color: '#b8231f', fontSize: 12, textAlign: 'center' }}>
              실패: {overrideError}
            </div>
          )}
        </>
      )}
      {isFailed && (
        <div role="alert" style={{
          background: '#fff', border: '1px solid #f0e0e0', borderRadius: 18,
          padding: 20, textAlign: 'center', color: '#b8231f', fontSize: 13,
        }}>
          챌린지 종료. 면죄권 모두 소진.
        </div>
      )}
      <MissionBoard cells={board.cells} />
      {props.participants && (
        <ParticipantList
          participants={props.participants}
          currentMemberId={props.currentMemberId}
        />
      )}
      {isCompleted && !completionDismissed && (
        <CompletionSheet
          open
          participationId={participation.id}
          onClose={() => setCompletionDismissed(true)}
        />
      )}
    </main>
  )
}
