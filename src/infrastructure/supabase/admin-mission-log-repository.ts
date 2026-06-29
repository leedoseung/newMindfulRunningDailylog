// src/infrastructure/supabase/admin-mission-log-repository.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MissionLog } from '@/domain/entities/mission-log'

type Row = {
  id: string
  participation_id: string
  log_date: string
  count: number
  completed: boolean
  used_pass: boolean
  is_rest_day: boolean | null
  note: string | null
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
    isRestDay: row.is_rest_day ?? false,
    note: row.note,
    updatedAt: row.updated_at,
  }
}

const LOG_SELECT =
  'id, participation_id, log_date, count, completed, used_pass, is_rest_day, note, updated_at'

export class AdminMissionLogRepository {
  constructor(private supabase: SupabaseClient) {}

  async setCount(input: {
    participationId: string
    logDate: string
    count: number
    note?: string | null
  }): Promise<MissionLog> {
    if (input.count < 0) throw new Error('setCount: negative count not allowed')
    const { data, error } = await this.supabase.rpc('set_mission_log_count', {
      p_participation_id: input.participationId,
      p_log_date: input.logDate,
      p_count: input.count,
      p_note: input.note ?? null,
    })
    if (error) throw new Error(`admin setCount failed: ${error.message}`)
    return toEntity(data as Row)
  }

  async setRestDay(input: { participationId: string; logDate: string }): Promise<MissionLog> {
    const { data, error } = await this.supabase.rpc('mark_mission_rest_day', {
      p_participation_id: input.participationId,
      p_log_date: input.logDate,
    })
    if (error) throw new Error(`admin setRestDay failed: ${error.message}`)
    return toEntity(data as Row)
  }

  async setUsedPass(input: {
    participationId: string
    logDate: string
    usedPass: boolean
  }): Promise<MissionLog> {
    const { data, error } = await this.supabase
      .from('mission_logs')
      .update({ used_pass: input.usedPass })
      .eq('participation_id', input.participationId)
      .eq('log_date', input.logDate)
      .select(LOG_SELECT)
      .single()
    if (error) throw new Error(`admin setUsedPass failed: ${error.message}`)
    return toEntity(data as Row)
  }

  async adjustPassesRemaining(input: {
    participationId: string
    delta: 1 | -1
  }): Promise<{ passesRemaining: number }> {
    const { data, error } = await this.supabase.rpc('admin_adjust_participation_passes', {
      p_participation_id: input.participationId,
      p_delta: input.delta,
    })
    if (error) throw new Error(`admin adjustPassesRemaining failed: ${error.message}`)
    return { passesRemaining: data as number }
  }
}
