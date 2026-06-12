import type { MissionLog } from '@/domain/entities/mission-log'

export type UpsertCountInput = {
  participationId: string
  logDate: string   // 'YYYY-MM-DD'
  delta: number     // +N (negative not allowed)
}

export type SetCountInput = {
  participationId: string
  logDate: string   // 'YYYY-MM-DD'
  count: number     // absolute (>= 0)
  note?: string | null
}

export interface IMissionLogRepository {
  getByParticipation(participationId: string): Promise<MissionLog[]>
  getOne(participationId: string, logDate: string): Promise<MissionLog | null>
  upsertCount(input: UpsertCountInput): Promise<MissionLog>
  setCount(input: SetCountInput): Promise<MissionLog>
  markPass(participationId: string, logDate: string): Promise<MissionLog>
  markRestDay(participationId: string, logDate: string): Promise<MissionLog>
}
