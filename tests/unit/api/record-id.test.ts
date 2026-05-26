import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockFromSelect = vi.fn()
const mockFromUpdate = vi.fn()
const mockFromDelete = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

const mockFrom = vi.fn((_table: string) => ({
  select: mockFromSelect.mockReturnThis(),
  update: mockFromUpdate.mockReturnThis(),
  delete: mockFromDelete.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  single: mockSingle,
}))

vi.mock('@/infrastructure/supabase/client', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

const { DELETE, PUT } = await import('@/app/api/record/[id]/route')

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('DELETE /api/record/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = new Request('http://localhost/api/record/r1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('r1'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when deleting another member\'s record', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', user_metadata: { member_id: 'm1' } } } })
    mockSingle.mockResolvedValue({ data: { member_id: 'm2' }, error: null })
    const req = new Request('http://localhost/api/record/r1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('r1'))
    expect(res.status).toBe(403)
  })

  it('returns 204 when deleting own record', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', user_metadata: { member_id: 'm1' } } } })
    mockSingle.mockResolvedValue({ data: { member_id: 'm1' }, error: null })
    // After verifyOwnership calls eq+single, delete chain calls eq again — make it resolve
    mockEq
      .mockReturnValueOnce({ single: mockSingle }) // verifyOwnership: select().eq() → chainable for .single()
      .mockResolvedValueOnce({ error: null })       // delete: delete().eq() → Promise
    const req = new Request('http://localhost/api/record/r1', { method: 'DELETE' })
    const res = await DELETE(req, makeParams('r1'))
    expect(res.status).toBe(204)
  })
})
