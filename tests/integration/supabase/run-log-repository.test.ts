// tests/integration/supabase/run-log-repository.test.ts
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

describe('SupabaseRunLogRepository (integration)', () => {
  it('getRecentRuns returns RunLog[] shape', async () => {
    const repo = new SupabaseRunLogRepository(supabase)
    const runs = await repo.getRecentRuns(30)
    expect(Array.isArray(runs)).toBe(true)
    if (runs.length > 0) {
      const first = runs[0]!
      expect(typeof first.id).toBe('string')
      expect(typeof first.memberId).toBe('string')
      expect(typeof first.memberName).toBe('string')
      expect(typeof first.durationMin).toBe('number')
      expect(typeof first.photoUrl).toBe('string')
    }
  })

  it('getByMemberId returns runs for a member', async () => {
    const repo = new SupabaseRunLogRepository(supabase)
    const recent = await repo.getRecentRuns(30)
    if (recent.length === 0) return
    const memberId = recent[0]!.memberId
    const memberRuns = await repo.getByMemberId(memberId)
    expect(memberRuns.every(r => r.memberId === memberId)).toBe(true)
  })
})
