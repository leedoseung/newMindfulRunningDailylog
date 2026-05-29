import { describe, it, expect, vi } from 'vitest'
import { SaveRunLogUseCase } from '@/application/use-cases/save-run-log'
import type { IRunLogRepository } from '@/domain/repositories/run-log-repository'
import type { RunLogInput } from '@/domain/entities/run-log-input'
import type { RunLog } from '@/domain/entities/run-log'

const input: RunLogInput = {
  memberId: 'm1', date: '2026-05-26', durationMin: 30,
  title: '테스트 달리기', thoughtBefore: '설레', thoughtDuring: '힘들다',
  thoughtAfter: '뿌듯', location: '한강', photoUrl: '',
}

const savedRun: RunLog = {
  id: 'r1', memberId: 'm1', memberName: '이두승', memberAvatarUrl: '', memberInstaId: '', date: '2026-05-26',
  durationMin: 30, title: '테스트 달리기', thoughtBefore: '설레',
  thoughtDuring: '힘들다', thoughtAfter: '뿌듯', location: '한강',
  photoUrl: '', createdAt: '2026-05-26T00:00:00Z',
}

describe('SaveRunLogUseCase', () => {
  it('calls repo.save with input and returns result', async () => {
    const mockRepo = {
      getRecentRuns: vi.fn(),
      getByMemberId: vi.fn(),
      save: vi.fn().mockResolvedValue(savedRun),
    } as unknown as IRunLogRepository

    const useCase = new SaveRunLogUseCase(mockRepo)
    const result = await useCase.execute(input)

    expect(mockRepo.save).toHaveBeenCalledWith(input)
    expect(result).toEqual(savedRun)
  })
})
