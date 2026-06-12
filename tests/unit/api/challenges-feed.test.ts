import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/infrastructure/supabase/client', () => ({ createServerClient: vi.fn() }))
vi.mock('@/infrastructure/supabase/challenge-repository', () => ({ SupabaseChallengeRepository: vi.fn() }))
vi.mock('@/infrastructure/supabase/challenge-feed-repository', () => ({ SupabaseChallengeFeedRepository: vi.fn() }))

import { GET } from '@/app/api/challenges/feed/route'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeFeedRepository } from '@/infrastructure/supabase/challenge-feed-repository'

const mockedCreate = vi.mocked(createServerClient)
const mockedCRepo = vi.mocked(SupabaseChallengeRepository)
const mockedFRepo = vi.mocked(SupabaseChallengeFeedRepository)

beforeEach(() => vi.clearAllMocks())

describe('GET /api/challenges/feed', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedCreate.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns feed when active challenge exists', async () => {
    mockedCreate.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', user_metadata: { member_id: 'm1' } } } }) },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    mockedCRepo.mockImplementation(function () {
      return {
        getActive: vi.fn().mockResolvedValue({ id: 'c1' }),
        getById: vi.fn(), getUpcoming: vi.fn(),
      } as unknown as InstanceType<typeof SupabaseChallengeRepository>
    })
    mockedFRepo.mockImplementation(function () {
      return {
        listRecent: vi.fn().mockResolvedValue([
          { id: 'l1', memberId: 'm1', memberName: '두승', memberAvatarUrl: '', logDate: '2026-08-15', dayIndex: 45, count: 100, completed: true },
        ]),
      } as unknown as InstanceType<typeof SupabaseChallengeFeedRepository>
    })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
  })

  it('returns empty items when no active challenge', async () => {
    mockedCreate.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', user_metadata: { member_id: 'm1' } } } }) },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    mockedCRepo.mockImplementation(function () {
      return {
        getActive: vi.fn().mockResolvedValue(null),
        getById: vi.fn(), getUpcoming: vi.fn(),
      } as unknown as InstanceType<typeof SupabaseChallengeRepository>
    })
    const res = await GET()
    const body = await res.json()
    expect(body.items).toEqual([])
  })
})
