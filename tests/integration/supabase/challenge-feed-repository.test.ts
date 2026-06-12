import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { SupabaseChallengeFeedRepository } from '@/infrastructure/supabase/challenge-feed-repository'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

describe('SupabaseChallengeFeedRepository (integration)', () => {
  it('listRecent returns array (empty if no participations)', async () => {
    const repo = new SupabaseChallengeFeedRepository(supabase)
    const list = await repo.listRecent('00000000-0000-0000-0000-000000000000', 20)
    expect(Array.isArray(list)).toBe(true)
  })
})
