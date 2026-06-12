import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  IMissionLogRepository,
  UpsertCountInput,
  SetCountInput,
} from '@/domain/repositories/mission-log-repository'
import type { MissionLog } from '@/domain/entities/mission-log'

type Row = {
  id: string
  participation_id: string
  log_date: string
  count: number
  completed: boolean
  used_pass: boolean
  updated_at: string
}

function toEntity(row: Row): MissionLog {
  return {
    id: row.id,
    participationId: row.participation_id,
    logDate: row.log_date,
    count: row.count,
    completed: row.completed,
    usedPass: row.used_pass,
    updatedAt: row.updated_at,
  }
}

const SELECT =
  'id, participation_id, log_date, count, completed, used_pass, updated_at'

export class SupabaseMissionLogRepository implements IMissionLogRepository {
  constructor(private supabase: SupabaseClient) {}

  async getByParticipation(participationId: string): Promise<MissionLog[]> {
    const { data, error } = await this.supabase
      .from('mission_logs')
      .select(SELECT)
      .eq('participation_id', participationId)
      .order('log_date', { ascending: true })

    if (error) throw new Error(`getByParticipation failed: ${error.message}`)
    return (data as unknown as Row[]).map(toEntity)
  }

  async getOne(
    participationId: string,
    logDate: string
  ): Promise<MissionLog | null> {
    const { data, error } = await this.supabase
      .from('mission_logs')
      .select(SELECT)
      .eq('participation_id', participationId)
      .eq('log_date', logDate)
      .maybeSingle()

    if (error) throw new Error(`getOne failed: ${error.message}`)
    return data ? toEntity(data as unknown as Row) : null
  }

  async upsertCount(input: UpsertCountInput): Promise<MissionLog> {
    if (input.delta < 0) throw new Error('upsertCount: negative delta not allowed')

    const { data, error } = await this.supabase.rpc('upsert_mission_log_count', {
      p_participation_id: input.participationId,
      p_log_date: input.logDate,
      p_delta: input.delta,
    })

    if (error) throw new Error(`upsertCount failed: ${error.message}`)
    return toEntity(data as unknown as Row)
  }

  async setCount(input: SetCountInput): Promise<MissionLog> {
    if (input.count < 0) throw new Error('setCount: negative count not allowed')

    const { data, error } = await this.supabase.rpc('set_mission_log_count', {
      p_participation_id: input.participationId,
      p_log_date: input.logDate,
      p_count: input.count,
    })

    if (error) throw new Error(`setCount failed: ${error.message}`)
    return toEntity(data as unknown as Row)
  }

  async markPass(participationId: string, logDate: string): Promise<MissionLog> {
    const { data, error } = await this.supabase.rpc('mark_mission_log_pass', {
      p_participation_id: participationId,
      p_log_date: logDate,
    })

    if (error) throw new Error(`markPass failed: ${error.message}`)
    return toEntity(data as unknown as Row)
  }
}
