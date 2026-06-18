import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SupabaseMemberRepository } from '@/infrastructure/supabase/member-repository'
import type { SupabaseClient } from '@supabase/supabase-js'

function makeMockRow() {
  return {
    id: 'm1',
    name: 'duvis',
    group_name: 'A',
    generation: '1기',
    insta_id: '@duvis',
    avatar_url: 'https://example.com/avatar.png',
  }
}

function makeSupabaseMock(single: { data: unknown; error: unknown }) {
  const singleFn = vi.fn().mockResolvedValue(single)
  const eqFn = vi.fn().mockReturnValue({ single: singleFn })
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn })
  const from = vi.fn().mockReturnValue({ select: selectFn })
  return { from, select: selectFn, eq: eqFn, single: singleFn }
}

describe('SupabaseMemberRepository.getById', () => {
  let repo: SupabaseMemberRepository

  it('returns Member when row found', async () => {
    const { from, select, eq, single } = makeSupabaseMock({
      data: makeMockRow(),
      error: null,
    })

    repo = new SupabaseMemberRepository({ from } as unknown as SupabaseClient)
    const m = await repo.getById('m1')

    expect(from).toHaveBeenCalledWith('members')
    expect(select).toHaveBeenCalledWith('id, name, group_name, generation, insta_id, avatar_url')
    expect(eq).toHaveBeenCalledWith('id', 'm1')
    expect(single).toHaveBeenCalled()

    expect(m).not.toBeNull()
    expect(m?.id).toBe('m1')
    expect(m?.name).toBe('duvis')
    expect(m?.groupName).toBe('A')
    expect(m?.generation).toBe('1기')
    expect(m?.instaId).toBe('@duvis')
    expect(m?.avatarUrl).toBe('https://example.com/avatar.png')
  })

  it('returns null when row missing (PGRST116)', async () => {
    const { from } = makeSupabaseMock({
      data: null,
      error: { code: 'PGRST116', message: 'no rows' },
    })

    repo = new SupabaseMemberRepository({ from } as unknown as SupabaseClient)
    const m = await repo.getById('nonexistent')

    expect(m).toBeNull()
  })

  it('throws on other Supabase errors', async () => {
    const { from } = makeSupabaseMock({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    })

    repo = new SupabaseMemberRepository({ from } as unknown as SupabaseClient)
    await expect(repo.getById('m1')).rejects.toThrow('getById failed: permission denied')
  })
})
