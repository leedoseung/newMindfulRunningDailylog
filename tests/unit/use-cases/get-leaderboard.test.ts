import { GetLeaderboardUseCase } from '@/application/use-cases/get-leaderboard'
import type { IMemberRepository } from '@/domain/repositories/member-repository'
import type { MemberStats } from '@/domain/entities/member'
import { vi } from 'vitest'

const makeStats = (overrides: Partial<MemberStats> = {}): MemberStats => ({
  id: 'mem-1',
  name: '이두승',
  groupName: 'A조',
  generation: '1기',
  instaId: 'doseu', avatarUrl: '',
  totalCount: 50,
  totalMinutes: 1500,
  monthlyCount: 5,
  monthlyMinutes: 150,
  ...overrides,
})

describe('GetLeaderboardUseCase', () => {
  it('calls repo.getLeaderboard', async () => {
    const mockRepo: IMemberRepository = {
      getAll: vi.fn(),
      getLeaderboard: vi.fn().mockResolvedValue([makeStats()]),
      getById: vi.fn(),
    }
    const useCase = new GetLeaderboardUseCase(mockRepo)
    await useCase.execute()
    expect(mockRepo.getLeaderboard).toHaveBeenCalledOnce()
  })

  it('returns leaderboard data', async () => {
    const stats = [makeStats({ totalCount: 100 }), makeStats({ id: 'mem-2', totalCount: 80 })]
    const mockRepo: IMemberRepository = {
      getAll: vi.fn(),
      getLeaderboard: vi.fn().mockResolvedValue(stats),
      getById: vi.fn(),
    }
    const useCase = new GetLeaderboardUseCase(mockRepo)
    const result = await useCase.execute()
    expect(result[0]?.totalCount).toBe(100)
  })
})
