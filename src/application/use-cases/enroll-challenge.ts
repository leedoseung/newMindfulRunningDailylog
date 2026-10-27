import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { IMissionLogRepository } from '@/domain/repositories/mission-log-repository'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

export type EnrollChallengeInput = {
  challengeId: string
  memberId: string
  today: string  // 'YYYY-MM-DD' (KST today)
}

export type EnrollErrorCode =
  | 'CHALLENGE_NOT_FOUND'
  | 'REGISTRATION_CLOSED'
  | 'SEASON_ENDED'

export class EnrollError extends Error {
  constructor(public readonly code: EnrollErrorCode) {
    super(code)
    this.name = 'EnrollError'
  }
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number) as [number, number, number]
  const [ty, tm, td] = to.split('-').map(Number) as [number, number, number]
  const dtFrom = Date.UTC(fy, fm - 1, fd)
  const dtTo = Date.UTC(ty, tm - 1, td)
  return Math.round((dtTo - dtFrom) / 86400000)
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

export class EnrollChallengeUseCase {
  constructor(
    private challengeRepo: IChallengeRepository,
    private participationRepo: IChallengeParticipationRepository,
    private missionLogRepo: IMissionLogRepository
  ) {}

  async execute(input: EnrollChallengeInput): Promise<ChallengeParticipation> {
    const challenge = await this.challengeRepo.getById(input.challengeId)
    if (!challenge) throw new EnrollError('CHALLENGE_NOT_FOUND')
    if (challenge.status === 'ended') throw new EnrollError('SEASON_ENDED')
    if (input.today > challenge.registrationDeadline) {
      throw new EnrollError('REGISTRATION_CLOSED')
    }

    const existing = await this.participationRepo.getByMember(
      challenge.id,
      input.memberId
    )
    if (existing) return existing

    // Late signup: challenge already started. For each missed day from startDate
    // up to yesterday, burn a pass (capped at passCount) and mark the day as
    // pass-used so run-daily-pass-check doesn't double-process it. Any missed
    // days beyond passCount stay unmarked — the daily cron will fail them.
    const missed = Math.max(0, daysBetween(challenge.startDate, input.today))
    const burn = Math.min(missed, challenge.passCount)

    const participation = await this.participationRepo.enroll({
      challengeId: challenge.id,
      memberId: input.memberId,
      passesRemaining: challenge.passCount - burn,
    })

    for (let i = 0; i < burn; i++) {
      const missedDate = addDays(challenge.startDate, i)
      await this.missionLogRepo.markPass(participation.id, missedDate)
    }

    return participation
  }
}
