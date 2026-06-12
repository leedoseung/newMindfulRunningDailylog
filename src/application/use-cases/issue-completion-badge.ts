import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'

export type IssueCompletionInput = {
  today: string  // KST 'YYYY-MM-DD'
}

export type IssueCompletionResult = {
  completed: number
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

export class IssueCompletionBadgeUseCase {
  constructor(
    private challengeRepo: IChallengeRepository,
    private participationRepo: IChallengeParticipationRepository,
    private missionLogRepo: IMissionLogRepository
  ) {}

  async execute(input: IssueCompletionInput): Promise<IssueCompletionResult> {
    const result: IssueCompletionResult = { completed: 0, skipped: 0 }

    const challenge = await this.challengeRepo.getActive()
    if (!challenge) return result

    const lastDay = addDays(challenge.startDate, challenge.durationDays - 1)
    if (input.today <= lastDay) return result

    const parts = await this.participationRepo.listForChallenge(challenge.id)

    for (const p of parts) {
      if (p.completedAt || p.failedAt) {
        result.skipped++
        continue
      }
      const logs = await this.missionLogRepo.getByParticipation(p.id)
      const successDays = logs.filter(l => l.count >= 100 || l.usedPass).length
      if (successDays >= challenge.durationDays) {
        await this.participationRepo.markCompleted(p.id)
        result.completed++
      } else {
        result.skipped++
      }
    }

    return result
  }
}
