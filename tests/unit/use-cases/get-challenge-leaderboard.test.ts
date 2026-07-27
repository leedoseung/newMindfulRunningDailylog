import { describe, it, expect } from 'vitest'
import { GetChallengeLeaderboardUseCase } from '@/application/use-cases/get-challenge-leaderboard'

type PartRow = {
  id: string
  member_id: string
  passes_remaining: number
  joined_at: string
  failed_at: string | null
  completed_at: string | null
  revived_at: string | null
  members: { name: string; avatar_url: string | null } | null
}
type LogRow = {
  participation_id: string
  log_date: string
  count: number
  used_pass: boolean
  is_rest_day: boolean | null
}

function makeSupabase(parts: PartRow[], logs: LogRow[], opts?: { pageSize?: number }) {
  const pageSize = opts?.pageSize ?? 100_000
  return {
    from(table: string) {
      if (table === 'challenge_participations') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: parts, error: null }),
            }),
          }),
        }
      }
      if (table === 'mission_logs') {
        return {
          select: () => ({
            in: () => {
              const rangeFn = (from: number, to: number) =>
                Promise.resolve({ data: logs.slice(from, Math.min(to + 1, from + pageSize)), error: null })
              // Also thenable — if consumer awaits without .range(), return capped page from 0.
              const base = Promise.resolve({ data: logs.slice(0, pageSize), error: null })
              return Object.assign(base, { range: rangeFn })
            },
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  } as never
}

const part: PartRow = {
  id: 'p1', member_id: 'm1', passes_remaining: 2,
  joined_at: '2026-07-01T00:00:00Z', failed_at: null, completed_at: null,
  revived_at: null,
  members: { name: '이두승', avatar_url: null },
}

describe('GetChallengeLeaderboardUseCase — maxStreak', () => {
  it('pass-used day breaks the run (longest window excludes it)', async () => {
    // 07-01 done, 07-02 pass, 07-03 done, 07-04 done, today 07-04
    const logs: LogRow[] = [
      { participation_id: 'p1', log_date: '2026-07-01', count: 100, used_pass: false, is_rest_day: false },
      { participation_id: 'p1', log_date: '2026-07-02', count: 0,   used_pass: true,  is_rest_day: false },
      { participation_id: 'p1', log_date: '2026-07-03', count: 100, used_pass: false, is_rest_day: false },
      { participation_id: 'p1', log_date: '2026-07-04', count: 100, used_pass: false, is_rest_day: false },
    ]
    const uc = new GetChallengeLeaderboardUseCase(makeSupabase([part], logs))
    const rows = await uc.execute({
      challengeId: 'c1', today: '2026-07-04', startDate: '2026-07-01', goalMin: 100,
    })
    const row = rows[0]!
    expect(row.maxStreak).toBe(2)            // 07-03..07-04 is longest window
    expect(row.completedDays).toBe(4)        // pass still counts toward completion
  })

  it('rest day counts toward run (continuous through 휴가)', async () => {
    const logs: LogRow[] = [
      { participation_id: 'p1', log_date: '2026-07-01', count: 100, used_pass: false, is_rest_day: false },
      { participation_id: 'p1', log_date: '2026-07-02', count: 0,   used_pass: false, is_rest_day: true },
      { participation_id: 'p1', log_date: '2026-07-03', count: 100, used_pass: false, is_rest_day: false },
    ]
    const uc = new GetChallengeLeaderboardUseCase(makeSupabase([part], logs))
    const rows = await uc.execute({
      challengeId: 'c1', today: '2026-07-03', startDate: '2026-07-01', goalMin: 100,
    })
    const row = rows[0]!
    expect(row.maxStreak).toBe(3)
  })

  it('returns longest window, not current tail', async () => {
    // 5-day window then 2-day gap then 2-day tail — max should be 5
    const logs: LogRow[] = [
      { participation_id: 'p1', log_date: '2026-07-01', count: 100, used_pass: false, is_rest_day: false },
      { participation_id: 'p1', log_date: '2026-07-02', count: 100, used_pass: false, is_rest_day: false },
      { participation_id: 'p1', log_date: '2026-07-03', count: 100, used_pass: false, is_rest_day: false },
      { participation_id: 'p1', log_date: '2026-07-04', count: 100, used_pass: false, is_rest_day: false },
      { participation_id: 'p1', log_date: '2026-07-05', count: 100, used_pass: false, is_rest_day: false },
      // 07-06, 07-07 missing (gap)
      { participation_id: 'p1', log_date: '2026-07-08', count: 100, used_pass: false, is_rest_day: false },
      { participation_id: 'p1', log_date: '2026-07-09', count: 100, used_pass: false, is_rest_day: false },
    ]
    const uc = new GetChallengeLeaderboardUseCase(makeSupabase([part], logs))
    const rows = await uc.execute({
      challengeId: 'c1', today: '2026-07-09', startDate: '2026-07-01', goalMin: 100,
    })
    const row = rows[0]!
    expect(row.maxStreak).toBe(5)
  })

  it('anchors streak/completedDays from KST date of revived_at, ignores pre-revival logs', async () => {
    // revived_at = 2026-06-07T16:00:00Z  →  KST 2026-06-08T01:00:00+09:00  →  anchorDate = '2026-06-08'
    // 3 pre-revival logs (06-05, 06-06, 06-07) must be ignored.
    // 2 post-revival logs (06-08, 06-09) → maxStreak=2, completedDays=2
    const revivedPart: PartRow = {
      id: 'p2', member_id: 'm2', passes_remaining: 3,
      joined_at: '2026-06-01T00:00:00Z', failed_at: null, completed_at: null,
      revived_at: '2026-06-07T16:00:00Z',
      members: { name: 'B', avatar_url: null },
    }
    const logs: LogRow[] = [
      // Pre-revival — must be ignored
      { participation_id: 'p2', log_date: '2026-06-05', count: 30, used_pass: false, is_rest_day: false },
      { participation_id: 'p2', log_date: '2026-06-06', count: 30, used_pass: false, is_rest_day: false },
      { participation_id: 'p2', log_date: '2026-06-07', count: 30, used_pass: false, is_rest_day: false },
      // Post-revival — counted
      { participation_id: 'p2', log_date: '2026-06-08', count: 30, used_pass: false, is_rest_day: false },
      { participation_id: 'p2', log_date: '2026-06-09', count: 30, used_pass: false, is_rest_day: false },
    ]
    const uc = new GetChallengeLeaderboardUseCase(makeSupabase([revivedPart], logs))
    const rows = await uc.execute({
      challengeId: 'c1', today: '2026-06-09', startDate: '2026-06-01', goalMin: 10,
    })
    const row = rows[0]!
    expect(row.maxStreak).toBe(2)
    expect(row.completedDays).toBe(2)
    expect(row.revivedAt).toBe('2026-06-07T16:00:00Z')
  })

  it('exposes revivedAt: null on non-revived participant', async () => {
    const uc = new GetChallengeLeaderboardUseCase(makeSupabase([part], []))
    const rows = await uc.execute({
      challengeId: 'c1', today: '2026-07-01', startDate: '2026-07-01', goalMin: 100,
    })
    expect(rows[0]!.revivedAt).toBeNull()
  })

  it('paginates mission_logs beyond PostgREST default 1000-row cap', async () => {
    // Two participants, 1200 total logs, mock page cap 1000 → simulates production PostgREST behavior.
    // Without pagination, second participant loses all logs → streak/count fall to 0.
    const p1: PartRow = { ...part, id: 'p1', member_id: 'm1', joined_at: '2026-01-01T00:00:00Z' }
    const p2: PartRow = { ...part, id: 'p2', member_id: 'm2', joined_at: '2026-01-02T00:00:00Z',
      members: { name: '이두승', avatar_url: null } }
    const logs: LogRow[] = []
    const start = new Date(Date.UTC(2026, 0, 1))
    // p1 gets first 1000 slots (fills the first PostgREST page)
    for (let i = 0; i < 1000; i++) {
      const d = new Date(start); d.setUTCDate(d.getUTCDate() + i)
      logs.push({ participation_id: 'p1', log_date: d.toISOString().slice(0, 10), count: 20, used_pass: false, is_rest_day: false })
    }
    // p2 gets the next 200 — these disappear without pagination
    for (let i = 0; i < 200; i++) {
      const d = new Date(start); d.setUTCDate(d.getUTCDate() + i)
      logs.push({ participation_id: 'p2', log_date: d.toISOString().slice(0, 10), count: 20, used_pass: false, is_rest_day: false })
    }
    const uc = new GetChallengeLeaderboardUseCase(makeSupabase([p1, p2], logs, { pageSize: 1000 }))
    const rows = await uc.execute({
      challengeId: 'c1', today: '2028-09-27', startDate: '2026-01-01', goalMin: 10,
    })
    const p2Row = rows.find(r => r.memberId === 'm2')!
    expect(p2Row.completedDays).toBe(200)
    expect(p2Row.maxStreak).toBe(200)
  })
})
