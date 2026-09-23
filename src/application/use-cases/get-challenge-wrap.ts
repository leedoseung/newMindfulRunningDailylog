import type { SupabaseClient } from '@supabase/supabase-js'
import type { AchievementCode } from '@/domain/badges/achievement-catalog'

export type WrapFinisher = {
  memberId: string
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

export class GetChallengeWrapUseCase {
  constructor(private readonly supabase: SupabaseClient) {}

  async execute(challengeId: string): Promise<WrapData> {
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

    const finishers: WrapFinisher[] = []
    const journeyers: WrapJourneyer[] = []

    for (const p of parts ?? []) {
      const mem = memberById.get(p.member_id)
      if (!mem) continue
      if (p.completed_at) {
        const badge = mem.badges.find(b => b.challenge_id === challengeId)
        const codes = isStringArray(badge?.achievements) ? badge.achievements : ['finisher']
        const stats = badge?.stats ?? {}
        finishers.push({
          memberId: mem.id,
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
        })
      } else {
        journeyers.push({
          memberId: mem.id,
          name: mem.name,
          avatarUrl: mem.avatarUrl,
        })
      }
    }

    // Messages: mission_logs with non-empty note, joined via participation → member.
    const partIds = (parts ?? []).map(p => p.id)
    const { data: notedLogs, error: lErr } = await this.supabase
      .from('mission_logs')
      .select('id, participation_id, log_date, count, is_rest_day, note')
      .in('participation_id', partIds)
      .not('note', 'is', null)
      .order('log_date', { ascending: false })
      .limit(200)
    if (lErr) throw new Error(`wrap notes failed: ${lErr.message}`)

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

    // Season stats: aggregate across every participation.
    const { data: allLogs, error: aErr } = await this.supabase
      .from('mission_logs')
      .select('participation_id, count, used_pass, is_rest_day')
      .in('participation_id', partIds)
    if (aErr) throw new Error(`wrap aggregate failed: ${aErr.message}`)

    let totalReps = 0
    let totalStamps = 0
    let totalRestDays = 0
    let totalPassesUsed = 0
    for (const l of allLogs ?? []) {
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
