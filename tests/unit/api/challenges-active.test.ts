import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/infrastructure/supabase/client', () => ({
  createServerClient: vi.fn(),
}))
vi.mock('@/infrastructure/supabase/challenge-repository', () => ({
  SupabaseChallengeRepository: vi.fn(),
}))
vi.mock('@/infrastructure/supabase/challenge-participation-repository', () => ({
  SupabaseChallengeParticipationRepository: vi.fn(),
}))

import { GET } from '@/app/api/challenges/active/route'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'

const mockedCreate = vi.mocked(createServerClient)
const mockedCRepo = vi.mocked(SupabaseChallengeRepository)
const mockedPRepo = vi.mocked(SupabaseChallengeParticipationRepository)

function authedSupabase(memberId: string) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'u1', user_metadata: { member_id: memberId } } },
      }),
    },
  } as unknown as Awaited<ReturnType<typeof createServerClient>>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/challenges/active', () => {
  it('returns 401 when not authenticated', async () => {
    mockedCreate.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns { challenge, participation } when authenticated', async () => {
    mockedCreate.mockResolvedValue(authedSupabase('m1'))
    mockedCRepo.mockImplementation(function () {
      return {
        getActive: vi.fn().mockResolvedValue({ id: 'c1', status: 'active' }),
        getById: vi.fn(), getUpcoming: vi.fn(),
      } as unknown as InstanceType<typeof SupabaseChallengeRepository>
    })
    mockedPRepo.mockImplementation(function () {
      return {
        getByMember: vi.fn().mockResolvedValue({ id: 'p1' }),
        enroll: vi.fn(), decrementPass: vi.fn(),
        markFailed: vi.fn(), markCompleted: vi.fn(), listForChallenge: vi.fn(), delete: vi.fn(),
      } as unknown as InstanceType<typeof SupabaseChallengeParticipationRepository>
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.challenge.id).toBe('c1')
    expect(body.participation.id).toBe('p1')
  })
})
