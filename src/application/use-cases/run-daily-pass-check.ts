import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'

export type DailyPassCheckInput = {
  today: string  // KST 'YYYY-MM-DD'
}

export type DailyPassCheckResult = {
  processed: number
  decremented: number
  failed: number
  skipped: number
}

function addDays(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export class RunDailyPassCheckUseCase {
  constructor(
    private challengeRepo: IChallengeRepository,
    private participationRepo: IChallengeParticipationRepository,
    private missionLogRepo: IMissionLogRepository
  ) {}

  async execute(input: DailyPassCheckInput): Promise<DailyPassCheckResult> {
    const result: DailyPassCheckResult = { processed: 0, decremented: 0, failed: 0, skipped: 0 }

    const challenge = await this.challengeRepo.getActive()
    if (!challenge) return result

    const yesterday = addDays(input.today, -1)
    if (yesterday < challenge.startDate) return result

    const parts = await this.participationRepo.listForChallenge(challenge.id)

    for (const p of parts) {
      if (p.failedAt || p.completedAt) {
        result.skipped++
        continue
      }
      result.processed++
      const log = await this.missionLogRepo.getOne(p.id, yesterday)
      if (log?.isRestDay) {
        result.skipped++
        result.processed--
        continue
      }
      const missed = !log || (log.count === 0 && !log.usedPass)
      if (!missed) continue

      if (p.passesRemaining > 0) {
        await this.participationRepo.decrementPass(p.id)
        await this.missionLogRepo.markPass(p.id, yesterday)
        result.decremented++
      } else {
        await this.participationRepo.markFailed(p.id)
        result.failed++
      }
    }

    return result
  }
}
