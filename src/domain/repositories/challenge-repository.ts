import type { Challenge } from '@/domain/entities/challenge'

export interface IChallengeRepository {
  getActive(): Promise<Challenge | null>
  getById(id: string): Promise<Challenge | null>
  getUpcoming(): Promise<Challenge[]>
}
