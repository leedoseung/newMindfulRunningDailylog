import type { IRunLogRepository } from '@/domain/repositories/run-log-repository'
import type { RunLogInput } from '@/domain/entities/run-log-input'
import type { RunLog } from '@/domain/entities/run-log'

export class SaveRunLogUseCase {
  constructor(private repo: IRunLogRepository) {}

  execute(input: RunLogInput): Promise<RunLog> {
    return this.repo.save(input)
  }
}
