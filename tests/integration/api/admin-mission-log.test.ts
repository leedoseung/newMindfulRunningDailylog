// tests/integration/api/admin-mission-log.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/infrastructure/supabase/require-admin', () => ({
  requireAdmin: vi.fn(),
  AdminGuardError: class extends Error {
    constructor(public code: string) { super(code) }
  },
}))
vi.mock('@/infrastructure/supabase/admin-client', () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}))
vi.mock('@/infrastructure/supabase/admin-mission-log-repository', () => ({
  AdminMissionLogRepository: vi.fn(),
}))

import { POST, GET } from '@/app/api/admin/mission-log/route'
import { requireAdmin, AdminGuardError } from '@/infrastructure/supabase/require-admin'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'
import { AdminMissionLogRepository } from '@/infrastructure/supabase/admin-mission-log-repository'

beforeEach(() => vi.clearAllMocks())

function req(body: unknown): Request {
  return new Request('http://x/api/admin/mission-log', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('POST /api/admin/mission-log', () => {
  it('401 when unauthenticated', async () => {
    ;(requireAdmin as ReturnType<typeof vi.fn>).mockRejectedValue(new AdminGuardError('UNAUTHENTICATED'))
    const res = await POST(req({ op: 'setCount', participationId: 'p1', logDate: '2026-06-28', count: 100 }))
    expect(res.status).toBe(401)
  })

  it('403 when not admin', async () => {
    ;(requireAdmin as ReturnType<typeof vi.fn>).mockRejectedValue(new AdminGuardError('NOT_ADMIN'))
    const res = await POST(req({ op: 'setCount', participationId: 'p1', logDate: '2026-06-28', count: 100 }))
    expect(res.status).toBe(403)
  })

  it('400 on missing op', async () => {
    ;(requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u', memberId: 'm' })
    const res = await POST(req({ participationId: 'p1', logDate: '2026-06-28', count: 100 }))
    expect(res.status).toBe(400)
  })

  it('200 setCount delegates to repo', async () => {
    ;(requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u', memberId: 'm' })
    const setCount = vi.fn().mockResolvedValue({ id: 'log1', count: 110 })
    // vitest 4.x: arrow fn not constructible with `new` — must use function keyword
    ;(AdminMissionLogRepository as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () { return { setCount } })
    const res = await POST(req({ op: 'setCount', participationId: 'p1', logDate: '2026-06-28', count: 110 }))
    expect(res.status).toBe(200)
    expect(setCount).toHaveBeenCalledWith({ participationId: 'p1', logDate: '2026-06-28', count: 110, note: null })
    const body = await res.json()
    expect(body.log.count).toBe(110)
  })

  it('200 adjustPasses returns passesRemaining', async () => {
    ;(requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u', memberId: 'm' })
    const adjust = vi.fn().mockResolvedValue({ passesRemaining: 4 })
    // vitest 4.x: arrow fn not constructible with `new` — must use function keyword
    ;(AdminMissionLogRepository as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () { return { adjustPassesRemaining: adjust } })
    const res = await POST(req({ op: 'adjustPasses', participationId: 'p1', delta: 1 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.passesRemaining).toBe(4)
  })
})

describe('GET /api/admin/mission-log', () => {
  it('400 on missing participationId', async () => {
    ;(requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u', memberId: 'm' })
    const res = await GET(new Request('http://x/api/admin/mission-log'))
    expect(res.status).toBe(400)
  })

  it('200 returns logs ordered by date', async () => {
    ;(requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u', memberId: 'm' })
    const order = vi.fn().mockResolvedValue({
      data: [{
        id: 'l1', participation_id: 'p1', log_date: '2026-06-28', count: 110,
        completed: true, used_pass: false, is_rest_day: false, note: null,
        updated_at: '2026-06-29T00:00:00Z',
      }],
      error: null,
    })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    ;(createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ from })
    const res = await GET(new Request('http://x/api/admin/mission-log?participationId=p1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.logs[0].count).toBe(110)
  })
})
