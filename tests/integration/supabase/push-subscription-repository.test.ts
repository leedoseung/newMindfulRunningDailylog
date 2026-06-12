import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { SupabasePushSubscriptionRepository } from '@/infrastructure/supabase/push-subscription-repository'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

describe('SupabasePushSubscriptionRepository (integration)', () => {
  it('listByMember returns array', async () => {
    const repo = new SupabasePushSubscriptionRepository(supabase)
    const list = await repo.listByMember('00000000-0000-0000-0000-000000000000')
    expect(Array.isArray(list)).toBe(true)
  })
})
