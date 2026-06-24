// src/application/use-cases/revive-challenge-participation.ts
import { canRevive } from '@/domain/entities/challenge-halfway'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { IChallengeParticipationRepository } from '@/domain/repositories/challenge-participation-repository'

export type ReviveResult =
  | { ok: true }
  | { ok: false; reason: 'CHALLENGE_NOT_FOUND' | 'NOT_PARTICIPATING' | 'NOT_ELIGIBLE' }

export interface ReviveInput {
  challengeId: string
  memberId: string
  today: string
}

export class ReviveChallengeParticipationUseCase {
  constructor(
    private readonly challengeRepo: IChallengeRepository,
    private readonly participationRepo: IChallengeParticipationRepository,
  ) {}

  async execute(input: ReviveInput): Promise<ReviveResult> {
    const challenge = await this.challengeRepo.getById(input.challengeId)
    if (!challenge) return { ok: false, reason: 'CHALLENGE_NOT_FOUND' }

    const p = await this.participationRepo.getByMember(input.challengeId, input.memberId)
    if (!p) return { ok: false, reason: 'NOT_PARTICIPATING' }

    if (!canRevive(p, challenge, input.today)) {
      return { ok: false, reason: 'NOT_ELIGIBLE' }
    }

    await this.participationRepo.revive(p.id, challenge.passCount)
    return { ok: true }
  }
}
