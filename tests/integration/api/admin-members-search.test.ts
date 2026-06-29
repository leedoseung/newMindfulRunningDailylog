// tests/integration/api/admin-members-search.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/infrastructure/supabase/require-admin', () => ({
  requireAdmin: vi.fn(),
  AdminGuardError: class extends Error { constructor(public code: string) { super(code) } },
}))
vi.mock('@/infrastructure/supabase/admin-client', () => ({
  createAdminClient: vi.fn(),
}))

import { GET } from '@/app/api/admin/members/search/route'
import { requireAdmin, AdminGuardError } from '@/infrastructure/supabase/require-admin'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'

beforeEach(() => vi.clearAllMocks())

function mockMembers(rows: Array<{ id: string; name: string; generation: string }>) {
  const limit = vi.fn().mockResolvedValue({ data: rows, error: null })
  const order = vi.fn().mockReturnValue({ limit })
  const ilike = vi.fn().mockReturnValue({ order })
  const select = vi.fn().mockReturnValue({ ilike })
  const from = vi.fn().mockReturnValue({ select })
  ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from })
  return { from, select, ilike, order, limit }
}

describe('GET /api/admin/members/search', () => {
  it('401 when no auth', async () => {
    ;(requireAdmin as ReturnType<typeof vi.fn>).mockRejectedValue(new AdminGuardError('UNAUTHENTICATED'))
    const res = await GET(new Request('http://x/api/admin/members/search?q=한'))
    expect(res.status).toBe(401)
  })

  it('400 on missing q', async () => {
    ;(requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u', memberId: 'm' })
    const res = await GET(new Request('http://x/api/admin/members/search'))
    expect(res.status).toBe(400)
  })

  it('200 returns member list with limit 10', async () => {
    ;(requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u', memberId: 'm' })
    const m = mockMembers([{ id: 'm1', name: '한채원', generation: '5기' }])
    const res = await GET(new Request('http://x/api/admin/members/search?q=한'))
    expect(res.status).toBe(200)
    expect(m.ilike).toHaveBeenCalledWith('name', '%한%')
    expect(m.limit).toHaveBeenCalledWith(10)
    const body = await res.json()
    expect(body.members).toEqual([{ id: 'm1', name: '한채원', generation: '5기' }])
  })
})
