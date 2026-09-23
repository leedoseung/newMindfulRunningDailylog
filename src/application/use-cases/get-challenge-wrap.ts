import type { SupabaseClient } from '@supabase/supabase-js'
import type { AchievementCode } from '@/domain/badges/achievement-catalog'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import { computeMissionDayCell } from '@/domain/entities/mission-day-cell'
import type { MissionLog } from '@/domain/entities/mission-log'

export type WrapFinisher = {
  memberId: string
  participationId: string
  name: string
  avatarUrl: string | null
  generation: string
  achievements: AchievementCode[]
  stats: {
    totalReps: number
    maxStreak: number
    runDays: number
    restDays: number
    passesUsed: number
  }
  stamps: MissionDayCell[]
}

export type WrapJourneyer = {
  memberId: string
  name: string
  avatarUrl: string | null
}

export type WrapMessage = {
  logId: string
  memberId: string
  memberName: string
  memberAvatarUrl: string | null
  logDate: string
  count: number
  isRestDay: boolean
  note: string
}

export type WrapSeasonStats = {
  totalParticipants: number
  totalFinishers: number
  totalReps: number
  totalStamps: number       // number of mission_log rows across the season
  totalRestDays: number
  totalPassesUsed: number
  longestStreak: number
  longestStreakName: string
}

export type WrapData = {
  finishers: WrapFinisher[]
  journeyers: WrapJourneyer[]
  messages: WrapMessage[]
  seasonStats: WrapSeasonStats
}

type BadgePayload = {
  challenge_id?: string
  achievements?: unknown
  stats?: {
    total_reps?: number
    max_streak?: number
    run_days?: number
    rest_days?: number
    passes_used?: number
  }
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every(v => typeof v === 'string')
}

function addDays(startDate: string, offset: number): string {
  const [y, m, d] = startDate.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + offset)
  return dt.toISOString().slice(0, 10)
}

type BuildStampsArgs = {
  startDate: string
  durationDays: number
  today: string
  logs: MissionLog[]
  goalMin: number
  bonusGoal: number
}

function buildStamps({ startDate, durationDays, today, logs, goalMin, bonusGoal }: BuildStampsArgs): MissionDayCell[] {
  const logByDate = new Map(logs.map(l => [l.logDate, l]))
  const cells: MissionDayCell[] = []
  for (let i = 0; i < durationDays; i++) {
    const cellDate = addDays(startDate, i)
    cells.push(
      computeMissionDayCell({
        dayIndex: i,
        cellDate,
        today,
        log: logByDate.get(cellDate) ?? null,
        goalMin,
        bonusGoal,
      }),
    )
  }
  return cells
}

export class GetChallengeWrapUseCase {
  constructor(private readonly supabase: SupabaseClient) {}

  async execute(challengeId: string): Promise<WrapData> {
    const { data: challenge, error: cErr } = await this.supabase
      .from('challenges')
      .select('id, start_date, duration_days, goal_per_day, goal_min')
      .eq('id', challengeId)
      .single()
    if (cErr) throw new Error(`wrap challenge failed: ${cErr.message}`)

    const { data: parts, error: pErr } = await this.supabase
      .from('challenge_participations')
      .select('id, member_id, completed_at, failed_at, revived_at, passes_remaining')
      .eq('challenge_id', challengeId)
    if (pErr) throw new Error(`wrap participations failed: ${pErr.message}`)

    const memberIds = (parts ?? []).map(p => p.member_id)
    const { data: members, error: mErr } = await this.supabase
      .from('members')
      .select('id, name, generation, avatar_url, challenge_badges')
      .in('id', memberIds)
    if (mErr) throw new Error(`wrap members failed: ${mErr.message}`)

    const memberById = new Map<string, {
      id: string; name: string; generation: string;
      avatarUrl: string | null; badges: BadgePayload[];
    }>()
    for (const m of members ?? []) {
      memberById.set(m.id, {
        id: m.id,
        name: m.name ?? '?',
        generation: m.generation ?? '',
        avatarUrl: (m.avatar_url as string | null) ?? null,
        badges: Array.isArray(m.challenge_badges) ? m.challenge_badges : [],
      })
    }

    // Load every mission log for the season once — used to build finisher
    // stamps AND the season-wide aggregate below. PostgREST caps a single
    // response at db-max-rows (default 1000); over 44 participants × 100 days
    // that truncates late participants to empty logs. Page explicitly.
    const partIds = (parts ?? []).map(p => p.id)
    const PAGE_SIZE = 1000
    type LogRow = {
      id: string
      participation_id: string
      log_date: string
      count: number | null
      used_pass: boolean | null
      is_rest_day: boolean | null
      note: string | null
      updated_at: string | null
    }
    const allLogs: LogRow[] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await this.supabase
        .from('mission_logs')
        .select('id, participation_id, log_date, count, used_pass, is_rest_day, note, updated_at')
        .in('participation_id', partIds)
        .range(offset, offset + PAGE_SIZE - 1)
      if (error) throw new Error(`wrap aggregate failed: ${error.message}`)
      const batch = (data as unknown as LogRow[]) ?? []
      allLogs.push(...batch)
      if (batch.length < PAGE_SIZE) break
    }

    const logsByPart = new Map<string, MissionLog[]>()
    for (const l of allLogs) {
      const domainLog: MissionLog = {
        id: l.id,
        participationId: l.participation_id,
        logDate: l.log_date,
        count: l.count ?? 0,
        completed: (l.count ?? 0) >= (challenge.goal_min ?? 10),
        usedPass: !!l.used_pass,
        isRestDay: !!l.is_rest_day,
        note: (l.note as string | null) ?? null,
        updatedAt: l.updated_at ?? '',
      }
      const arr = logsByPart.get(l.participation_id) ?? []
      arr.push(domainLog)
      logsByPart.set(l.participation_id, arr)
    }

    const seasonEnd = addDays(challenge.start_date, challenge.duration_days - 1)

    const finishers: WrapFinisher[] = []
    const journeyers: WrapJourneyer[] = []

    for (const p of parts ?? []) {
      const mem = memberById.get(p.member_id)
      if (!mem) continue
      if (p.completed_at) {
        const badge = mem.badges.find(b => b.challenge_id === challengeId)
        const codes = isStringArray(badge?.achievements) ? badge.achievements : ['finisher']
        const stats = badge?.stats ?? {}
        const partLogs = logsByPart.get(p.id) ?? []
        const stamps = buildStamps({
          startDate: challenge.start_date,
          durationDays: challenge.duration_days,
          today: seasonEnd,
          logs: partLogs,
          goalMin: challenge.goal_min ?? 10,
          bonusGoal: challenge.goal_per_day ?? 100,
        })
        finishers.push({
          memberId: mem.id,
          participationId: p.id,
          name: mem.name,
          avatarUrl: mem.avatarUrl,
          generation: mem.generation,
          achievements: codes as AchievementCode[],
          stats: {
            totalReps: stats.total_reps ?? 0,
            maxStreak: stats.max_streak ?? 0,
            runDays: stats.run_days ?? 0,
            restDays: stats.rest_days ?? 0,
            passesUsed: stats.passes_used ?? 0,
          },
          stamps,
        })
      } else {
        journeyers.push({
          memberId: mem.id,
          name: mem.name,
          avatarUrl: mem.avatarUrl,
        })
      }
    }

    // Messages: mission_logs with non-empty note.
    const notedLogs = allLogs
      .filter(l => l.note?.trim())
      .sort((a, b) => (a.log_date < b.log_date ? 1 : -1))
      .slice(0, 200)

    const partToMember = new Map<string, string>()
    for (const p of parts ?? []) partToMember.set(p.id, p.member_id)

    const messages: WrapMessage[] = []
    for (const log of notedLogs ?? []) {
      const note = (log.note as string | null)?.trim() ?? ''
      if (!note) continue
      if (note.startsWith('관리자 백필')) continue
      const memberId = partToMember.get(log.participation_id) ?? ''
      const mem = memberById.get(memberId)
      if (!mem) continue
      messages.push({
        logId: log.id,
        memberId,
        memberName: mem.name,
        memberAvatarUrl: mem.avatarUrl,
        logDate: log.log_date,
        count: log.count ?? 0,
        isRestDay: !!log.is_rest_day,
        note,
      })
    }

    let totalReps = 0
    let totalStamps = 0
    let totalRestDays = 0
    let totalPassesUsed = 0
    for (const l of allLogs) {
      totalStamps += 1
      totalReps += l.count ?? 0
      if (l.is_rest_day) totalRestDays += 1
      if (l.used_pass) totalPassesUsed += 1
    }

    const longest = finishers.reduce<{ streak: number; name: string }>((best, f) => {
      return f.stats.maxStreak > best.streak
        ? { streak: f.stats.maxStreak, name: f.name }
        : best
    }, { streak: 0, name: '' })

    const seasonStats: WrapSeasonStats = {
      totalParticipants: parts?.length ?? 0,
      totalFinishers: finishers.length,
      totalReps,
      totalStamps,
      totalRestDays,
      totalPassesUsed,
      longestStreak: longest.streak,
      longestStreakName: longest.name,
    }

    // Sort finishers by max_streak desc for the roster.
    finishers.sort((a, b) => b.stats.maxStreak - a.stats.maxStreak)

    return { finishers, journeyers, messages, seasonStats }
  }
}
