import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { SupabaseMemberRepository } from '@/infrastructure/supabase/member-repository'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

describe('SupabaseMemberRepository (integration)', () => {
  it('getAll returns Member[] shape', async () => {
    const repo = new SupabaseMemberRepository(supabase)
    const members = await repo.getAll()
    expect(Array.isArray(members)).toBe(true)
    if (members.length > 0) {
      const first = members[0]!
      expect(typeof first.id).toBe('string')
      expect(typeof first.name).toBe('string')
      expect(typeof first.groupName).toBe('string')
    }
  })

  it('getLeaderboard returns MemberStats[] sorted by totalCount desc', async () => {
    const repo = new SupabaseMemberRepository(supabase)
    const stats = await repo.getLeaderboard()
    expect(Array.isArray(stats)).toBe(true)
    if (stats.length >= 2) {
      expect(stats[0]!.totalCount).toBeGreaterThanOrEqual(stats[1]!.totalCount)
    }
    if (stats.length > 0) {
      expect(typeof stats[0]!.totalCount).toBe('number')
      expect(typeof stats[0]!.monthlyCount).toBe('number')
    }
  })
})
