// tests/unit/infrastructure/require-admin.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/infrastructure/supabase/server-auth', () => ({
  getServerAuth: vi.fn(),
}))
vi.mock('@/infrastructure/supabase/admin-client', () => ({
  createAdminClient: vi.fn(),
}))

import { requireAdmin, AdminGuardError } from '@/infrastructure/supabase/require-admin'
import { getServerAuth } from '@/infrastructure/supabase/server-auth'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'

function mockAdminClient(row: { is_admin: boolean } | null, error: { message: string } | null = null) {
  const single = vi.fn().mockResolvedValue({ data: row, error })
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from })
  return { from, select, eq, single }
}

beforeEach(() => vi.clearAllMocks())

describe('requireAdmin', () => {
  it('throws UNAUTHENTICATED when no auth', async () => {
    ;(getServerAuth as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await expect(requireAdmin()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('throws UNAUTHENTICATED when authed but no member_id', async () => {
    ;(getServerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u1', memberId: null })
    await expect(requireAdmin()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('throws NOT_ADMIN when is_admin=false', async () => {
    ;(getServerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u1', memberId: 'm1' })
    mockAdminClient({ is_admin: false })
    await expect(requireAdmin()).rejects.toMatchObject({ code: 'NOT_ADMIN' })
  })

  it('returns ids when is_admin=true', async () => {
    ;(getServerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u1', memberId: 'm1' })
    mockAdminClient({ is_admin: true })
    await expect(requireAdmin()).resolves.toEqual({ userId: 'u1', memberId: 'm1' })
  })
})
