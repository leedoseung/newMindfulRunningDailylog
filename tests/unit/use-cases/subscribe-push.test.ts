import { describe, it, expect, vi } from 'vitest'
import { SubscribePushUseCase } from '@/application/use-cases/subscribe-push'
import { UnsubscribePushUseCase } from '@/application/use-cases/unsubscribe-push'
import type { IPushSubscriptionRepository } from '@/domain/repositories/push-subscription-repository'

describe('SubscribePushUseCase', () => {
  it('saves subscription', async () => {
    const repo = {
      save: vi.fn().mockResolvedValue({ id: 's1', memberId: 'm1', endpoint: 'e', p256dh: 'p', auth: 'a', userAgent: null, createdAt: '' }),
      deleteByEndpoint: vi.fn(),
      listByMember: vi.fn(),
    } as IPushSubscriptionRepository
    const uc = new SubscribePushUseCase(repo)
    const r = await uc.execute({
      memberId: 'm1',
      endpoint: 'https://push.example/abc',
      p256dh: 'pk',
      auth: 'auth',
    })
    expect(r.id).toBe('s1')
    expect(repo.save).toHaveBeenCalled()
  })
})

describe('UnsubscribePushUseCase', () => {
  it('deletes by endpoint', async () => {
    const repo = {
      save: vi.fn(),
      deleteByEndpoint: vi.fn(),
      listByMember: vi.fn(),
    } as IPushSubscriptionRepository
    const uc = new UnsubscribePushUseCase(repo)
    await uc.execute({ memberId: 'm1', endpoint: 'https://push.example/abc' })
    expect(repo.deleteByEndpoint).toHaveBeenCalledWith('m1', 'https://push.example/abc')
  })
})
