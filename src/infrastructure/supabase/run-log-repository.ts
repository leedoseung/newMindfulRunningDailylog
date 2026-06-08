// src/infrastructure/supabase/run-log-repository.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { IRunLogRepository } from '@/domain/repositories/run-log-repository'
import type { RunLog } from '@/domain/entities/run-log'
import type { RunLogInput } from '@/domain/entities/run-log-input'
import { toTransformedUrl } from './image-url'

type RunLogRow = {
  id: string
  member_id: string
  date: string
  run_time: string | null
  duration_min: number
  title: string
  thought_before: string
  thought_during: string
  thought_after: string
  location: string
  photo_url: string
  created_at: string
  members: { name: string; avatar_url: string | null; insta_id: string | null } | null
  likes: [{ count: number }] | null
  comments: [{ count: number }] | null
}

function toRunLog(row: RunLogRow): RunLog {
  return {
    id: row.id,
    memberId: row.member_id,
    memberName: row.members?.name ?? '',
    memberAvatarUrl: toTransformedUrl(row.members?.avatar_url, 120, 80),
    memberInstaId: row.members?.insta_id ?? '',
    date: row.date,
    runTime: row.run_time ?? null,
    durationMin: row.duration_min,
    title: row.title,
    thoughtBefore: row.thought_before,
    thoughtDuring: row.thought_during,
    thoughtAfter: row.thought_after,
    location: row.location,
    photoUrl: row.photo_url ?? '',
    rawPhotoUrl: row.photo_url ?? null,
    createdAt: row.created_at,
    likeCount: (row.likes?.[0]?.count as number) ?? 0,
    commentCount: (row.comments?.[0]?.count as number) ?? 0,
  }
}

const SELECT_FIELDS = `
  id, member_id, date, run_time, duration_min,
  title, thought_before, thought_during, thought_after,
  location, photo_url, created_at,
  members!inner(name, avatar_url, insta_id),
  likes(count),
  comments(count)
`

export class SupabaseRunLogRepository implements IRunLogRepository {
  constructor(private supabase: SupabaseClient) {}

  async getRecentRuns(days: number): Promise<RunLog[]> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const dateStr = cutoff.toISOString().split('T')[0]!

    const { data, error } = await this.supabase
      .from('run_logs')
      .select(SELECT_FIELDS)
      .gte('date', dateStr)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw new Error(`getRecentRuns failed: ${error.message}`)
    return (data as unknown as RunLogRow[]).map(toRunLog)
  }

  async getRunsPage(offset: number, limit: number): Promise<RunLog[]> {
    const { data, error } = await this.supabase
      .from('run_logs')
      .select(SELECT_FIELDS)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw new Error(`getRunsPage failed: ${error.message}`)
    return (data as unknown as RunLogRow[]).map(toRunLog)
  }

  async getByDate(date: string): Promise<RunLog[]> {
    const { data, error } = await this.supabase
      .from('run_logs')
      .select(SELECT_FIELDS)
      .eq('date', date)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`getByDate failed: ${error.message}`)
    return (data as unknown as RunLogRow[]).map(toRunLog)
  }

  async getByMemberId(memberId: string): Promise<RunLog[]> {
    const { data, error } = await this.supabase
      .from('run_logs')
      .select(SELECT_FIELDS)
      .eq('member_id', memberId)
      .order('date', { ascending: false })

    if (error) throw new Error(`getByMemberId failed: ${error.message}`)
    return (data as unknown as RunLogRow[]).map(toRunLog)
  }

  async save(input: RunLogInput): Promise<RunLog> {
    const { data, error } = await this.supabase
      .from('run_logs')
      .insert({
        member_id: input.memberId,
        date: input.date,
        run_time: input.runTime ?? null,
        duration_min: input.durationMin,
        title: input.title,
        thought_before: input.thoughtBefore,
        thought_during: input.thoughtDuring,
        thought_after: input.thoughtAfter,
        location: input.location,
        photo_url: input.photoUrl,
      })
      .select(SELECT_FIELDS)
      .single()

    if (error) throw new Error(`save failed: ${error.message}`)
    return toRunLog(data as unknown as RunLogRow)
  }
}
