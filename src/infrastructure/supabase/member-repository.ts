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
  avatar_url: string | null
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
    avatarUrl: row.avatar_url ?? '',
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
      .select('id, name, group_name, generation, insta_id, avatar_url')
      .order('name')

    if (error) throw new Error(`getAll failed: ${error.message}`)
    return (data as MemberRow[]).map(toMember)
  }

  async getById(memberId: string): Promise<Member | null> {
    const { data, error } = await this.supabase
      .from('members')
      .select('id, name, group_name, generation, insta_id, avatar_url')
      .eq('id', memberId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`getById failed: ${error.message}`)
    }
    return toMember(data as MemberRow)
  }

  async getLeaderboard(): Promise<MemberStats[]> {
    const [statsRes, avatarRes] = await Promise.all([
      this.supabase
        .from('member_stats')
        .select('id, name, group_name, generation, insta_id, total_count, total_minutes, monthly_count, monthly_minutes')
        .order('total_count', { ascending: false }),
      this.supabase
        .from('members')
        .select('id, avatar_url'),
    ])

    if (statsRes.error) throw new Error(`getLeaderboard failed: ${statsRes.error.message}`)

    const avatarMap = new Map<string, string>(
      (avatarRes.data ?? []).map(m => [m.id as string, (m.avatar_url as string | null) ?? ''])
    )

    return (statsRes.data as MemberStatsRow[]).map(row => ({
      ...toMemberStats(row),
      avatarUrl: avatarMap.get(row.id) ?? '',
    }))
  }
}
