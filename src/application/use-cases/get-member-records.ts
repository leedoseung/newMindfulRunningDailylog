import type { IRunLogRepository } from '@/domain/repositories/run-log-repository'
import type { RunLog } from '@/domain/entities/run-log'

export class GetMemberRecordsUseCase {
  constructor(private repo: IRunLogRepository) {}

  execute(memberId: string): Promise<RunLog[]> {
    return this.repo.getByMemberId(memberId)
  }
}
