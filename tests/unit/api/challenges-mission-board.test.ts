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

import { GET } from '@/app/api/challenges/mission/board/route'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { SupabaseMissionLogRepository } from '@/infrastructure/supabase/mission-log-repository'

const mockedCreate = vi.mocked(createServerClient)
const mockedCRepo = vi.mocked(SupabaseChallengeRepository)
const mockedPRepo = vi.mocked(SupabaseChallengeParticipationRepository)
const mockedMRepo = vi.mocked(SupabaseMissionLogRepository)

beforeEach(() => { vi.clearAllMocks() })

describe('GET /api/challenges/mission/board', () => {
  it('returns 401 when not authenticated', async () => {
    mockedCreate.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns board JSON when enrolled', async () => {
    mockedCreate.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1', user_metadata: { member_id: 'm1' } } },
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    mockedCRepo.mockImplementation(function () {
      return {
        getActive: vi.fn().mockResolvedValue({
          id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
          startDate: '2026-07-01', registrationDeadline: '2026-07-04',
          passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
        }),
        getById: vi.fn().mockResolvedValue({
          id: 'c1', title: 't', description: '', goalPerDay: 100, durationDays: 100,
          startDate: '2026-07-01', registrationDeadline: '2026-07-04',
          passCount: 5, status: 'active', createdAt: '2026-06-01T00:00:00Z',
        }),
        getUpcoming: vi.fn(),
      } as unknown as InstanceType<typeof SupabaseChallengeRepository>
    })
    mockedPRepo.mockImplementation(function () {
      return {
        getByMember: vi.fn().mockResolvedValue({
          id: 'p1', challengeId: 'c1', memberId: 'm1',
          joinedAt: '2026-07-01T00:00:00Z', passesRemaining: 5,
          completedAt: null, failedAt: null,
        }),
        enroll: vi.fn(), decrementPass: vi.fn(),
        markFailed: vi.fn(), markCompleted: vi.fn(), listForChallenge: vi.fn(),
      } as unknown as InstanceType<typeof SupabaseChallengeParticipationRepository>
    })
    mockedMRepo.mockImplementation(function () {
      return {
        getByParticipation: vi.fn().mockResolvedValue([]),
        getOne: vi.fn(), upsertCount: vi.fn(), setCount: vi.fn(), markPass: vi.fn(), markRestDay: vi.fn(),
      } as unknown as InstanceType<typeof SupabaseMissionLogRepository>
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cells).toHaveLength(100)
    expect(body.passesRemaining).toBe(5)
  })
})
