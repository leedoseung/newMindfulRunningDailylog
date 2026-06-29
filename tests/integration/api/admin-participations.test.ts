// tests/integration/api/admin-participations.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/infrastructure/supabase/require-admin', () => ({
  requireAdmin: vi.fn(),
  AdminGuardError: class extends Error { constructor(public code: string) { super(code) } },
}))
vi.mock('@/infrastructure/supabase/admin-client', () => ({
  createAdminClient: vi.fn(),
}))

import { GET } from '@/app/api/admin/participations/route'
import { requireAdmin } from '@/infrastructure/supabase/require-admin'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'

beforeEach(() => vi.clearAllMocks())

function mockParticipations(rows: unknown[]) {
  const eq = vi.fn().mockResolvedValue({ data: rows, error: null })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from })
  return { from, select, eq }
}

describe('GET /api/admin/participations', () => {
  it('400 on missing memberId', async () => {
    ;(requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u', memberId: 'm' })
    const res = await GET(new Request('http://x/api/admin/participations'))
    expect(res.status).toBe(400)
  })

  it('200 returns flattened participation list', async () => {
    ;(requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u', memberId: 'm' })
    mockParticipations([{
      id: 'p1',
      challenge_id: 'c1',
      passes_remaining: 2,
      failed_at: null,
      completed_at: null,
      challenge: { title: '런지 100일', start_date: '2026-06-15', duration_days: 100 },
    }])
    const res = await GET(new Request('http://x/api/admin/participations?memberId=m1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.participations).toEqual([{
      id: 'p1', challengeId: 'c1', challengeTitle: '런지 100일',
      startDate: '2026-06-15', durationDays: 100,
      passesRemaining: 2, failedAt: null, completedAt: null,
    }])
  })
})
