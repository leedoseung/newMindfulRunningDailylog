import type { SupabaseClient } from '@supabase/supabase-js'
import type { IChallengeRepository } from '@/domain/repositories/challenge-repository'
import type { Challenge, ChallengeStatus } from '@/domain/entities/challenge'

type ChallengeRow = {
  id: string
  title: string
  description: string | null
  goal_per_day: number
  duration_days: number
  start_date: string
  registration_deadline: string
  pass_count: number
  status: ChallengeStatus
  created_at: string
}

function toChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    goalPerDay: row.goal_per_day,
    durationDays: row.duration_days,
    startDate: row.start_date,
    registrationDeadline: row.registration_deadline,
    passCount: row.pass_count,
    status: row.status,
    createdAt: row.created_at,
  }
}

const SELECT = 'id, title, description, goal_per_day, duration_days, start_date, registration_deadline, pass_count, status, created_at'

export class SupabaseChallengeRepository implements IChallengeRepository {
  constructor(private supabase: SupabaseClient) {}

  async getActive(): Promise<Challenge | null> {
    const { data, error } = await this.supabase
      .from('challenges')
      .select(SELECT)
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`getActive failed: ${error.message}`)
    return data ? toChallenge(data as unknown as ChallengeRow) : null
  }

  async getById(id: string): Promise<Challenge | null> {
    const { data, error } = await this.supabase
      .from('challenges')
      .select(SELECT)
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(`getById failed: ${error.message}`)
    return data ? toChallenge(data as unknown as ChallengeRow) : null
  }

  async getUpcoming(): Promise<Challenge[]> {
    const { data, error } = await this.supabase
      .from('challenges')
      .select(SELECT)
      .eq('status', 'upcoming')
      .order('start_date', { ascending: true })

    if (error) throw new Error(`getUpcoming failed: ${error.message}`)
    return (data as unknown as ChallengeRow[]).map(toChallenge)
  }
}
