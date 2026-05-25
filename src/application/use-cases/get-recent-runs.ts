import type { IRunLogRepository } from '@/domain/repositories/run-log-repository'
import type { RunLog } from '@/domain/entities/run-log'

export class GetRecentRunsUseCase {
  constructor(private repo: IRunLogRepository) {}

  execute(days = 7): Promise<RunLog[]> {
    return this.repo.getRecentRuns(days)
  }
}
