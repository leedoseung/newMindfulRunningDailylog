import type { MissionLog } from '@/domain/entities/mission-log'
import type { AchievementCode } from './achievement-catalog'

export type DeriveAchievementsInput = {
  logs: MissionLog[]
  passesUsed: number
  revived: boolean
  durationDays: number
  challengeStartDate: string        // YYYY-MM-DD
}

const GOAL = 100
const STREAK_TIERS: Array<{ code: AchievementCode; threshold: number }> = [
  { code: 'streak_100', threshold: 100 },
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
    // 도장 관점: 로그가 있고 패스 아니면 연속. count 미달·rest·partial 모두 인정.
    const stamped = l != null && !l.usedPass
    if (stamped) {
      cur += 1
      if (cur > max) max = cur
    } else {
      cur = 0
    }
  }
  return max
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

  // 매일의 도장: 매일 log 존재, rest 0, pass 0, 부활 0.
  if (!input.revived && input.passesUsed === 0) {
    const restCount = input.logs.filter(l => l.isRestDay === true).length
    const has100Logs = input.logs.length >= input.durationDays
    if (has100Logs && restCount === 0) {
      codes.push('every_day_stamp')
    }
  }

  const streak = computeSuccessStreak(input.logs, input.challengeStartDate, input.durationDays)
  const bestTier = STREAK_TIERS.find(t => streak >= t.threshold)
  if (bestTier) codes.push(bestTier.code)

  if (nonPassNonRest.length > 0 && !anyUnder) {
    codes.push('all_100_reps')
  }

  return codes
}
