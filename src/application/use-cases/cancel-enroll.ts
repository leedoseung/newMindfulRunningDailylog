import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'

export type CancelEnrollErrorCode =
  | 'NOT_ENROLLED'
  | 'CHALLENGE_NOT_FOUND'
  | 'ALREADY_STARTED'

export class CancelEnrollError extends Error {
  constructor(public code: CancelEnrollErrorCode) {
    super(code)
    this.name = 'CancelEnrollError'
  }
}

export type CancelEnrollInput = {
  challengeId: string
  memberId: string
  today: string  // 'YYYY-MM-DD' KST
}

export class CancelEnrollUseCase {
  constructor(
    private challengeRepo: IChallengeRepository,
    private participationRepo: IChallengeParticipationRepository
  ) {}

  async execute(input: CancelEnrollInput): Promise<void> {
    const challenge = await this.challengeRepo.getById(input.challengeId)
    if (!challenge) throw new CancelEnrollError('CHALLENGE_NOT_FOUND')
    if (input.today >= challenge.startDate) {
      throw new CancelEnrollError('ALREADY_STARTED')
    }

    const existing = await this.participationRepo.getByMember(challenge.id, input.memberId)
    if (!existing) throw new CancelEnrollError('NOT_ENROLLED')

    await this.participationRepo.delete(existing.id)
  }
}
