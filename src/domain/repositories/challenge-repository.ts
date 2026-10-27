import type { Challenge } from '@/domain/entities/challenge'

export interface IChallengeRepository {
  getActive(): Promise<Challenge | null>
  getById(id: string): Promise<Challenge | null>
  getUpcoming(): Promise<Challenge[]>
  /**
   * Challenges enrollable right now: either `status='upcoming'`, or
   * `status='active'` with `today <= registration_deadline` (late-signup window).
   * Ordered by start_date ascending.
   */
  getUpcomingOrLateSignup(today: string): Promise<Challenge[]>
  getMostRecentEnded(): Promise<Challenge | null>
}
