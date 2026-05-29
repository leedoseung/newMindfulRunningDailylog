import { GetRecentRunsUseCase } from '@/application/use-cases/get-recent-runs'
import type { IRunLogRepository } from '@/domain/repositories/run-log-repository'
import type { RunLog } from '@/domain/entities/run-log'
import { vi } from 'vitest'

const makeRun = (overrides: Partial<RunLog> = {}): RunLog => ({
  id: 'uuid-1',
  memberId: 'mem-1',
  memberName: '이두승', memberAvatarUrl: '', memberInstaId: '',
  date: '2026-05-24',
  durationMin: 30,
  title: '테스트 달리기',
  thoughtBefore: '',
  thoughtDuring: '',
  thoughtAfter: '',
  location: '',
  photoUrl: '',
  createdAt: '2026-05-24T09:00:00Z',
  ...overrides,
})

describe('GetRecentRunsUseCase', () => {
  it('calls repo.getRecentRuns with given days', async () => {
    const mockRepo: IRunLogRepository = {
      getRecentRuns: vi.fn().mockResolvedValue([makeRun()]),
      getRunsPage: vi.fn(),
      getByDate: vi.fn(),
      getByMemberId: vi.fn(),
      save: vi.fn(),
    }
    const useCase = new GetRecentRunsUseCase(mockRepo)
    await useCase.execute(14)
    expect(mockRepo.getRecentRuns).toHaveBeenCalledWith(14)
  })

  it('returns runs from repo', async () => {
    const runs = [makeRun({ id: 'r1' }), makeRun({ id: 'r2' })]
    const mockRepo: IRunLogRepository = {
      getRecentRuns: vi.fn().mockResolvedValue(runs),
      getRunsPage: vi.fn(),
      getByDate: vi.fn(),
      getByMemberId: vi.fn(),
      save: vi.fn(),
    }
    const useCase = new GetRecentRunsUseCase(mockRepo)
    const result = await useCase.execute()
    expect(result).toHaveLength(2)
    expect(result[0]?.id).toBe('r1')
  })

  it('defaults to 7 days', async () => {
    const mockRepo: IRunLogRepository = {
      getRecentRuns: vi.fn().mockResolvedValue([]),
      getRunsPage: vi.fn(),
      getByDate: vi.fn(),
      getByMemberId: vi.fn(),
      save: vi.fn(),
    }
    const useCase = new GetRecentRunsUseCase(mockRepo)
    await useCase.execute()
    expect(mockRepo.getRecentRuns).toHaveBeenCalledWith(7)
  })
})
