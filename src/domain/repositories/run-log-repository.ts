import type { RunLog } from '@/domain/entities/run-log'

export interface IRunLogRepository {
  getRecentRuns(days: number): Promise<RunLog[]>
  getByMemberId(memberId: string): Promise<RunLog[]>
}
