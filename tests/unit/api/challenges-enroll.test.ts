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

import { POST } from '@/app/api/challenges/enroll/route'
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

beforeEach(() => { vi.clearAllMocks() })

describe('POST /api/challenges/enroll', () => {
  it('returns 401 when not authenticated', async () => {
    mockedCreate.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ challengeId: 'c1' }) })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 with REGISTRATION_CLOSED code on past deadline', async () => {
    mockedCreate.mockResolvedValue(authedSupabase('m1'))
    mockedCRepo.mockImplementation(function () {
      return {
        getById: vi.fn().mockResolvedValue({
          id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
          startDate: '2026-01-01', registrationDeadline: '2026-01-04',
          passCount: 5, status: 'upcoming', createdAt: '2026-01-01T00:00:00Z',
        }),
        getActive: vi.fn(), getUpcoming: vi.fn(),
      } as unknown as InstanceType<typeof SupabaseChallengeRepository>
    })
    mockedPRepo.mockImplementation(function () {
      return {
        getByMember: vi.fn().mockResolvedValue(null),
        enroll: vi.fn(), decrementPass: vi.fn(),
        markFailed: vi.fn(), markCompleted: vi.fn(), listForChallenge: vi.fn(),
      } as unknown as InstanceType<typeof SupabaseChallengeParticipationRepository>
    })

    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ challengeId: 'c1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('REGISTRATION_CLOSED')
  })

  it('returns 201 with participation on success', async () => {
    mockedCreate.mockResolvedValue(authedSupabase('m1'))
    mockedCRepo.mockImplementation(function () {
      return {
        getById: vi.fn().mockResolvedValue({
          id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
          startDate: '2099-01-01', registrationDeadline: '2099-01-04',
          passCount: 5, status: 'upcoming', createdAt: '2026-01-01T00:00:00Z',
        }),
        getActive: vi.fn(), getUpcoming: vi.fn(),
      } as unknown as InstanceType<typeof SupabaseChallengeRepository>
    })
    mockedPRepo.mockImplementation(function () {
      return {
        getByMember: vi.fn().mockResolvedValue(null),
        enroll: vi.fn().mockResolvedValue({
          id: 'p1', challengeId: 'c1', memberId: 'm1',
          joinedAt: '2026-06-11T00:00:00Z', passesRemaining: 5,
          completedAt: null, failedAt: null,
        }),
        decrementPass: vi.fn(),
        markFailed: vi.fn(), markCompleted: vi.fn(), listForChallenge: vi.fn(),
      } as unknown as InstanceType<typeof SupabaseChallengeParticipationRepository>
    })

    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ challengeId: 'c1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('p1')
  })
})
