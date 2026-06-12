import type { IPushSubscriptionRepository, SaveSubscriptionInput } from '@/domain/repositories/push-subscription-repository'
import type { PushSubscriptionEntity } from '@/domain/entities/push-subscription'

export class SubscribePushUseCase {
  constructor(private repo: IPushSubscriptionRepository) {}
  execute(input: SaveSubscriptionInput): Promise<PushSubscriptionEntity> {
    return this.repo.save(input)
  }
}
