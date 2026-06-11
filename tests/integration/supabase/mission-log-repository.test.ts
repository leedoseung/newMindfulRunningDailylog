import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { SupabaseMissionLogRepository } from '@/infrastructure/supabase/mission-log-repository'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

describe('SupabaseMissionLogRepository (integration)', () => {
  it('getByParticipation returns array shape', async () => {
    const repo = new SupabaseMissionLogRepository(supabase)
    const list = await repo.getByParticipation('00000000-0000-0000-0000-000000000000')
    expect(Array.isArray(list)).toBe(true)
  })

  it('getOne returns null for missing row', async () => {
    const repo = new SupabaseMissionLogRepository(supabase)
    const r = await repo.getOne('00000000-0000-0000-0000-000000000000', '2026-01-01')
    expect(r).toBeNull()
  })
})
