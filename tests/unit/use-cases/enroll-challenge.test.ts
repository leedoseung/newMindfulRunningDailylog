import { describe, it, expect, vi } from 'vitest'
import { EnrollChallengeUseCase, EnrollError } from '@/application/use-cases/enroll-challenge'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

const challenge: Challenge = {
  id: 'c1', title: '런지 100일', description: '', goalPerDay: 100,
  durationDays: 100, startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'upcoming', createdAt: '2026-06-01T00:00:00Z',
}

const participation: ChallengeParticipation = {
  id: 'p1', challengeId: 'c1', memberId: 'm1',
  joinedAt: '2026-06-15T00:00:00Z', passesRemaining: 5,
  completedAt: null, failedAt: null,
}

function makeRepos() {
  return {
    cRepo: {
      getById: vi.fn().mockResolvedValue(challenge),
      getActive: vi.fn(),
      getUpcoming: vi.fn(),
    } as unknown as IChallengeRepository,
    pRepo: {
      getByMember: vi.fn().mockResolvedValue(null),
      enroll: vi.fn().mockResolvedValue(participation),
      decrementPass: vi.fn(),
      markFailed: vi.fn(),
      markCompleted: vi.fn(),
      listForChallenge: vi.fn(),
    } as IChallengeParticipationRepository,
  }
}

describe('EnrollChallengeUseCase', () => {
  it('enrolls successfully before deadline', async () => {
    const { cRepo, pRepo } = makeRepos()
    const uc = new EnrollChallengeUseCase(cRepo, pRepo)
    const result = await uc.execute({
      challengeId: 'c1',
      memberId: 'm1',
      today: '2026-07-02',
    })
    expect(result).toEqual(participation)
    expect(pRepo.enroll).toHaveBeenCalledWith({
      challengeId: 'c1',
      memberId: 'm1',
      passesRemaining: 5,
    })
  })

  it('throws CHALLENGE_NOT_FOUND when missing', async () => {
    const { cRepo, pRepo } = makeRepos()
    cRepo.getById = vi.fn().mockResolvedValue(null)
    const uc = new EnrollChallengeUseCase(cRepo, pRepo)
    await expect(
      uc.execute({ challengeId: 'x', memberId: 'm1', today: '2026-07-02' })
    ).rejects.toThrowError(new EnrollError('CHALLENGE_NOT_FOUND'))
  })

  it('throws REGISTRATION_CLOSED when today > deadline', async () => {
    const { cRepo, pRepo } = makeRepos()
    const uc = new EnrollChallengeUseCase(cRepo, pRepo)
    await expect(
      uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-07-05' })
    ).rejects.toThrowError(new EnrollError('REGISTRATION_CLOSED'))
  })

  it('allows enroll on deadline day (inclusive)', async () => {
    const { cRepo, pRepo } = makeRepos()
    const uc = new EnrollChallengeUseCase(cRepo, pRepo)
    const result = await uc.execute({
      challengeId: 'c1',
      memberId: 'm1',
      today: '2026-07-04',
    })
    expect(result).toEqual(participation)
  })

  it('returns existing participation when already enrolled (idempotent)', async () => {
    const { cRepo, pRepo } = makeRepos()
    pRepo.getByMember = vi.fn().mockResolvedValue(participation)
    const uc = new EnrollChallengeUseCase(cRepo, pRepo)
    const result = await uc.execute({
      challengeId: 'c1',
      memberId: 'm1',
      today: '2026-07-02',
    })
    expect(result).toEqual(participation)
    expect(pRepo.enroll).not.toHaveBeenCalled()
  })

  it('throws SEASON_ENDED when status == ended', async () => {
    const { cRepo, pRepo } = makeRepos()
    cRepo.getById = vi.fn().mockResolvedValue({ ...challenge, status: 'ended' })
    const uc = new EnrollChallengeUseCase(cRepo, pRepo)
    await expect(
      uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-07-02' })
    ).rejects.toThrowError(new EnrollError('SEASON_ENDED'))
  })
})
