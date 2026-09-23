import type { MissionLog } from '@/domain/entities/mission-log'
import type { AchievementCode } from './achievement-catalog'

export type DeriveAchievementsInput = {
  logs: MissionLog[]
  passesUsed: number
  revived: boolean
  durationDays: number
  challengeStartDate: string        // YYYY-MM-DD
  memberGenerations: string         // e.g. '3기, 4기, 5기'
}

const GOAL = 100
const STREAK_TIERS: Array<{ code: AchievementCode; threshold: number }> = [
  { code: 'streak_90', threshold: 90 },
  { code: 'streak_60', threshold: 60 },
  { code: 'streak_30', threshold: 30 },
]

function addDays(startDate: string, offset: number): string {
  const [y, m, d] = startDate.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + offset)
  return dt.toISOString().slice(0, 10)
}

function computeSuccessStreak(
  logs: MissionLog[],
  startDate: string,
  durationDays: number,
): number {
  const map = new Map(logs.map(l => [l.logDate, l]))
  let max = 0
  let cur = 0
  for (let i = 0; i < durationDays; i++) {
    const date = addDays(startDate, i)
    const l = map.get(date)
    const success = l != null && !l.usedPass && (l.isRestDay === true || l.count >= GOAL)
    if (success) {
      cur += 1
      if (cur > max) max = cur
    } else {
      cur = 0
    }
  }
  return max
}

function countGenerations(gens: string): number {
  const matches = gens.match(/\d+기/g)
  return matches ? matches.length : 0
}

export function deriveAchievements(input: DeriveAchievementsInput): AchievementCode[] {
  const codes: AchievementCode[] = ['finisher']

  const nonPassNonRest = input.logs.filter(l => !l.usedPass && l.isRestDay !== true)
  const anyUnder = nonPassNonRest.some(l => l.count < GOAL)

  if (input.revived) {
    codes.push('revived')
  } else {
    // Only non-revived can claim perfect.
    const has100Logs = input.logs.length >= input.durationDays
    if (has100Logs && input.passesUsed === 0 && !anyUnder) {
      codes.push('perfect_100')
    }
  }

  if (input.passesUsed === 0) {
    codes.push('no_pass')
  }

  const streak = computeSuccessStreak(input.logs, input.challengeStartDate, input.durationDays)
  const bestTier = STREAK_TIERS.find(t => streak >= t.threshold)
  if (bestTier) codes.push(bestTier.code)

  if (nonPassNonRest.length > 0 && !anyUnder) {
    codes.push('all_100_reps')
  }

  if (countGenerations(input.memberGenerations) >= 2) {
    codes.push('multi_gen')
  }

  return codes
}
