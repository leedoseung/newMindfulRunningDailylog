import type { IPushSubscriptionRepository } from '@/domain/repositories/push-subscription-repository'

export class UnsubscribePushUseCase {
  constructor(private repo: IPushSubscriptionRepository) {}
  execute(input: { memberId: string; endpoint: string }): Promise<void> {
    return this.repo.deleteByEndpoint(input.memberId, input.endpoint)
  }
}
