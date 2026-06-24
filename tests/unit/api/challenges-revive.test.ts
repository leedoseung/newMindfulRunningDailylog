import { describe, it, expect, vi, beforeEach } from 'vitest'

const executeMock = vi.fn()
vi.mock('@/application/use-cases/revive-challenge-participation', () => ({
  ReviveChallengeParticipationUseCase: vi.fn(function () {
    return { execute: executeMock }
  }),
}))
vi.mock('@/infrastructure/supabase/challenge-repository', () => ({
  SupabaseChallengeRepository: vi.fn(),
}))
vi.mock('@/infrastructure/supabase/challenge-participation-repository', () => ({
  SupabaseChallengeParticipationRepository: vi.fn(),
}))

const createServerClient = vi.fn()
vi.mock('@/infrastructure/supabase/client', () => ({
  createServerClient: (...args: unknown[]) => createServerClient(...args),
}))

import { POST } from '@/app/api/challenges/[id]/revive/route'

function authed(memberId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: memberId ? { user_metadata: { member_id: memberId } } : null },
      }),
    },
  }
}

beforeEach(() => {
  executeMock.mockReset()
  createServerClient.mockReset()
})

describe('POST /api/challenges/[id]/revive', () => {
  it('returns 401 when not authenticated', async () => {
    createServerClient.mockResolvedValue(authed(null))
    const res = await POST(new Request('http://x/api/challenges/c1/revive', { method: 'POST' }), {
      params: Promise.resolve({ id: 'c1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 when user has no member link', async () => {
    createServerClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { user_metadata: {} } } }) },
    })
    const res = await POST(new Request('http://x/api/challenges/c1/revive', { method: 'POST' }), {
      params: Promise.resolve({ id: 'c1' }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 200 + ok:true on success', async () => {
    createServerClient.mockResolvedValue(authed('m1'))
    executeMock.mockResolvedValue({ ok: true })
    const res = await POST(new Request('http://x/api/challenges/c1/revive', { method: 'POST' }), {
      params: Promise.resolve({ id: 'c1' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(executeMock).toHaveBeenCalledWith({
      challengeId: 'c1', memberId: 'm1', today: expect.any(String),
    })
  })

  it('returns 404 for CHALLENGE_NOT_FOUND', async () => {
    createServerClient.mockResolvedValue(authed('m1'))
    executeMock.mockResolvedValue({ ok: false, reason: 'CHALLENGE_NOT_FOUND' })
    const res = await POST(new Request('http://x/api/challenges/c1/revive', { method: 'POST' }), {
      params: Promise.resolve({ id: 'c1' }),
    })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ ok: false, reason: 'CHALLENGE_NOT_FOUND' })
  })

  it('returns 400 for NOT_PARTICIPATING and NOT_ELIGIBLE', async () => {
    createServerClient.mockResolvedValue(authed('m1'))
    for (const reason of ['NOT_PARTICIPATING', 'NOT_ELIGIBLE'] as const) {
      executeMock.mockResolvedValueOnce({ ok: false, reason })
      const res = await POST(new Request('http://x/api/challenges/c1/revive', { method: 'POST' }), {
        params: Promise.resolve({ id: 'c1' }),
      })
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ ok: false, reason })
    }
  })
})
