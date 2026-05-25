import { GetMemberRecordsUseCase } from '@/application/use-cases/get-member-records'
import type { IRunLogRepository } from '@/domain/repositories/run-log-repository'
import type { RunLog } from '@/domain/entities/run-log'
import { vi } from 'vitest'

const makeRun = (id: string): RunLog => ({
  id,
  memberId: 'mem-1',
  memberName: '이두승',
  date: '2026-05-24',
  durationMin: 30,
  title: '달리기',
  thoughtBefore: '',
  thoughtDuring: '',
  thoughtAfter: '',
  location: '',
  photoUrl: '',
  createdAt: '2026-05-24T09:00:00Z',
})

describe('GetMemberRecordsUseCase', () => {
  it('calls repo.getByMemberId with memberId', async () => {
    const mockRepo: IRunLogRepository = {
      getRecentRuns: vi.fn(),
      getByMemberId: vi.fn().mockResolvedValue([makeRun('r1')]),
    }
    const useCase = new GetMemberRecordsUseCase(mockRepo)
    await useCase.execute('mem-1')
    expect(mockRepo.getByMemberId).toHaveBeenCalledWith('mem-1')
  })

  it('returns member records', async () => {
    const runs = [makeRun('r1'), makeRun('r2')]
    const mockRepo: IRunLogRepository = {
      getRecentRuns: vi.fn(),
      getByMemberId: vi.fn().mockResolvedValue(runs),
    }
    const useCase = new GetMemberRecordsUseCase(mockRepo)
    const result = await useCase.execute('mem-1')
    expect(result).toHaveLength(2)
  })
})
