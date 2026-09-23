import type { SupabaseClient } from '@supabase/supabase-js'
import type { AchievementCode } from '@/domain/badges/achievement-catalog'
import type { MissionDayCell } from '@/domain/entities/mission-day-cell'
import { computeMissionDayCell } from '@/domain/entities/mission-day-cell'
import type { MissionLog } from '@/domain/entities/mission-log'

export type MyChallengeCard = {
  challengeId: string
  challengeTitle: string
  startDate: string
  endDate: string
  memberName: string
  memberGeneration: string
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

export class GetMyChallengeCardUseCase {
  constructor(private readonly supabase: SupabaseClient) {}

  async execute(input: {
    memberId: string
    challengeId: string
  }): Promise<MyChallengeCard | null> {
    const { memberId, challengeId } = input

    const { data: challenge, error: cErr } = await this.supabase
      .from('challenges')
      .select('id, title, start_date, duration_days, goal_per_day, goal_min')
      .eq('id', challengeId)
      .single()
    if (cErr || !challenge) return null

    const { data: member } = await this.supabase
      .from('members')
      .select('name, generation, challenge_badges')
      .eq('id', memberId)
      .maybeSingle()
    if (!member) return null

    const badges: BadgePayload[] = Array.isArray(member.challenge_badges) ? member.challenge_badges : []
    const badge = badges.find(b => b.challenge_id === challengeId)
    if (!badge) return null
    const achievements = isStringArray(badge.achievements) ? badge.achievements : ['finisher']
    if (!achievements.includes('finisher')) return null

    const { data: part } = await this.supabase
      .from('challenge_participations')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('member_id', memberId)
      .maybeSingle()
    if (!part) return null

    const { data: logRows } = await this.supabase
      .from('mission_logs')
      .select('id, log_date, count, used_pass, is_rest_day, note, updated_at, participation_id')
      .eq('participation_id', part.id)
    const logs: MissionLog[] = (logRows ?? []).map(l => ({
      id: l.id,
      participationId: l.participation_id,
      logDate: l.log_date,
      count: l.count ?? 0,
      completed: (l.count ?? 0) >= (challenge.goal_min ?? 10),
      usedPass: !!l.used_pass,
      isRestDay: !!l.is_rest_day,
      note: (l.note as string | null) ?? null,
      updatedAt: l.updated_at ?? '',
    }))

    const endDate = addDays(challenge.start_date, challenge.duration_days - 1)
    const logByDate = new Map(logs.map(l => [l.logDate, l]))
    const stamps: MissionDayCell[] = []
    for (let i = 0; i < challenge.duration_days; i++) {
      const cellDate = addDays(challenge.start_date, i)
      stamps.push(
        computeMissionDayCell({
          dayIndex: i,
          cellDate,
          today: endDate,
          log: logByDate.get(cellDate) ?? null,
          goalMin: challenge.goal_min ?? 10,
          bonusGoal: challenge.goal_per_day ?? 100,
        }),
      )
    }

    const stats = badge.stats ?? {}

    return {
      challengeId,
      challengeTitle: challenge.title,
      startDate: challenge.start_date,
      endDate,
      memberName: member.name ?? '?',
      memberGeneration: member.generation ?? '',
      achievements: achievements as AchievementCode[],
      stats: {
        totalReps: stats.total_reps ?? 0,
        maxStreak: stats.max_streak ?? 0,
        runDays: stats.run_days ?? 0,
        restDays: stats.rest_days ?? 0,
        passesUsed: stats.passes_used ?? 0,
      },
      stamps,
    }
  }
}
