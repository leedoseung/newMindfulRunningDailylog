import { describe, it, expect, vi } from 'vitest'
import { RunDailyPassCheckUseCase } from '@/application/use-cases/run-daily-pass-check'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

const challenge: Challenge = {
  id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
  startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
}

function makeParticipation(overrides: Partial<ChallengeParticipation> = {}): ChallengeParticipation {
  return {
    id: 'p1', challengeId: 'c1', memberId: 'm1',
    joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 3,
    completedAt: null, failedAt: null,
    ...overrides,
  }
}

describe('RunDailyPassCheckUseCase', () => {
  it('decrements pass + markPass when no log for yesterday and passes remain', async () => {
    const p = makeParticipation({ passesRemaining: 3 })
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([p]),
      decrementPass: vi.fn(),
      markFailed: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), markCompleted: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = {
      getOne: vi.fn().mockResolvedValue(null),
      markPass: vi.fn(),
      getByParticipation: vi.fn(), upsertCount: vi.fn(), setCount: vi.fn(),
    } as IMissionLogRepository

    const uc = new RunDailyPassCheckUseCase(cRepo, pRepo, mRepo)
    const result = await uc.execute({ today: '2026-07-05' })  // yesterday = 07-04

    expect(pRepo.decrementPass).toHaveBeenCalledWith('p1')
    expect(mRepo.markPass).toHaveBeenCalledWith('p1', '2026-07-04')
    expect(pRepo.markFailed).not.toHaveBeenCalled()
    expect(result.decremented).toBe(1)
    expect(result.failed).toBe(0)
  })

  it('does nothing when log for yesterday exists with count > 0', async () => {
    const p = makeParticipation()
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([p]),
      decrementPass: vi.fn(), markFailed: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), markCompleted: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = {
      getOne: vi.fn().mockResolvedValue({
        id: 'l1', participationId: 'p1', logDate: '2026-07-04',
        count: 50, completed: false, usedPass: false, updatedAt: '2026-07-04T10:00:00Z',
      }),
      markPass: vi.fn(),
      getByParticipation: vi.fn(), upsertCount: vi.fn(), setCount: vi.fn(),
    } as IMissionLogRepository

    const uc = new RunDailyPassCheckUseCase(cRepo, pRepo, mRepo)
    await uc.execute({ today: '2026-07-05' })

    expect(pRepo.decrementPass).not.toHaveBeenCalled()
    expect(mRepo.markPass).not.toHaveBeenCalled()
    expect(pRepo.markFailed).not.toHaveBeenCalled()
  })

  it('marks failed when passesRemaining = 0 and no log', async () => {
    const p = makeParticipation({ passesRemaining: 0 })
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([p]),
      decrementPass: vi.fn(), markFailed: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), markCompleted: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = {
      getOne: vi.fn().mockResolvedValue(null),
      markPass: vi.fn(),
      getByParticipation: vi.fn(), upsertCount: vi.fn(), setCount: vi.fn(),
    } as IMissionLogRepository

    const uc = new RunDailyPassCheckUseCase(cRepo, pRepo, mRepo)
    const result = await uc.execute({ today: '2026-07-05' })

    expect(pRepo.markFailed).toHaveBeenCalledWith('p1')
    expect(pRepo.decrementPass).not.toHaveBeenCalled()
    expect(result.failed).toBe(1)
  })

  it('skips already-failed and already-completed participants', async () => {
    const failed = makeParticipation({ id: 'p_failed', failedAt: '2026-07-03T00:00:00Z' })
    const done = makeParticipation({ id: 'p_done', completedAt: '2026-07-03T00:00:00Z' })
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([failed, done]),
      decrementPass: vi.fn(), markFailed: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), markCompleted: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = {
      getOne: vi.fn(), markPass: vi.fn(),
      getByParticipation: vi.fn(), upsertCount: vi.fn(), setCount: vi.fn(),
    } as IMissionLogRepository

    const uc = new RunDailyPassCheckUseCase(cRepo, pRepo, mRepo)
    await uc.execute({ today: '2026-07-05' })

    expect(mRepo.getOne).not.toHaveBeenCalled()
    expect(pRepo.decrementPass).not.toHaveBeenCalled()
    expect(pRepo.markFailed).not.toHaveBeenCalled()
  })

  it('returns early when no active challenge', async () => {
    const cRepo = { getActive: vi.fn().mockResolvedValue(null), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn(),
      decrementPass: vi.fn(), markFailed: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), markCompleted: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = { getOne: vi.fn(), markPass: vi.fn(), getByParticipation: vi.fn(), upsertCount: vi.fn(), setCount: vi.fn() } as IMissionLogRepository

    const uc = new RunDailyPassCheckUseCase(cRepo, pRepo, mRepo)
    const result = await uc.execute({ today: '2026-07-05' })

    expect(result).toEqual({ decremented: 0, failed: 0, skipped: 0, processed: 0 })
    expect(pRepo.listForChallenge).not.toHaveBeenCalled()
  })

  it('skips when yesterday is before season start', async () => {
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn(),
      decrementPass: vi.fn(), markFailed: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), markCompleted: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = { getOne: vi.fn(), markPass: vi.fn(), getByParticipation: vi.fn(), upsertCount: vi.fn(), setCount: vi.fn() } as IMissionLogRepository

    const uc = new RunDailyPassCheckUseCase(cRepo, pRepo, mRepo)
    // today=07-01, yesterday=06-30 (before startDate 07-01)
    const result = await uc.execute({ today: '2026-07-01' })

    expect(result.processed).toBe(0)
    expect(pRepo.listForChallenge).not.toHaveBeenCalled()
  })
})
