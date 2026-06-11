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
vi.mock('@/infrastructure/supabase/mission-log-repository', () => ({
  SupabaseMissionLogRepository: vi.fn(),
}))

import { POST } from '@/app/api/challenges/mission/route'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { SupabaseMissionLogRepository } from '@/infrastructure/supabase/mission-log-repository'

const mockedCreate = vi.mocked(createServerClient)
const mockedCRepo = vi.mocked(SupabaseChallengeRepository)
const mockedPRepo = vi.mocked(SupabaseChallengeParticipationRepository)
const mockedMRepo = vi.mocked(SupabaseMissionLogRepository)

function authed() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'u1', user_metadata: { member_id: 'm1' } } },
      }),
    },
  } as unknown as Awaited<ReturnType<typeof createServerClient>>
}

beforeEach(() => { vi.clearAllMocks() })

describe('POST /api/challenges/mission', () => {
  it('returns 400 NEGATIVE_DELTA', async () => {
    mockedCreate.mockResolvedValue(authed())
    mockedCRepo.mockImplementation(function () {
      return {
        getById: vi.fn().mockResolvedValue({
          id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
          startDate: '2026-01-01', registrationDeadline: '2026-01-04',
          passCount: 5, status: 'active', createdAt: '2026-01-01T00:00:00Z',
        }),
        getActive: vi.fn().mockResolvedValue({
          id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
          startDate: '2026-01-01', registrationDeadline: '2026-01-04',
          passCount: 5, status: 'active', createdAt: '2026-01-01T00:00:00Z',
        }),
        getUpcoming: vi.fn(),
      } as unknown as InstanceType<typeof SupabaseChallengeRepository>
    })
    mockedPRepo.mockImplementation(function () {
      return {
        getByMember: vi.fn().mockResolvedValue({
          id: 'p1', challengeId: 'c1', memberId: 'm1',
          joinedAt: '2026-01-01T00:00:00Z', passesRemaining: 5,
          completedAt: null, failedAt: null,
        }),
        enroll: vi.fn(), decrementPass: vi.fn(),
        markFailed: vi.fn(), markCompleted: vi.fn(), listForChallenge: vi.fn(),
      } as unknown as InstanceType<typeof SupabaseChallengeParticipationRepository>
    })
    mockedMRepo.mockImplementation(function () {
      return {
        getByParticipation: vi.fn(), getOne: vi.fn(),
        upsertCount: vi.fn(), markPass: vi.fn(),
      } as unknown as InstanceType<typeof SupabaseMissionLogRepository>
    })

    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ delta: -1 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('NEGATIVE_DELTA')
  })
})
