// tests/unit/diary/run-log-repository-month.test.ts
import { describe, it, expect, vi } from 'vitest'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'

describe('SupabaseRunLogRepository.getByMemberAndMonth', () => {
  it('queries with start/end date range and member_id, ordered by date asc', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    const lte = vi.fn().mockReturnValue({ order })
    const gte = vi.fn().mockReturnValue({ lte })
    const eq = vi.fn().mockReturnValue({ gte })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    const supabase = { from } as never

    const repo = new SupabaseRunLogRepository(supabase)
    await repo.getByMemberAndMonth('m1', 2026, 6)

    expect(from).toHaveBeenCalledWith('run_logs')
    expect(eq).toHaveBeenCalledWith('member_id', 'm1')
    expect(gte).toHaveBeenCalledWith('date', '2026-06-01')
    expect(lte).toHaveBeenCalledWith('date', '2026-06-30')
    expect(order).toHaveBeenCalledWith('date', { ascending: true })
  })
})
