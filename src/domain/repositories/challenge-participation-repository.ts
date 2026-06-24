import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

export type EnrollInput = {
  challengeId: string
  memberId: string
  passesRemaining: number
}

export interface IChallengeParticipationRepository {
  enroll(input: EnrollInput): Promise<ChallengeParticipation>
  getByMember(challengeId: string, memberId: string): Promise<ChallengeParticipation | null>
  decrementPass(participationId: string): Promise<void>
  markFailed(participationId: string): Promise<void>
  markCompleted(participationId: string): Promise<void>
  listForChallenge(challengeId: string): Promise<ChallengeParticipation[]>
  delete(participationId: string): Promise<void>
  revive(participationId: string, passCount: number): Promise<void>
}
