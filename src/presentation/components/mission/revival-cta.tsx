'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { canRevive, halfwayDate } from '@/domain/entities/challenge-halfway'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

interface Props {
  participation: ChallengeParticipation
  challenge: Challenge
  today: string
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number) as [number, number, number]
  const [by, bm, bd] = b.split('-').map(Number) as [number, number, number]
  const aMs = Date.UTC(ay, am - 1, ad)
  const bMs = Date.UTC(by, bm - 1, bd)
  return Math.round((bMs - aMs) / (1000 * 60 * 60 * 24))
}

export function RevivalCta({ participation, challenge, today }: Props) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Already revived or never failed — render nothing.
  if (!participation.failedAt || participation.revivedAt) return null

  const eligible = canRevive(participation, challenge, today)
  const halfway = halfwayDate(challenge)

  if (!eligible) {
    // State 2: failed, halfway passed.
    return (
      <div style={{
        margin: '12px 16px', padding: '14px 16px', borderRadius: 12,
        background: '#F1F1EF', color: '#666', fontSize: '0.85rem',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>중도이탈 · 재도전 기한 만료</div>
        <div>다음 챌린지에서 만나요</div>
      </div>
    )
  }

  // State 1: eligible.
  const daysLeft = Math.max(0, daysBetween(today, halfway))

  async function handleRevive() {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/challenges/${challenge.id}/revive`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.reason ?? 'UNKNOWN')
        return
      }
      setConfirmOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <div style={{
        margin: '12px 16px', padding: '16px 18px', borderRadius: 16,
        background: 'linear-gradient(135deg,#FEF3C7 0%,#FDE68A 100%)',
        boxShadow: '0 4px 14px rgba(245,158,11,0.18)',
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: 2, color: '#92400E', textTransform: 'uppercase', marginBottom: 6 }}>
          😢 챌린지 중도이탈
        </div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1F2937', marginBottom: 6 }}>
          아직 절반 안 지났어요. 한 번 더 도전할 수 있어요.
        </div>
        <ul style={{ margin: '0 0 12px', padding: '0 0 0 18px', fontSize: '0.82rem', color: '#374151', lineHeight: 1.6 }}>
          <li>패스 {challenge.passCount}개 새로 받음</li>
          <li>streak 0부터 다시 시작</li>
          <li>남은 일수 {daysLeft}일</li>
        </ul>
        <button
          onClick={() => setConfirmOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', borderRadius: 999,
            background: '#1F2937', color: '#FEF3C7', border: 'none',
            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          재도전 시작 →
        </button>
      </div>

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !isPending && setConfirmOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, padding: '20px 22px',
              width: 'min(360px, 90vw)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 10 }}>
              재도전 시작할까요?
            </div>
            <ul style={{ margin: '0 0 16px', padding: '0 0 0 18px', fontSize: '0.85rem', color: '#374151', lineHeight: 1.7 }}>
              <li>1회만 가능 (되돌릴 수 없음)</li>
              <li>오늘부터 streak 0으로 새로 시작</li>
              <li>패스 {challenge.passCount}개 충전</li>
              <li>리더보드에 ★재도전 라벨 표시</li>
            </ul>
            {error && (
              <div style={{ marginBottom: 12, padding: '8px 10px', background: '#FEE2E2', color: '#991B1B', borderRadius: 8, fontSize: '0.8rem' }}>
                실패: {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                disabled={isPending}
                onClick={() => setConfirmOpen(false)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                disabled={isPending}
                onClick={handleRevive}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#1F2937', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                {isPending ? '시작 중…' : '시작하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
