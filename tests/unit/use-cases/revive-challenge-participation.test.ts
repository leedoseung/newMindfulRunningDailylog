// tests/unit/use-cases/revive-challenge-participation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReviveChallengeParticipationUseCase } from '@/application/use-cases/revive-challenge-participation'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'

const challenge: Challenge = {
  id: 'c1', title: 't', description: '', goalPerDay: 1, durationDays: 30,
  startDate: '2026-06-01', registrationDeadline: '2026-05-31', passCount: 3,
  status: 'active', imageUrl: null, goalMin: 10, restDaysPerWeek: 1,
  createdAt: '2026-05-01T00:00:00Z',
}

const failedPart: ChallengeParticipation = {
  id: 'p1', challengeId: 'c1', memberId: 'm1',
  joinedAt: '2026-06-01T00:00:00Z',
  passesRemaining: 0,
  completedAt: null,
  failedAt: '2026-06-05T00:00:00Z',
  revivedAt: null,
}

function makeRepos(over: { challenge?: Challenge | null; part?: ChallengeParticipation | null } = {}) {
  const cRepo = {
    getById: vi.fn().mockResolvedValue(over.challenge === undefined ? challenge : over.challenge),
    getActive: vi.fn(),
    getUpcoming: vi.fn(),
  } as unknown as IChallengeRepository
  const pRepo = {
    getByMember: vi.fn().mockResolvedValue(over.part === undefined ? failedPart : over.part),
    enroll: vi.fn(),
    decrementPass: vi.fn(),
    markFailed: vi.fn(),
    markCompleted: vi.fn(),
    listForChallenge: vi.fn(),
    delete: vi.fn(),
    revive: vi.fn().mockResolvedValue(undefined),
  } as unknown as IChallengeParticipationRepository
  return { cRepo, pRepo }
}

describe('ReviveChallengeParticipationUseCase', () => {
  let repos: ReturnType<typeof makeRepos>
  let uc: ReviveChallengeParticipationUseCase

  beforeEach(() => {
    repos = makeRepos()
    uc = new ReviveChallengeParticipationUseCase(repos.cRepo, repos.pRepo)
  })

  it('revives when failed + before halfway + revivedAt null', async () => {
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-10' })
    expect(r).toEqual({ ok: true })
    expect(repos.pRepo.revive).toHaveBeenCalledWith('p1', 3) // passCount=3
  })

  it('returns CHALLENGE_NOT_FOUND when challenge missing', async () => {
    repos = makeRepos({ challenge: null })
    uc = new ReviveChallengeParticipationUseCase(repos.cRepo, repos.pRepo)
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-10' })
    expect(r).toEqual({ ok: false, reason: 'CHALLENGE_NOT_FOUND' })
    expect(repos.pRepo.revive).not.toHaveBeenCalled()
  })

  it('returns NOT_PARTICIPATING when no participation row', async () => {
    repos = makeRepos({ part: null })
    uc = new ReviveChallengeParticipationUseCase(repos.cRepo, repos.pRepo)
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-10' })
    expect(r).toEqual({ ok: false, reason: 'NOT_PARTICIPATING' })
  })

  it('returns NOT_ELIGIBLE when already revived', async () => {
    repos = makeRepos({ part: { ...failedPart, revivedAt: '2026-06-06T00:00:00Z' } })
    uc = new ReviveChallengeParticipationUseCase(repos.cRepo, repos.pRepo)
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-10' })
    expect(r).toEqual({ ok: false, reason: 'NOT_ELIGIBLE' })
  })

  it('returns NOT_ELIGIBLE when failedAt is null (still active)', async () => {
    repos = makeRepos({ part: { ...failedPart, failedAt: null } })
    uc = new ReviveChallengeParticipationUseCase(repos.cRepo, repos.pRepo)
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-10' })
    expect(r).toEqual({ ok: false, reason: 'NOT_ELIGIBLE' })
  })

  it('returns NOT_ELIGIBLE when completedAt set', async () => {
    repos = makeRepos({ part: { ...failedPart, completedAt: '2026-06-09T00:00:00Z' } })
    uc = new ReviveChallengeParticipationUseCase(repos.cRepo, repos.pRepo)
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-10' })
    expect(r).toEqual({ ok: false, reason: 'NOT_ELIGIBLE' })
  })

  it('returns NOT_ELIGIBLE one day past halfway', async () => {
    // halfway for durationDays=30 starting 2026-06-01 is 2026-06-15
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-16' })
    expect(r).toEqual({ ok: false, reason: 'NOT_ELIGIBLE' })
  })

  it('succeeds at exactly halfway date', async () => {
    const r = await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-06-15' })
    expect(r).toEqual({ ok: true })
    expect(repos.pRepo.revive).toHaveBeenCalledWith('p1', 3)
  })
})
