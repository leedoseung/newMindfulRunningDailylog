import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  IPushSubscriptionRepository,
  SaveSubscriptionInput,
} from '@/domain/repositories/push-subscription-repository'
import type { PushSubscriptionEntity } from '@/domain/entities/push-subscription'

type Row = {
  id: string
  member_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: string
}

function toEntity(row: Row): PushSubscriptionEntity {
  return {
    id: row.id,
    memberId: row.member_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }
}

const SELECT = 'id, member_id, endpoint, p256dh, auth, user_agent, created_at'

export class SupabasePushSubscriptionRepository implements IPushSubscriptionRepository {
  constructor(private supabase: SupabaseClient) {}

  async save(input: SaveSubscriptionInput): Promise<PushSubscriptionEntity> {
    const { data, error } = await this.supabase
      .from('push_subscriptions')
      .upsert(
        {
          member_id: input.memberId,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          user_agent: input.userAgent ?? null,
        },
        { onConflict: 'member_id,endpoint', ignoreDuplicates: false }
      )
      .select(SELECT)
      .single()
    if (error) throw new Error(`save failed: ${error.message}`)
    return toEntity(data as unknown as Row)
  }

  async deleteByEndpoint(memberId: string, endpoint: string): Promise<void> {
    const { error } = await this.supabase
      .from('push_subscriptions')
      .delete()
      .eq('member_id', memberId)
      .eq('endpoint', endpoint)
    if (error) throw new Error(`deleteByEndpoint failed: ${error.message}`)
  }

  async listByMember(memberId: string): Promise<PushSubscriptionEntity[]> {
    const { data, error } = await this.supabase
      .from('push_subscriptions')
      .select(SELECT)
      .eq('member_id', memberId)
    if (error) throw new Error(`listByMember failed: ${error.message}`)
    return (data as unknown as Row[]).map(toEntity)
  }
}
