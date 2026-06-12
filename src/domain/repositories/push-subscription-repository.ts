import type { PushSubscriptionEntity } from '@/domain/entities/push-subscription'

export type SaveSubscriptionInput = {
  memberId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}

export interface IPushSubscriptionRepository {
  save(input: SaveSubscriptionInput): Promise<PushSubscriptionEntity>
  deleteByEndpoint(memberId: string, endpoint: string): Promise<void>
  listByMember(memberId: string): Promise<PushSubscriptionEntity[]>
}
