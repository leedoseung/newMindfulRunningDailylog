import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
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

export class EnrollChallengeUseCase {
  constructor(
    private challengeRepo: IChallengeRepository,
    private participationRepo: IChallengeParticipationRepository
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

    return this.participationRepo.enroll({
      challengeId: challenge.id,
      memberId: input.memberId,
      passesRemaining: challenge.passCount,
    })
  }
}
