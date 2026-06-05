import { GetMemberRecordsUseCase } from '@/application/use-cases/get-member-records'
import type { IRunLogRepository } from '@/domain/repositories/run-log-repository'
import type { RunLog } from '@/domain/entities/run-log'
import { vi } from 'vitest'

const makeRun = (id: string): RunLog => ({
  id,
  memberId: 'mem-1',
  memberName: '이두승', memberAvatarUrl: '', memberInstaId: '',
  date: '2026-05-24', runTime: null,
  durationMin: 30,
  title: '달리기',
  thoughtBefore: '',
  thoughtDuring: '',
  thoughtAfter: '',
  location: '',
  photoUrl: '',
  rawPhotoUrl: null,
  createdAt: '2026-05-24T09:00:00Z',
  likeCount: 0,
  commentCount: 0,
})

describe('GetMemberRecordsUseCase', () => {
  it('calls repo.getByMemberId with memberId', async () => {
    const mockRepo: IRunLogRepository = {
      getRecentRuns: vi.fn(),
      getRunsPage: vi.fn(),
      getByDate: vi.fn(),
      getByMemberId: vi.fn().mockResolvedValue([makeRun('r1')]),
      save: vi.fn(),
    }
    const useCase = new GetMemberRecordsUseCase(mockRepo)
    await useCase.execute('mem-1')
    expect(mockRepo.getByMemberId).toHaveBeenCalledWith('mem-1')
  })

  it('returns member records', async () => {
    const runs = [makeRun('r1'), makeRun('r2')]
    const mockRepo: IRunLogRepository = {
      getRecentRuns: vi.fn(),
      getRunsPage: vi.fn(),
      getByDate: vi.fn(),
      getByMemberId: vi.fn().mockResolvedValue(runs),
      save: vi.fn(),
    }
    const useCase = new GetMemberRecordsUseCase(mockRepo)
    const result = await useCase.execute('mem-1')
    expect(result).toHaveLength(2)
  })
})
