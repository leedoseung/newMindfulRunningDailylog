export type ChallengeStatus = 'upcoming' | 'active' | 'ended'

export type Challenge = {
  id: string
  title: string
  description: string
  goalPerDay: number
  durationDays: number
  startDate: string            // 'YYYY-MM-DD'
  registrationDeadline: string // 'YYYY-MM-DD'
  passCount: number
  status: ChallengeStatus
  imageUrl?: string | null
  goalMin?: number             // daily stamp threshold (default 10)
  restDaysPerWeek?: number     // weekly rest budget (default 1)
  createdAt: string            // ISO timestamptz
}
