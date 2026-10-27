import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

describe('SupabaseChallengeRepository (integration)', () => {
  it('getActive returns Challenge or null', async () => {
    const repo = new SupabaseChallengeRepository(supabase)
    const c = await repo.getActive()
    if (c === null) {
      expect(c).toBeNull()
    } else {
      expect(typeof c.id).toBe('string')
      expect(typeof c.title).toBe('string')
      expect(c.status).toBe('active')
      expect(typeof c.goalPerDay).toBe('number')
      expect(typeof c.durationDays).toBe('number')
    }
  })

  it('getUpcoming returns array', async () => {
    const repo = new SupabaseChallengeRepository(supabase)
    const list = await repo.getUpcoming()
    expect(Array.isArray(list)).toBe(true)
    list.forEach(c => expect(c.status).toBe('upcoming'))
  })

  it('getUpcomingOrLateSignup returns upcoming + active-in-signup-window only', async () => {
    const repo = new SupabaseChallengeRepository(supabase)
    const today = new Date().toISOString().slice(0, 10)
    const list = await repo.getUpcomingOrLateSignup(today)
    expect(Array.isArray(list)).toBe(true)
    list.forEach(c => {
      expect(['upcoming', 'active']).toContain(c.status)
      if (c.status === 'active') {
        expect(c.registrationDeadline >= today).toBe(true)
      }
    })
  })
})
