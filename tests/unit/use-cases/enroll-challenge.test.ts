import { describe, it, expect, vi } from 'vitest'
import { EnrollChallengeUseCase, EnrollError } from '@/application/use-cases/enroll-challenge'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

const challenge: Challenge = {
  id: 'c1', title: '런지 100일', description: '', goalPerDay: 100,
  durationDays: 100, startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'upcoming', seasonNumber: 1, createdAt: '2026-06-01T00:00:00Z',
}

const participation: ChallengeParticipation = {
  id: 'p1', challengeId: 'c1', memberId: 'm1',
  joinedAt: '2026-06-15T00:00:00Z', passesRemaining: 5,
  completedAt: null, failedAt: null, revivedAt: null,
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
      listForChallenge: vi.fn(), delete: vi.fn(),
      revive: vi.fn(),
    } as IChallengeParticipationRepository,
    lRepo: {
      getByParticipation: vi.fn(),
      getOne: vi.fn(),
      upsertCount: vi.fn(),
      setCount: vi.fn(),
      markPass: vi.fn(),
      markRestDay: vi.fn(),
    } as IMissionLogRepository,
  }
}

describe('EnrollChallengeUseCase', () => {
  it('enrolls successfully before deadline', async () => {
    const { cRepo, pRepo, lRepo } = makeRepos()
    const uc = new EnrollChallengeUseCase(cRepo, pRepo, lRepo)
    const result = await uc.execute({
      challengeId: 'c1',
      memberId: 'm1',
      today: '2026-06-30',
    })
    expect(result).toEqual(participation)
    expect(pRepo.enroll).toHaveBeenCalledWith({
      challengeId: 'c1',
      memberId: 'm1',
      passesRemaining: 5,
    })
    expect(lRepo.markPass).not.toHaveBeenCalled()
  })

  it('throws CHALLENGE_NOT_FOUND when missing', async () => {
    const { cRepo, pRepo, lRepo } = makeRepos()
    cRepo.getById = vi.fn().mockResolvedValue(null)
    const uc = new EnrollChallengeUseCase(cRepo, pRepo, lRepo)
    await expect(
      uc.execute({ challengeId: 'x', memberId: 'm1', today: '2026-07-02' })
    ).rejects.toThrowError(new EnrollError('CHALLENGE_NOT_FOUND'))
  })

  it('throws REGISTRATION_CLOSED when today > deadline', async () => {
    const { cRepo, pRepo, lRepo } = makeRepos()
    const uc = new EnrollChallengeUseCase(cRepo, pRepo, lRepo)
    await expect(
      uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-07-05' })
    ).rejects.toThrowError(new EnrollError('REGISTRATION_CLOSED'))
  })

  it('allows enroll on deadline day (inclusive)', async () => {
    const { cRepo, pRepo, lRepo } = makeRepos()
    const uc = new EnrollChallengeUseCase(cRepo, pRepo, lRepo)
    const result = await uc.execute({
      challengeId: 'c1',
      memberId: 'm1',
      today: '2026-07-04',
    })
    expect(result).toEqual(participation)
  })

  it('returns existing participation when already enrolled (idempotent)', async () => {
    const { cRepo, pRepo, lRepo } = makeRepos()
    pRepo.getByMember = vi.fn().mockResolvedValue(participation)
    const uc = new EnrollChallengeUseCase(cRepo, pRepo, lRepo)
    const result = await uc.execute({
      challengeId: 'c1',
      memberId: 'm1',
      today: '2026-07-02',
    })
    expect(result).toEqual(participation)
    expect(pRepo.enroll).not.toHaveBeenCalled()
    expect(lRepo.markPass).not.toHaveBeenCalled()
  })

  it('throws SEASON_ENDED when status == ended', async () => {
    const { cRepo, pRepo, lRepo } = makeRepos()
    cRepo.getById = vi.fn().mockResolvedValue({ ...challenge, status: 'ended' })
    const uc = new EnrollChallengeUseCase(cRepo, pRepo, lRepo)
    await expect(
      uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-07-02' })
    ).rejects.toThrowError(new EnrollError('SEASON_ENDED'))
  })

  describe('late signup (challenge already started)', () => {
    it('burns one pass and marks the missed day when today = startDate + 1', async () => {
      const { cRepo, pRepo, lRepo } = makeRepos()
      // S2 shape: start 2026-10-26, deadline 2026-11-02
      cRepo.getById = vi.fn().mockResolvedValue({
        ...challenge,
        startDate: '2026-10-26',
        registrationDeadline: '2026-11-02',
      })
      const uc = new EnrollChallengeUseCase(cRepo, pRepo, lRepo)

      await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-10-27' })

      expect(pRepo.enroll).toHaveBeenCalledWith({
        challengeId: 'c1',
        memberId: 'm1',
        passesRemaining: 4,
      })
      expect(lRepo.markPass).toHaveBeenCalledTimes(1)
      expect(lRepo.markPass).toHaveBeenCalledWith('p1', '2026-10-26')
    })

    it('burns N passes and marks each missed day when N <= passCount', async () => {
      const { cRepo, pRepo, lRepo } = makeRepos()
      cRepo.getById = vi.fn().mockResolvedValue({
        ...challenge,
        startDate: '2026-10-26',
        registrationDeadline: '2026-11-02',
      })
      const uc = new EnrollChallengeUseCase(cRepo, pRepo, lRepo)

      await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-10-29' })

      expect(pRepo.enroll).toHaveBeenCalledWith({
        challengeId: 'c1',
        memberId: 'm1',
        passesRemaining: 2,
      })
      expect(lRepo.markPass).toHaveBeenCalledTimes(3)
      expect(lRepo.markPass).toHaveBeenNthCalledWith(1, 'p1', '2026-10-26')
      expect(lRepo.markPass).toHaveBeenNthCalledWith(2, 'p1', '2026-10-27')
      expect(lRepo.markPass).toHaveBeenNthCalledWith(3, 'p1', '2026-10-28')
    })

    it('caps burn at passCount — missed days beyond passCount stay unmarked', async () => {
      const { cRepo, pRepo, lRepo } = makeRepos()
      cRepo.getById = vi.fn().mockResolvedValue({
        ...challenge,
        startDate: '2026-10-26',
        registrationDeadline: '2026-11-02',
      })
      const uc = new EnrollChallengeUseCase(cRepo, pRepo, lRepo)

      // today = 11/02, missed = 7 (10/26 .. 11/01), passCount = 5
      await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-11-02' })

      expect(pRepo.enroll).toHaveBeenCalledWith({
        challengeId: 'c1',
        memberId: 'm1',
        passesRemaining: 0,
      })
      expect(lRepo.markPass).toHaveBeenCalledTimes(5)
      expect(lRepo.markPass).toHaveBeenNthCalledWith(1, 'p1', '2026-10-26')
      expect(lRepo.markPass).toHaveBeenNthCalledWith(5, 'p1', '2026-10-30')
    })

    it('does not burn or mark when enrolling on startDate', async () => {
      const { cRepo, pRepo, lRepo } = makeRepos()
      cRepo.getById = vi.fn().mockResolvedValue({
        ...challenge,
        startDate: '2026-10-26',
        registrationDeadline: '2026-11-02',
      })
      const uc = new EnrollChallengeUseCase(cRepo, pRepo, lRepo)

      await uc.execute({ challengeId: 'c1', memberId: 'm1', today: '2026-10-26' })

      expect(pRepo.enroll).toHaveBeenCalledWith({
        challengeId: 'c1',
        memberId: 'm1',
        passesRemaining: 5,
      })
      expect(lRepo.markPass).not.toHaveBeenCalled()
    })
  })
})
