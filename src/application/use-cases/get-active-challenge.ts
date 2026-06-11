import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'
import type { Challenge } from '@/domain/entities/challenge'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

export type GetActiveChallengeResult = {
  challenge: Challenge | null
  participation: ChallengeParticipation | null
}

export class GetActiveChallengeUseCase {
  constructor(
    private challengeRepo: IChallengeRepository,
    private participationRepo: IChallengeParticipationRepository
  ) {}

  async execute(memberId: string): Promise<GetActiveChallengeResult> {
    const challenge = await this.challengeRepo.getActive()
    if (!challenge) return { challenge: null, participation: null }

    const participation = await this.participationRepo.getByMember(
      challenge.id,
      memberId
    )
    return { challenge, participation }
  }
}
