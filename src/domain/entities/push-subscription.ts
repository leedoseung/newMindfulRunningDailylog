export type PushSubscriptionEntity = {
  id: string
  memberId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string | null
  createdAt: string
}
