import { describe, it, expect, vi } from 'vitest'
import { GetChallengeLeaderboardUseCase } from '@/application/use-cases/get-challenge-leaderboard'

type PartRow = {
  id: string
  member_id: string
  passes_remaining: number
  joined_at: string
  failed_at: string | null
  completed_at: string | null
  members: { name: string; avatar_url: string | null } | null
}
type LogRow = {
  participation_id: string
  log_date: string
  count: number
  used_pass: boolean
  is_rest_day: boolean | null
}

function makeSupabase(parts: PartRow[], logs: LogRow[]) {
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
            in: () => Promise.resolve({ data: logs, error: null }),
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
})
