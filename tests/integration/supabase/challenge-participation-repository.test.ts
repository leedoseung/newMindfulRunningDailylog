import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

describe('SupabaseChallengeParticipationRepository (integration)', () => {
  it('getByMember returns null when not enrolled', async () => {
    const repo = new SupabaseChallengeParticipationRepository(supabase)
    const result = await repo.getByMember('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')
    expect(result).toBeNull()
  })

  it('listForChallenge returns array shape', async () => {
    const repo = new SupabaseChallengeParticipationRepository(supabase)
    const list = await repo.listForChallenge('00000000-0000-0000-0000-000000000000')
    expect(Array.isArray(list)).toBe(true)
  })
})
