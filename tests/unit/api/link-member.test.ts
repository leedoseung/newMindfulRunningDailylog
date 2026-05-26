import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockUpdateUser = vi.fn()
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/infrastructure/supabase/client', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
    },
    from: vi.fn(() => ({
      select: mockSelect.mockReturnThis(),
      update: mockUpdate.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      single: mockSingle,
    })),
  }),
}))

const { POST } = await import('@/app/api/auth/link-member/route')

describe('POST /api/auth/link-member', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = new Request('http://localhost/api/auth/link-member', {
      method: 'POST',
      body: JSON.stringify({ memberId: 'm1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 409 when member is already linked to another account', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } } })
    mockSingle.mockResolvedValue({ data: { auth_user_id: 'user-1' }, error: null })
    const req = new Request('http://localhost/api/auth/link-member', {
      method: 'POST',
      body: JSON.stringify({ memberId: 'm1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('returns 200 and updates member on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: { auth_user_id: null }, error: null })
    mockUpdate.mockReturnThis()
    // First eq() call is in the select chain (must return chain for .single() to work)
    // Second eq() call is in the update chain (must resolve with no error)
    const chainObj = { select: mockSelect, update: mockUpdate, eq: mockEq, single: mockSingle }
    mockEq.mockReturnValueOnce(chainObj).mockResolvedValueOnce({ error: null })
    mockUpdateUser.mockResolvedValue({ error: null })
    const req = new Request('http://localhost/api/auth/link-member', {
      method: 'POST',
      body: JSON.stringify({ memberId: 'm1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
