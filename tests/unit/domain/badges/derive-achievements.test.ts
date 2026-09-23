import { describe, it, expect } from 'vitest'
import { deriveAchievements } from '@/domain/badges/derive-achievements'
import type { MissionLog } from '@/domain/entities/mission-log'

function log(logDate: string, count: number, opts: Partial<MissionLog> = {}): MissionLog {
  return {
    id: `l-${logDate}`,
    participationId: 'p1',
    logDate,
    count,
    completed: count >= 100,
    usedPass: false,
    isRestDay: false,
    updatedAt: '2026-06-15T00:00:00Z',
    ...opts,
  }
}

function daysFrom(start: string, n: number): string[] {
  const out: string[] = []
  const [y, m, d] = start.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d))
  for (let i = 0; i < n; i++) {
    out.push(dt.toISOString().slice(0, 10))
    dt.setUTCDate(dt.getUTCDate() + 1)
  }
  return out
}

const CHALLENGE_START = '2026-06-15'
const DURATION = 100

describe('deriveAchievements', () => {
  it('grants FINISHER for every completer', () => {
    const codes = deriveAchievements({
      logs: [],
      passesUsed: 0,
      revived: true,
      durationDays: DURATION,
      challengeStartDate: CHALLENGE_START,
    })
    expect(codes).toContain('finisher')
  })

  it('grants PERFECT_100 only for 100/100 logs + no pass + not revived + all count>=100', () => {
    const logs = daysFrom(CHALLENGE_START, 100).map(d => log(d, 100))
    const codes = deriveAchievements({
      logs,
      passesUsed: 0,
      revived: false,
      durationDays: DURATION,
      challengeStartDate: CHALLENGE_START,
    })
    expect(codes).toContain('perfect_100')
  })

  it('does not grant PERFECT_100 when a log is under goal', () => {
    const days = daysFrom(CHALLENGE_START, 100)
    const logs = days.map((d, i) => log(d, i === 5 ? 60 : 100))
    const codes = deriveAchievements({
      logs,
      passesUsed: 0,
      revived: false,
      durationDays: DURATION,
      challengeStartDate: CHALLENGE_START,
    })
    expect(codes).not.toContain('perfect_100')
  })

  it('grants NO_PASS when passesUsed === 0', () => {
    const codes = deriveAchievements({
      logs: [],
      passesUsed: 0,
      revived: false,
      durationDays: DURATION,
      challengeStartDate: CHALLENGE_START,
    })
    expect(codes).toContain('no_pass')
  })

  it('grants REVIVED when flagged', () => {
    const codes = deriveAchievements({
      logs: [],
      passesUsed: 0,
      revived: true,
      durationDays: DURATION,
      challengeStartDate: CHALLENGE_START,
    })
    expect(codes).toContain('revived')
    expect(codes).not.toContain('perfect_100')
  })

  it('grants only the highest STREAK tier reached (90 wins over 60/30)', () => {
    // 95 stamped days then 5 pass days
    const days = daysFrom(CHALLENGE_START, 100)
    const logs = days.map((d, i) => (i < 95 ? log(d, 100) : log(d, 0, { usedPass: true })))
    const codes = deriveAchievements({
      logs,
      passesUsed: 5,
      revived: false,
      durationDays: DURATION,
      challengeStartDate: CHALLENGE_START,
    })
    expect(codes).toContain('streak_90')
    expect(codes).not.toContain('streak_60')
    expect(codes).not.toContain('streak_30')
  })

  it('grants STREAK_60 when max is between 60 and 89', () => {
    // 70 stamped days followed by 30 pass days (pass breaks streak)
    const days = daysFrom(CHALLENGE_START, 100)
    const logs = days.map((d, i) => (i < 70 ? log(d, 100) : log(d, 0, { usedPass: true })))
    const codes = deriveAchievements({
      logs,
      passesUsed: 30,
      revived: false,
      durationDays: DURATION,
      challengeStartDate: CHALLENGE_START,
    })
    expect(codes).toContain('streak_60')
    expect(codes).not.toContain('streak_90')
  })

  it('counts is_rest_day as continuing the streak', () => {
    // 50 runs, 1 rest, 50 runs = streak 101 (but capped to 100 duration)
    const days = daysFrom(CHALLENGE_START, 100)
    const logs = days.map((d, i) => {
      if (i === 50) return log(d, 0, { isRestDay: true })
      return log(d, 100)
    })
    const codes = deriveAchievements({
      logs,
      passesUsed: 0,
      revived: false,
      durationDays: DURATION,
      challengeStartDate: CHALLENGE_START,
    })
    expect(codes).toContain('streak_90')
  })

  it('counts used_pass as breaking the streak', () => {
    const days = daysFrom(CHALLENGE_START, 100)
    const logs = days.map((d, i) => {
      if (i === 50) return log(d, 0, { usedPass: true })
      return log(d, 100)
    })
    const codes = deriveAchievements({
      logs,
      passesUsed: 1,
      revived: false,
      durationDays: DURATION,
      challengeStartDate: CHALLENGE_START,
    })
    // best streak is 50 days → below 60
    expect(codes).toContain('streak_30')
    expect(codes).not.toContain('streak_60')
    expect(codes).not.toContain('no_pass')
  })

  it('grants EVERY_DAY_STAMP when logs cover every day with no rest, pass, or revive', () => {
    const days = daysFrom(CHALLENGE_START, 100)
    const logs = days.map(d => log(d, 100))
    const codes = deriveAchievements({
      logs,
      passesUsed: 0,
      revived: false,
      durationDays: DURATION,
      challengeStartDate: CHALLENGE_START,
    })
    expect(codes).toContain('every_day_stamp')
  })

  it('does not grant EVERY_DAY_STAMP when there is a rest day', () => {
    const days = daysFrom(CHALLENGE_START, 100)
    const logs = days.map((d, i) => (i === 10 ? log(d, 0, { isRestDay: true }) : log(d, 100)))
    const codes = deriveAchievements({
      logs,
      passesUsed: 0,
      revived: false,
      durationDays: DURATION,
      challengeStartDate: CHALLENGE_START,
    })
    expect(codes).not.toContain('every_day_stamp')
  })

  it('does not grant EVERY_DAY_STAMP when a day is missing', () => {
    const days = daysFrom(CHALLENGE_START, 99)
    const logs = days.map(d => log(d, 100))
    const codes = deriveAchievements({
      logs,
      passesUsed: 0,
      revived: false,
      durationDays: DURATION,
      challengeStartDate: CHALLENGE_START,
    })
    expect(codes).not.toContain('every_day_stamp')
  })

  it('grants ALL_100_REPS when every non-rest non-pass log is >= 100', () => {
    const days = daysFrom(CHALLENGE_START, 5)
    const logs = [
      log(days[0]!, 100),
      log(days[1]!, 120),
      log(days[2]!, 0, { isRestDay: true }),
      log(days[3]!, 100),
      log(days[4]!, 0, { usedPass: true }),
    ]
    const codes = deriveAchievements({
      logs,
      passesUsed: 1,
      revived: false,
      durationDays: DURATION,
      challengeStartDate: CHALLENGE_START,
    })
    expect(codes).toContain('all_100_reps')
  })

  it('does not grant ALL_100_REPS when some log is under 100', () => {
    const days = daysFrom(CHALLENGE_START, 3)
    const logs = [log(days[0]!, 100), log(days[1]!, 50), log(days[2]!, 100)]
    const codes = deriveAchievements({
      logs,
      passesUsed: 0,
      revived: false,
      durationDays: DURATION,
      challengeStartDate: CHALLENGE_START,
    })
    expect(codes).not.toContain('all_100_reps')
  })

})
