import { describe, it, expect, vi } from 'vitest'
import { IssueCompletionBadgeUseCase } from '@/application/use-cases/issue-completion-badge'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'
import type { MissionLog } from '@/domain/entities/mission-log'

const challenge: Challenge = {
  id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
  startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
}

function mkLog(date: string, count: number, usedPass = false): MissionLog {
  return {
    id: `l-${date}`, participationId: 'p1', logDate: date,
    count, completed: count >= 100, usedPass,
    updatedAt: `${date}T10:00:00Z`,
  }
}

function fullSeasonLogs(): MissionLog[] {
  return Array.from({ length: 100 }, (_, i) => {
    const dt = new Date(Date.UTC(2026, 6, 1 + i))
    const date = dt.toISOString().slice(0, 10)
    return mkLog(date, 100)
  })
}

describe('IssueCompletionBadgeUseCase', () => {
  it('marks completed for participant with 100 done days', async () => {
    const p: ChallengeParticipation = {
      id: 'p1', challengeId: 'c1', memberId: 'm1',
      joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 5,
      completedAt: null, failedAt: null,
    }
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([p]),
      markCompleted: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), decrementPass: vi.fn(), markFailed: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = {
      getByParticipation: vi.fn().mockResolvedValue(fullSeasonLogs()),
      getOne: vi.fn(), upsertCount: vi.fn(), markPass: vi.fn(),
    } as IMissionLogRepository

    const uc = new IssueCompletionBadgeUseCase(cRepo, pRepo, mRepo)
    const r = await uc.execute({ today: '2026-10-09' })

    expect(pRepo.markCompleted).toHaveBeenCalledWith('p1')
    expect(r.completed).toBe(1)
  })

  it('skips when count<100 day total < durationDays', async () => {
    const p: ChallengeParticipation = {
      id: 'p1', challengeId: 'c1', memberId: 'm1',
      joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 5,
      completedAt: null, failedAt: null,
    }
    const logs = fullSeasonLogs()
    logs[50] = mkLog(logs[50]!.logDate, 50)

    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([p]),
      markCompleted: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), decrementPass: vi.fn(), markFailed: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = {
      getByParticipation: vi.fn().mockResolvedValue(logs),
      getOne: vi.fn(), upsertCount: vi.fn(), markPass: vi.fn(),
    } as IMissionLogRepository

    const uc = new IssueCompletionBadgeUseCase(cRepo, pRepo, mRepo)
    const r = await uc.execute({ today: '2026-10-09' })

    expect(pRepo.markCompleted).not.toHaveBeenCalled()
    expect(r.completed).toBe(0)
  })

  it('counts used_pass days toward completion', async () => {
    const p: ChallengeParticipation = {
      id: 'p1', challengeId: 'c1', memberId: 'm1',
      joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 0,
      completedAt: null, failedAt: null,
    }
    const logs = fullSeasonLogs()
    for (let i = 0; i < 5; i++) {
      logs[i] = mkLog(logs[i]!.logDate, 0, true)
    }

    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([p]),
      markCompleted: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), decrementPass: vi.fn(), markFailed: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = {
      getByParticipation: vi.fn().mockResolvedValue(logs),
      getOne: vi.fn(), upsertCount: vi.fn(), markPass: vi.fn(),
    } as IMissionLogRepository

    const uc = new IssueCompletionBadgeUseCase(cRepo, pRepo, mRepo)
    const r = await uc.execute({ today: '2026-10-09' })

    expect(pRepo.markCompleted).toHaveBeenCalledWith('p1')
    expect(r.completed).toBe(1)
  })

  it('skips before season end day', async () => {
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn(),
      markCompleted: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), decrementPass: vi.fn(), markFailed: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = { getByParticipation: vi.fn(), getOne: vi.fn(), upsertCount: vi.fn(), markPass: vi.fn() } as IMissionLogRepository

    const uc = new IssueCompletionBadgeUseCase(cRepo, pRepo, mRepo)
    const r = await uc.execute({ today: '2026-10-08' })  // last day = 2026-10-08, only run AFTER

    expect(r.completed).toBe(0)
    expect(pRepo.listForChallenge).not.toHaveBeenCalled()
  })

  it('skips already-completed and failed', async () => {
    const failed: ChallengeParticipation = {
      id: 'pf', challengeId: 'c1', memberId: 'mf',
      joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 0,
      completedAt: null, failedAt: '2026-08-15T00:00:00Z',
    }
    const done: ChallengeParticipation = {
      id: 'pd', challengeId: 'c1', memberId: 'md',
      joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 3,
      completedAt: '2026-10-09T00:00:00Z', failedAt: null,
    }
    const cRepo = { getActive: vi.fn().mockResolvedValue(challenge), getById: vi.fn(), getUpcoming: vi.fn() } as unknown as IChallengeRepository
    const pRepo = {
      listForChallenge: vi.fn().mockResolvedValue([failed, done]),
      markCompleted: vi.fn(),
      enroll: vi.fn(), getByMember: vi.fn(), decrementPass: vi.fn(), markFailed: vi.fn(),
    } as unknown as IChallengeParticipationRepository
    const mRepo = { getByParticipation: vi.fn(), getOne: vi.fn(), upsertCount: vi.fn(), markPass: vi.fn() } as IMissionLogRepository

    const uc = new IssueCompletionBadgeUseCase(cRepo, pRepo, mRepo)
    const r = await uc.execute({ today: '2026-10-09' })

    expect(mRepo.getByParticipation).not.toHaveBeenCalled()
    expect(pRepo.markCompleted).not.toHaveBeenCalled()
    expect(r.completed).toBe(0)
  })
})
