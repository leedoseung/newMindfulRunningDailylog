import { describe, it, expect, vi } from 'vitest'
import { GetChallengeFeedUseCase, type IChallengeFeedRepository } from '@/application/use-cases/get-challenge-feed'

describe('GetChallengeFeedUseCase', () => {
  it('returns recent feed items', async () => {
    const items = [
      {
        id: 'l1', memberId: 'm1', memberName: '두승', memberAvatarUrl: '',
        logDate: '2026-08-15', dayIndex: 45, count: 100, completed: true,
      },
    ]
    const repo = { listRecent: vi.fn().mockResolvedValue(items) } as IChallengeFeedRepository
    const uc = new GetChallengeFeedUseCase(repo)
    const r = await uc.execute({ challengeId: 'c1', limit: 20 })
    expect(r).toEqual(items)
    expect(repo.listRecent).toHaveBeenCalledWith('c1', 20)
  })
})
