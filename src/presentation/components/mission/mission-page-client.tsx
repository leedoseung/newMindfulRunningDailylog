'use client'

import { useEffect, useRef, useState } from 'react'
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
import { ChallengeRoster } from './challenge-roster'
import type { Challenge } from '@/domain/entities/challenge'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'
import type { ChallengeParticipantView } from '@/application/use-cases/get-challenge-participants'
import type { ChallengeLeaderRow } from '@/application/use-cases/get-challenge-leaderboard'

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
  leaderboard?: ChallengeLeaderRow[]
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

  // Auto-refresh server data every 30s so the roster + today-done list
  // reflect other members' progress without manual reload.
  useEffect(() => {
    if (props.mode !== 'enrolled') return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && !inFlightRef.current) {
        router.refresh()
      }
    }, 30000)
    return () => clearInterval(id)
  }, [props.mode, router])

  async function addCount(delta: number, prevCount: number, note: string | null) {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setCountPending(true)
    setOverrideCount(prevCount + delta)
    setOverrideError(null)
    try {
      const res = await fetch('/api/challenges/mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta, note }),
      })
      if (!res.ok) {
        const err = await res.json()
        setOverrideCount(prevCount)
        setOverrideError(err.error ?? 'UNKNOWN')
        return
      }
      const log = await res.json()
      setOverrideCount(typeof log.count === 'number' ? log.count : prevCount + delta)
      router.refresh()
    } catch (err) {
      setOverrideCount(prevCount)
      setOverrideError(String(err))
    } finally {
      inFlightRef.current = false
      setCountPending(false)
    }
  }

  async function setCountAbsolute(next: number, prevCount: number, note: string | null) {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setCountPending(true)
    setOverrideCount(next)
    setOverrideError(null)
    try {
      const res = await fetch('/api/challenges/mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: next, note }),
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

  async function markRest() {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setCountPending(true)
    setOverrideError(null)
    try {
      const res = await fetch('/api/challenges/mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rest: true }),
      })
      if (!res.ok) {
        const err = await res.json()
        if (err.error === 'REST_BUDGET_EXHAUSTED') {
          setOverrideError('이번 주 휴식권을 모두 사용했어요')
        } else {
          setOverrideError(err.error ?? 'UNKNOWN')
        }
        return
      }
      router.refresh()
    } catch (err) {
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

  async function cancelEnroll(challengeId: string) {
    if (!confirm('참가 신청을 취소하시겠어요? 다시 신청은 모집 마감 전까지 가능해요.')) return
    try {
      const res = await fetch('/api/challenges/enroll', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      })
      if (!res.ok) {
        const err = await res.json()
        if (err.error === 'ALREADY_STARTED') {
          alert('이미 시작한 시즌은 취소할 수 없어요')
        } else {
          alert(`취소 실패: ${err.error}`)
        }
        return
      }
      router.refresh()
    } catch (err) {
      alert(`취소 실패: ${String(err)}`)
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
  const preStart = props.participants !== undefined
  const restBudget = challenge.restDaysPerWeek ?? 1
  const restRemainingThisWeek = (() => {
    if (!todayCell) return restBudget
    const [ty, tm, td] = todayCell.date.split('-').map(Number) as [number, number, number]
    const dt = new Date(Date.UTC(ty, tm - 1, td))
    const isoDow = dt.getUTCDay() === 0 ? 7 : dt.getUTCDay()  // Mon=1..Sun=7
    const monMs = Date.UTC(ty, tm - 1, td) - (isoDow - 1) * 86400000
    const sunMs = monMs + 6 * 86400000
    let used = 0
    for (const c of board.cells) {
      if (!c.isRestDay) continue
      const [cy, cm, cd] = c.date.split('-').map(Number) as [number, number, number]
      const ms = Date.UTC(cy, cm - 1, cd)
      if (ms >= monMs && ms <= sunMs) used++
    }
    return Math.max(restBudget - used, 0)
  })()

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
      {props.participants && (
        <ParticipantList
          participants={props.participants}
          currentMemberId={props.currentMemberId}
        />
      )}
      {props.leaderboard && (
        <ChallengeRoster
          rows={props.leaderboard}
          durationDays={challenge.durationDays}
          goal={challenge.goalPerDay}
          currentMemberId={props.currentMemberId}
        />
      )}
      {preStart && (
        <button
          type="button"
          onClick={() => cancelEnroll(challenge.id)}
          style={{
            alignSelf: 'center',
            background: 'transparent',
            color: '#b8231f',
            border: '1px solid #f3d3d2',
            borderRadius: 999,
            padding: '8px 18px',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
            cursor: 'pointer',
          }}
        >
          참가 취소
        </button>
      )}
      {canLog && (
        <>
          <TodayCounter
            count={overrideCount ?? todayCount}
            goal={challenge.goalPerDay}
            goalMin={challenge.goalMin ?? 10}
            note={todayCell?.note ?? null}
            onAdd={(delta, note) => addCount(delta, overrideCount ?? todayCount, note)}
            onSetAbsolute={(next, note) => setCountAbsolute(next, overrideCount ?? todayCount, note)}
            onRest={markRest}
            disabled={countPending}
            restAvailable={!todayCell?.isRestDay && restRemainingThisWeek > 0}
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
      <MissionBoard cells={board.cells} goal={challenge.goalPerDay} />
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
