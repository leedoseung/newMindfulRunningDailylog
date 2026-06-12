import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'
import type { MissionLog } from '@/domain/entities/mission-log'
import { LogMissionError } from './log-mission-count'

export type SetMissionCountInput = {
  participation: ChallengeParticipation
  count: number
  today: string   // 'YYYY-MM-DD' KST
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

export class SetMissionCountUseCase {
  constructor(
    private challengeRepo: IChallengeRepository,
    private missionLogRepo: IMissionLogRepository
  ) {}

  async execute(input: SetMissionCountInput): Promise<MissionLog> {
    if (input.count < 0) throw new LogMissionError('NEGATIVE_DELTA')
    if (input.participation.failedAt) throw new LogMissionError('ALREADY_FAILED')

    const challenge = await this.challengeRepo.getById(input.participation.challengeId)
    if (!challenge) throw new LogMissionError('CHALLENGE_NOT_FOUND')

    if (input.today < challenge.startDate) throw new LogMissionError('BEFORE_START')
    const lastDay = addDays(challenge.startDate, challenge.durationDays - 1)
    if (input.today > lastDay) throw new LogMissionError('SEASON_ENDED')

    return this.missionLogRepo.setCount({
      participationId: input.participation.id,
      logDate: input.today,
      count: input.count,
    })
  }
}
