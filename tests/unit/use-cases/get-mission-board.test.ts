import { describe, it, expect, vi } from 'vitest'
import { GetMissionBoardUseCase } from '@/application/use-cases/get-mission-board'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'
import type { MissionLog } from '@/domain/entities/mission-log'

const challenge: Challenge = {
  id: 'c1', title: '런지 100일', description: '', goalPerDay: 100,
  durationDays: 100, startDate: '2026-07-01', registrationDeadline: '2026-07-04',
  passCount: 5, status: 'active', goalMin: 100, restDaysPerWeek: 0,
  createdAt: '2026-06-01T00:00:00Z',
}

const participation: ChallengeParticipation = {
  id: 'p1', challengeId: 'c1', memberId: 'm1',
  joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 4,
  completedAt: null, failedAt: null, revivedAt: null,
}

function mkLog(date: string, count: number, usedPass = false): MissionLog {
  return {
    id: `l-${date}`, participationId: 'p1', logDate: date,
    count, completed: count >= 100, usedPass,
    updatedAt: `${date}T10:00:00Z`,
  }
}

describe('GetMissionBoardUseCase', () => {
  it('returns 100 cells with correct states', async () => {
    const cRepo = {
      getById: vi.fn().mockResolvedValue(challenge), getActive: vi.fn(), getUpcoming: vi.fn(),
    } as unknown as IChallengeRepository
    const mRepo = {
      getByParticipation: vi.fn().mockResolvedValue([
        mkLog('2026-07-01', 100),
        mkLog('2026-07-02', 100),
        mkLog('2026-07-03', 50),
        mkLog('2026-07-04', 0, true),
        mkLog('2026-07-06', 30),
      ]),
      getOne: vi.fn(), upsertCount: vi.fn(), setCount: vi.fn(), markPass: vi.fn(), markRestDay: vi.fn(),
    } as IMissionLogRepository

    const uc = new GetMissionBoardUseCase(cRepo, mRepo)
    const board = await uc.execute({ participation, today: '2026-07-06' })

    expect(board.cells).toHaveLength(100)
    expect(board.cells[0]!.state).toBe('done')
    expect(board.cells[1]!.state).toBe('done')
    expect(board.cells[2]!.state).toBe('partial')
    expect(board.cells[3]!.state).toBe('pass')
    expect(board.cells[4]!.state).toBe('miss')
    expect(board.cells[5]!.state).toBe('today')
    expect(board.cells[6]!.state).toBe('future')
    expect(board.cells[99]!.state).toBe('future')
  })

  it('computes streak from latest back (done+pass keeps streak)', async () => {
    const cRepo = {
      getById: vi.fn().mockResolvedValue(challenge), getActive: vi.fn(), getUpcoming: vi.fn(),
    } as unknown as IChallengeRepository
    const mRepo = {
      getByParticipation: vi.fn().mockResolvedValue([
        mkLog('2026-07-01', 100),
        mkLog('2026-07-02', 0, true),
        mkLog('2026-07-03', 100),
        mkLog('2026-07-04', 50),
        mkLog('2026-07-05', 100),
      ]),
      getOne: vi.fn(), upsertCount: vi.fn(), setCount: vi.fn(), markPass: vi.fn(), markRestDay: vi.fn(),
    } as IMissionLogRepository

    const uc = new GetMissionBoardUseCase(cRepo, mRepo)
    const board = await uc.execute({ participation, today: '2026-07-05' })

    expect(board.streak).toBe(5)
  })

  it('streak breaks on miss (count=0 no pass)', async () => {
    const cRepo = {
      getById: vi.fn().mockResolvedValue(challenge), getActive: vi.fn(), getUpcoming: vi.fn(),
    } as unknown as IChallengeRepository
    const mRepo = {
      getByParticipation: vi.fn().mockResolvedValue([
        mkLog('2026-07-01', 100),
        mkLog('2026-07-03', 100),
        mkLog('2026-07-04', 100),
      ]),
      getOne: vi.fn(), upsertCount: vi.fn(), setCount: vi.fn(), markPass: vi.fn(), markRestDay: vi.fn(),
    } as IMissionLogRepository

    const uc = new GetMissionBoardUseCase(cRepo, mRepo)
    const board = await uc.execute({ participation, today: '2026-07-04' })
    expect(board.streak).toBe(2)
  })

  it('counts completed days correctly (done OR pass)', async () => {
    const cRepo = {
      getById: vi.fn().mockResolvedValue(challenge), getActive: vi.fn(), getUpcoming: vi.fn(),
    } as unknown as IChallengeRepository
    const mRepo = {
      getByParticipation: vi.fn().mockResolvedValue([
        mkLog('2026-07-01', 100),
        mkLog('2026-07-02', 50),
        mkLog('2026-07-03', 0, true),
      ]),
      getOne: vi.fn(), upsertCount: vi.fn(), setCount: vi.fn(), markPass: vi.fn(), markRestDay: vi.fn(),
    } as IMissionLogRepository

    const uc = new GetMissionBoardUseCase(cRepo, mRepo)
    const board = await uc.execute({ participation, today: '2026-07-03' })
    expect(board.completedDays).toBe(2)
    expect(board.passesRemaining).toBe(4)
  })
})
