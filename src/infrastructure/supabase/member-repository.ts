// src/infrastructure/supabase/member-repository.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { IMemberRepository } from '@/domain/repositories/member-repository'
import type { Member, MemberStats } from '@/domain/entities/member'

type MemberRow = {
  id: string
  name: string
  group_name: string
  generation: string
  insta_id: string
}

type MemberStatsRow = MemberRow & {
  total_count: number
  total_minutes: number
  monthly_count: number
  monthly_minutes: number
}

function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    groupName: row.group_name,
    generation: row.generation,
    instaId: row.insta_id,
  }
}

function toMemberStats(row: MemberStatsRow): MemberStats {
  return {
    ...toMember(row),
    totalCount: row.total_count,
    totalMinutes: row.total_minutes,
    monthlyCount: row.monthly_count,
    monthlyMinutes: row.monthly_minutes,
  }
}

export class SupabaseMemberRepository implements IMemberRepository {
  constructor(private supabase: SupabaseClient) {}

  async getAll(): Promise<Member[]> {
    const { data, error } = await this.supabase
      .from('members')
      .select('id, name, group_name, generation, insta_id')
      .order('name')

    if (error) throw new Error(`getAll failed: ${error.message}`)
    return (data as MemberRow[]).map(toMember)
  }

  async getLeaderboard(): Promise<MemberStats[]> {
    const { data, error } = await this.supabase
      .from('member_stats')
      .select('id, name, group_name, generation, insta_id, total_count, total_minutes, monthly_count, monthly_minutes')
      .order('total_count', { ascending: false })

    if (error) throw new Error(`getLeaderboard failed: ${error.message}`)
    return (data as MemberStatsRow[]).map(toMemberStats)
  }
}
