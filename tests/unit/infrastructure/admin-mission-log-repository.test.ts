// tests/unit/infrastructure/admin-mission-log-repository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminMissionLogRepository } from '@/infrastructure/supabase/admin-mission-log-repository'

const sampleRow = {
  id: 'log1',
  participation_id: 'p1',
  log_date: '2026-06-28',
  count: 110,
  completed: true,
  used_pass: false,
  is_rest_day: false,
  note: null,
  updated_at: '2026-06-29T00:00:00Z',
}

function makeClient() {
  const rpc = vi.fn().mockResolvedValue({ data: sampleRow, error: null })
  const single = vi.fn().mockResolvedValue({ data: { ...sampleRow, used_pass: true }, error: null })
  const select = vi.fn().mockReturnValue({ single })
  const eq = vi.fn().mockReturnThis()
  const update = vi.fn().mockReturnValue({ eq, select })
  const from = vi.fn().mockReturnValue({ update })
  return { rpc, from, update, eq, select, single, client: { rpc, from } as any }
}

beforeEach(() => vi.clearAllMocks())

describe('AdminMissionLogRepository', () => {
  it('setCount calls set_mission_log_count RPC and returns mapped entity', async () => {
    const m = makeClient()
    const repo = new AdminMissionLogRepository(m.client)
    const out = await repo.setCount({ participationId: 'p1', logDate: '2026-06-28', count: 110, note: 'fix' })
    expect(m.rpc).toHaveBeenCalledWith('set_mission_log_count', {
      p_participation_id: 'p1', p_log_date: '2026-06-28', p_count: 110, p_note: 'fix',
    })
    expect(out.id).toBe('log1')
    expect(out.usedPass).toBe(false)
  })

  it('setRestDay calls mark_mission_rest_day RPC', async () => {
    const m = makeClient()
    const repo = new AdminMissionLogRepository(m.client)
    await repo.setRestDay({ participationId: 'p1', logDate: '2026-06-28' })
    expect(m.rpc).toHaveBeenCalledWith('mark_mission_rest_day', {
      p_participation_id: 'p1', p_log_date: '2026-06-28',
    })
  })

  it('setUsedPass updates mission_logs row directly', async () => {
    const m = makeClient()
    const repo = new AdminMissionLogRepository(m.client)
    const out = await repo.setUsedPass({ participationId: 'p1', logDate: '2026-06-28', usedPass: true })
    expect(m.from).toHaveBeenCalledWith('mission_logs')
    expect(m.update).toHaveBeenCalledWith({ used_pass: true })
    expect(out.usedPass).toBe(true)
  })

  it('adjustPassesRemaining +1 increments and returns new value', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 3, error: null })
    const client = { rpc } as any
    const repo = new AdminMissionLogRepository(client)
    const out = await repo.adjustPassesRemaining({ participationId: 'p1', delta: 1 })
    expect(rpc).toHaveBeenCalledWith('admin_adjust_participation_passes', {
      p_participation_id: 'p1', p_delta: 1,
    })
    expect(out.passesRemaining).toBe(3)
  })
})
