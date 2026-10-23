import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'

type ChallengeRowFixture = {
  id: string
  title: string
  description: string | null
  goal_per_day: number
  duration_days: number
  start_date: string
  registration_deadline: string
  pass_count: number
  status: 'upcoming' | 'active' | 'ended'
  image_url: string | null
  goal_min: number | null
  rest_days_per_week: number | null
  season_number: number
  created_at: string
}

function makeRow(overrides: Partial<ChallengeRowFixture> = {}): ChallengeRowFixture {
  return {
    id: 'c1',
    title: '런지 챌린지 1기',
    description: '여름의 100일',
    goal_per_day: 100,
    duration_days: 100,
    start_date: '2026-06-11',
    registration_deadline: '2026-06-10',
    pass_count: 5,
    status: 'active',
    image_url: null,
    goal_min: 10,
    rest_days_per_week: 1,
    season_number: 1,
    created_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

function buildClient(row: ChallengeRowFixture | ChallengeRowFixture[] | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: Array.isArray(row) ? row[0] ?? null : row, error: null })
  const limit = vi.fn().mockReturnValue({ maybeSingle })
  const order = vi.fn().mockReturnValue({ limit })
  const eq = vi.fn().mockReturnValue({ order, maybeSingle, limit })
  const select = vi.fn().mockReturnValue({ eq, order })
  // For getUpcoming (returns array via order chain)
  if (Array.isArray(row)) {
    const orderList = vi.fn().mockResolvedValue({ data: row, error: null })
    select.mockReturnValue({ eq: vi.fn().mockReturnValue({ order: orderList }) })
  }
  const from = vi.fn().mockReturnValue({ select })
  return { from } as unknown as SupabaseClient
}

describe('SupabaseChallengeRepository mapping', () => {
  it('getActive maps season_number -> seasonNumber', async () => {
    const client = buildClient(makeRow({ status: 'active', season_number: 1 }))
    const repo = new SupabaseChallengeRepository(client)
    const c = await repo.getActive()
    expect(c).not.toBeNull()
    expect(c!.seasonNumber).toBe(1)
  })

  it('getById returns Challenge with seasonNumber=2 for S2 fixture', async () => {
    const client = buildClient(
      makeRow({
        id: 'c2',
        season_number: 2,
        duration_days: 30,
        title: '런지 챌린지 2기',
        status: 'upcoming',
      }),
    )
    const repo = new SupabaseChallengeRepository(client)
    const c = await repo.getById('c2')
    expect(c).not.toBeNull()
    expect(c!.seasonNumber).toBe(2)
    expect(c!.durationDays).toBe(30)
    expect(c!.title).toBe('런지 챌린지 2기')
  })

  it('getMostRecentEnded exposes seasonNumber', async () => {
    const client = buildClient(makeRow({ status: 'ended', season_number: 1 }))
    const repo = new SupabaseChallengeRepository(client)
    const c = await repo.getMostRecentEnded()
    expect(c).not.toBeNull()
    expect(c!.seasonNumber).toBe(1)
  })

  it('getUpcoming maps array elements', async () => {
    const client = buildClient([
      makeRow({ id: 'c2', season_number: 2, status: 'upcoming', duration_days: 30 }),
    ])
    const repo = new SupabaseChallengeRepository(client)
    const list = await repo.getUpcoming()
    expect(list).toHaveLength(1)
    expect(list[0]!.seasonNumber).toBe(2)
  })
})
