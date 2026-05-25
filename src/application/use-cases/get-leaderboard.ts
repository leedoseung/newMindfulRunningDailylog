import type { IMemberRepository } from '@/domain/repositories/member-repository'
import type { MemberStats } from '@/domain/entities/member'

export class GetLeaderboardUseCase {
  constructor(private repo: IMemberRepository) {}

  execute(): Promise<MemberStats[]> {
    return this.repo.getLeaderboard()
  }
}
