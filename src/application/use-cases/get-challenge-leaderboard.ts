import type { SupabaseClient } from '@supabase/supabase-js'

export type ChallengeLeaderRow = {
  memberId: string
  name: string
  avatarUrl: string | null
  joinedAt: string
  todayCount: number
  todayDone: boolean        // today stamped (count >= goalMin OR rest OR pass)
  todayRest: boolean
  completedDays: number     // total days kept across season
  streak: number            // tail streak ending today/yesterday
  passesRemaining: number
  isFailed: boolean
  isCompleted: boolean
}

type PartRow = {
  id: string
  member_id: string
  passes_remaining: number
  joined_at: string
  failed_at: string | null
  completed_at: string | null
  members: { name: string | null; avatar_url: string | null } | null
}

type LogRow = {
  participation_id: string
  log_date: string
  count: number
  used_pass: boolean
  is_rest_day: boolean | null
}

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

function isKept(l: LogRow | undefined, goalMin: number): boolean {
  if (!l) return false
  return !!l.is_rest_day || l.used_pass || l.count >= goalMin
}

export class GetChallengeLeaderboardUseCase {
  constructor(private supabase: SupabaseClient) {}

  async execute(input: {
    challengeId: string
    today: string
    startDate: string
    goalMin: number
  }): Promise<ChallengeLeaderRow[]> {
    const { data: parts, error: pErr } = await this.supabase
      .from('challenge_participations')
      .select('id, member_id, passes_remaining, joined_at, failed_at, completed_at, members ( name, avatar_url )')
      .eq('challenge_id', input.challengeId)
      .order('joined_at', { ascending: true })

    if (pErr) throw new Error(`leaderboard parts: ${pErr.message}`)
    const partRows = (parts as unknown as PartRow[]) ?? []
    if (partRows.length === 0) return []

    const partIds = partRows.map(p => p.id)
    const { data: logs, error: lErr } = await this.supabase
      .from('mission_logs')
      .select('participation_id, log_date, count, used_pass, is_rest_day')
      .in('participation_id', partIds)

    if (lErr) throw new Error(`leaderboard logs: ${lErr.message}`)
    const logRows = (logs as unknown as LogRow[]) ?? []

    const byPart = new Map<string, LogRow[]>()
    for (const l of logRows) {
      const arr = byPart.get(l.participation_id) ?? []
      arr.push(l)
      byPart.set(l.participation_id, arr)
    }

    const rows = partRows.map((p) => {
      const myLogs = byPart.get(p.id) ?? []
      const byDate = new Map<string, LogRow>(myLogs.map(l => [l.log_date, l]))
      const todayLog = byDate.get(input.today)
      const todayDone = isKept(todayLog, input.goalMin)
      const todayCount = todayLog?.count ?? 0
      const todayRest = todayLog?.is_rest_day ?? false

      let completedDays = 0
      for (const l of myLogs) {
        if (isKept(l, input.goalMin)) completedDays++
      }

      let streak = 0
      let cursor = input.today
      while (cursor >= input.startDate) {
        const l = byDate.get(cursor)
        if (isKept(l, input.goalMin)) {
          streak++
          cursor = addDays(cursor, -1)
        } else if (cursor === input.today) {
          cursor = addDays(cursor, -1)
          continue
        } else {
          break
        }
      }

      return {
        memberId: p.member_id,
        name: p.members?.name ?? '익명',
        avatarUrl: p.members?.avatar_url ?? null,
        joinedAt: p.joined_at,
        todayCount,
        todayDone,
        todayRest,
        completedDays,
        streak,
        passesRemaining: p.passes_remaining,
        isFailed: !!p.failed_at,
        isCompleted: !!p.completed_at,
      }
    })

    // Sort: completed > active by completedDays desc > streak desc > todayCount desc,
    // failed sink to the bottom. Joined order as final tie-breaker.
    rows.sort((a, b) => {
      if (a.isFailed !== b.isFailed) return a.isFailed ? 1 : -1
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? -1 : 1
      if (b.completedDays !== a.completedDays) return b.completedDays - a.completedDays
      if (b.streak !== a.streak) return b.streak - a.streak
      if (b.todayCount !== a.todayCount) return b.todayCount - a.todayCount
      return a.joinedAt.localeCompare(b.joinedAt)
    })
    return rows
  }
}
