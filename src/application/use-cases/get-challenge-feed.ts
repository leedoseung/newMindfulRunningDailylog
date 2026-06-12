export type ChallengeFeedItem = {
  id: string
  memberId: string
  memberName: string
  memberAvatarUrl: string
  logDate: string
  dayIndex: number
  count: number
  completed: boolean
}

export interface IChallengeFeedRepository {
  listRecent(challengeId: string, limit: number): Promise<ChallengeFeedItem[]>
}

export class GetChallengeFeedUseCase {
  constructor(private repo: IChallengeFeedRepository) {}
  execute(input: { challengeId: string; limit: number }): Promise<ChallengeFeedItem[]> {
    return this.repo.listRecent(input.challengeId, input.limit)
  }
}
