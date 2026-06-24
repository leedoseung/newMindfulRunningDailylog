// tests/unit/domain/entities/challenge-halfway.test.ts
import { describe, it, expect } from 'vitest'
import { halfwayDate, canRevive } from '@/domain/entities/challenge-halfway'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

const challenge: Challenge = {
  id: 'c1',
  title: 't',
  description: '',
  goalPerDay: 1,
  durationDays: 30,
  startDate: '2026-06-01',
  registrationDeadline: '2026-05-31',
  passCount: 3,
  status: 'active',
  imageUrl: null,
  goalMin: 10,
  restDaysPerWeek: 1,
  createdAt: '2026-05-01T00:00:00Z',
}

function part(over: Partial<ChallengeParticipation> = {}): ChallengeParticipation {
  return {
    id: 'p1',
    challengeId: 'c1',
    memberId: 'm1',
    joinedAt: '2026-06-01T00:00:00Z',
    passesRemaining: 0,
    completedAt: null,
    failedAt: '2026-06-05T00:00:00Z',
    revivedAt: null,
    ...over,
  }
}

describe('halfwayDate', () => {
  it('returns startDate + floor((durationDays-1)/2) for even duration', () => {
    // 30 days: floor(29/2)=14 → 2026-06-01 + 14 = 2026-06-15
    expect(halfwayDate(challenge)).toBe('2026-06-15')
  })

  it('returns the midpoint for odd duration', () => {
    // 7 days: floor(6/2)=3 → start + 3
    expect(halfwayDate({ ...challenge, durationDays: 7 })).toBe('2026-06-04')
  })

  it('returns startDate when durationDays is 1', () => {
    expect(halfwayDate({ ...challenge, durationDays: 1 })).toBe('2026-06-01')
  })
})

describe('canRevive', () => {
  it('true when failed, not completed, not revived, today <= halfway', () => {
    expect(canRevive(part(), challenge, '2026-06-10')).toBe(true)
  })

  it('true at exactly halfway date (inclusive boundary)', () => {
    expect(canRevive(part(), challenge, '2026-06-15')).toBe(true)
  })

  it('false one day past halfway', () => {
    expect(canRevive(part(), challenge, '2026-06-16')).toBe(false)
  })

  it('false when failed_at is null (still active)', () => {
    expect(canRevive(part({ failedAt: null }), challenge, '2026-06-10')).toBe(false)
  })

  it('false when completed_at set', () => {
    expect(canRevive(part({ completedAt: '2026-06-09T00:00:00Z' }), challenge, '2026-06-10')).toBe(false)
  })

  it('false when revivedAt already set (one-shot)', () => {
    expect(canRevive(part({ revivedAt: '2026-06-06T00:00:00Z' }), challenge, '2026-06-10')).toBe(false)
  })
})
