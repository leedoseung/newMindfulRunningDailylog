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

describe('GetChallengeLeaderboardUseCase — streak', () => {
  it('breaks streak on pass-used day (do not count face-save as did-it)', async () => {
    // 07-01 done, 07-02 used pass, 07-03 done, today 07-03
    const logs: LogRow[] = [
      { participation_id: 'p1', log_date: '2026-07-01', count: 100, used_pass: false, is_rest_day: false },
      { participation_id: 'p1', log_date: '2026-07-02', count: 0,   used_pass: true,  is_rest_day: false },
      { participation_id: 'p1', log_date: '2026-07-03', count: 100, used_pass: false, is_rest_day: false },
    ]
    const uc = new GetChallengeLeaderboardUseCase(makeSupabase([part], logs))
    const rows = await uc.execute({
      challengeId: 'c1', today: '2026-07-03', startDate: '2026-07-01', goalMin: 100,
    })
    const row = rows[0]!
    expect(row.streak).toBe(1)              // only today; 07-02 pass breaks chain
    expect(row.completedDays).toBe(3)       // pass still counts toward completion
  })

  it('keeps streak across rest days', async () => {
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
    expect(row.streak).toBe(3)
  })

  it('today missing is graced (does not reset streak from yesterday)', async () => {
    const logs: LogRow[] = [
      { participation_id: 'p1', log_date: '2026-07-01', count: 100, used_pass: false, is_rest_day: false },
      { participation_id: 'p1', log_date: '2026-07-02', count: 100, used_pass: false, is_rest_day: false },
    ]
    const uc = new GetChallengeLeaderboardUseCase(makeSupabase([part], logs))
    const rows = await uc.execute({
      challengeId: 'c1', today: '2026-07-03', startDate: '2026-07-01', goalMin: 100,
    })
    const row = rows[0]!
    expect(row.streak).toBe(2)
  })
})
