import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'
import type { MissionLog } from '@/domain/entities/mission-log'

export type LogMissionCountInput = {
  participation: ChallengeParticipation
  delta: number
  today: string   // 'YYYY-MM-DD' KST
}

export type LogMissionErrorCode =
  | 'NEGATIVE_DELTA'
  | 'BEFORE_START'
  | 'SEASON_ENDED'
  | 'ALREADY_FAILED'
  | 'CHALLENGE_NOT_FOUND'

export class LogMissionError extends Error {
  constructor(public readonly code: LogMissionErrorCode) {
    super(code)
    this.name = 'LogMissionError'
  }
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

export class LogMissionCountUseCase {
  constructor(
    private challengeRepo: IChallengeRepository,
    _participationRepo: IChallengeParticipationRepository,
    private missionLogRepo: IMissionLogRepository
  ) {}

  async execute(input: LogMissionCountInput): Promise<MissionLog> {
    if (input.delta < 0) throw new LogMissionError('NEGATIVE_DELTA')
    if (input.participation.failedAt) throw new LogMissionError('ALREADY_FAILED')

    const challenge = await this.challengeRepo.getById(input.participation.challengeId)
    if (!challenge) throw new LogMissionError('CHALLENGE_NOT_FOUND')

    if (input.today < challenge.startDate) throw new LogMissionError('BEFORE_START')
    const lastDay = addDays(challenge.startDate, challenge.durationDays - 1)
    if (input.today > lastDay) throw new LogMissionError('SEASON_ENDED')

    return this.missionLogRepo.upsertCount({
      participationId: input.participation.id,
      logDate: input.today,
      delta: input.delta,
    })
  }
}
