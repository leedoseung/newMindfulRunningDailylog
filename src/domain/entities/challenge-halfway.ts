import type { Challenge } from './challenge'
import type { ChallengeParticipation } from './challenge-participation'

// startDate is YYYY-MM-DD (KST). durationDays >= 1.
// Halfway day index = floor((durationDays - 1) / 2). Inclusive — today equal to this is still eligible.
export function halfwayDate(c: Challenge): string {
  const offset = Math.floor((c.durationDays - 1) / 2)
  return addDaysKst(c.startDate, offset)
}

export function canRevive(
  p: ChallengeParticipation,
  c: Challenge,
  today: string,
): boolean {
  return (
    p.failedAt !== null &&
    p.completedAt === null &&
    p.revivedAt === null &&
    today <= halfwayDate(c)
  )
}

// Local copy of the addDays pattern used elsewhere (see get-challenge-leaderboard.ts:addDays).
// Kept private to this module so the domain layer has no cross-layer import.
function addDaysKst(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}
