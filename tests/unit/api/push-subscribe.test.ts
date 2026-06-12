import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/infrastructure/supabase/client', () => ({ createServerClient: vi.fn() }))
vi.mock('@/infrastructure/supabase/push-subscription-repository', () => ({
  SupabasePushSubscriptionRepository: vi.fn(),
}))

import { POST as subscribePost } from '@/app/api/push/subscribe/route'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabasePushSubscriptionRepository } from '@/infrastructure/supabase/push-subscription-repository'

const mockedCreate = vi.mocked(createServerClient)
const mockedRepo = vi.mocked(SupabasePushSubscriptionRepository)

beforeEach(() => { vi.clearAllMocks() })

describe('POST /api/push/subscribe', () => {
  it('returns 401 when not authenticated', async () => {
    mockedCreate.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'e', keys: { p256dh: 'p', auth: 'a' } }),
    })
    const res = await subscribePost(req)
    expect(res.status).toBe(401)
  })

  it('returns 201 on success', async () => {
    mockedCreate.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1', user_metadata: { member_id: 'm1' } } },
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    mockedRepo.mockImplementation(function () {
      return {
        save: vi.fn().mockResolvedValue({
          id: 's1', memberId: 'm1', endpoint: 'e', p256dh: 'p', auth: 'a',
          userAgent: null, createdAt: '2026-06-12T00:00:00Z',
        }),
        deleteByEndpoint: vi.fn(),
        listByMember: vi.fn(),
      } as unknown as InstanceType<typeof SupabasePushSubscriptionRepository>
    })
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'https://push.example/abc', keys: { p256dh: 'pk', auth: 'authk' } }),
    })
    const res = await subscribePost(req)
    expect(res.status).toBe(201)
  })

  it('returns 400 when missing fields', async () => {
    mockedCreate.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1', user_metadata: { member_id: 'm1' } } },
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createServerClient>>)
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'e' }),
    })
    const res = await subscribePost(req)
    expect(res.status).toBe(400)
  })
})
