import type { RunLog } from '@/domain/entities/run-log'
import type { RunLogInput } from '@/domain/entities/run-log-input'

export interface IRunLogRepository {
  getRecentRuns(days: number): Promise<RunLog[]>
  getByMemberId(memberId: string): Promise<RunLog[]>
  save(input: RunLogInput): Promise<RunLog>
}
