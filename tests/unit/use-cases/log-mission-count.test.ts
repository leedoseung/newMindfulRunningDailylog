import { describe, it, expect, vi } from 'vitest'
import { LogMissionCountUseCase, LogMissionError } from '@/application/use-cases/log-mission-count'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'
import type { MissionLog } from '@/domain/entities/mission-log'

const challenge: Challenge = {
  id: 'c1', title: '런지 100일', description: '', goalPerDay: 100,
  durationDays: 100, startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
}

const participation: ChallengeParticipation = {
  id: 'p1', challengeId: 'c1', memberId: 'm1',
  joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 5,
  completedAt: null, failedAt: null,
}

const log: MissionLog = {
  id: 'log1', participationId: 'p1', logDate: '2026-07-05',
  count: 50, completed: false, usedPass: false,
  updatedAt: '2026-07-05T10:00:00Z',
}

function makeRepos(overrides: { challenge?: Challenge | null; participation?: ChallengeParticipation | null } = {}) {
  return {
    cRepo: {
      getById: vi.fn().mockResolvedValue('challenge' in overrides ? overrides.challenge : challenge),
      getActive: vi.fn(),
      getUpcoming: vi.fn(),
    } as unknown as IChallengeRepository,
    pRepo: {
      getByMember: vi.fn(),
      enroll: vi.fn(),
      decrementPass: vi.fn(),
      markFailed: vi.fn(),
      markCompleted: vi.fn(),
      listForChallenge: vi.fn(), delete: vi.fn(),
    } as IChallengeParticipationRepository,
    mRepo: {
      getByParticipation: vi.fn(),
      getOne: vi.fn(),
      upsertCount: vi.fn().mockResolvedValue(log),
      setCount: vi.fn(),
      markPass: vi.fn(),
      markRestDay: vi.fn(),
    } as IMissionLogRepository,
  }
}

describe('LogMissionCountUseCase', () => {
  it('upserts count within season window', async () => {
    const { cRepo, pRepo, mRepo } = makeRepos()
    const uc = new LogMissionCountUseCase(cRepo, pRepo, mRepo)
    const result = await uc.execute({
      participation,
      delta: 10,
      today: '2026-07-05',
    })
    expect(result).toEqual(log)
    expect(mRepo.upsertCount).toHaveBeenCalledWith({
      participationId: 'p1',
      logDate: '2026-07-05',
      delta: 10,
    })
  })

  it('throws NEGATIVE_DELTA when delta < 0', async () => {
    const { cRepo, pRepo, mRepo } = makeRepos()
    const uc = new LogMissionCountUseCase(cRepo, pRepo, mRepo)
    await expect(
      uc.execute({ participation, delta: -5, today: '2026-07-05' })
    ).rejects.toThrowError(new LogMissionError('NEGATIVE_DELTA'))
  })

  it('throws BEFORE_START when today < startDate', async () => {
    const { cRepo, pRepo, mRepo } = makeRepos()
    const uc = new LogMissionCountUseCase(cRepo, pRepo, mRepo)
    await expect(
      uc.execute({ participation, delta: 10, today: '2026-06-30' })
    ).rejects.toThrowError(new LogMissionError('BEFORE_START'))
  })

  it('throws SEASON_ENDED when today > startDate + durationDays', async () => {
    const { cRepo, pRepo, mRepo } = makeRepos()
    const uc = new LogMissionCountUseCase(cRepo, pRepo, mRepo)
    await expect(
      uc.execute({ participation, delta: 10, today: '2026-10-09' })
    ).rejects.toThrowError(new LogMissionError('SEASON_ENDED'))
  })

  it('throws ALREADY_FAILED when participation.failedAt set', async () => {
    const { cRepo, pRepo, mRepo } = makeRepos()
    const failed = { ...participation, failedAt: '2026-07-10T00:00:00Z' }
    const uc = new LogMissionCountUseCase(cRepo, pRepo, mRepo)
    await expect(
      uc.execute({ participation: failed, delta: 10, today: '2026-07-12' })
    ).rejects.toThrowError(new LogMissionError('ALREADY_FAILED'))
  })

  it('throws CHALLENGE_NOT_FOUND when challenge missing', async () => {
    const { cRepo, pRepo, mRepo } = makeRepos({ challenge: null })
    const uc = new LogMissionCountUseCase(cRepo, pRepo, mRepo)
    await expect(
      uc.execute({ participation, delta: 10, today: '2026-07-05' })
    ).rejects.toThrowError(new LogMissionError('CHALLENGE_NOT_FOUND'))
  })
})
