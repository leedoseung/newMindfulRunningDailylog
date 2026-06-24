export type ChallengeParticipation = {
  id: string
  challengeId: string
  memberId: string
  joinedAt: string             // ISO timestamptz
  passesRemaining: number
  completedAt: string | null   // ISO timestamptz
  failedAt: string | null      // ISO timestamptz
  revivedAt: string | null     // ISO timestamptz
}
