import type { SupabaseClient } from '@supabase/supabase-js'

export type ChallengeParticipantView = {
  memberId: string
  name: string
  avatarUrl: string | null
  joinedAt: string
}

type Row = {
  member_id: string
  joined_at: string
  members: { name: string | null; avatar_url: string | null } | null
}

export class GetChallengeParticipantsUseCase {
  constructor(private supabase: SupabaseClient) {}

  async execute(challengeId: string): Promise<ChallengeParticipantView[]> {
    const { data, error } = await this.supabase
      .from('challenge_participations')
      .select('member_id, joined_at, members ( name, avatar_url )')
      .eq('challenge_id', challengeId)
      .order('joined_at', { ascending: true })

    if (error) throw new Error(`GetChallengeParticipants failed: ${error.message}`)

    return (data as unknown as Row[]).map((r) => ({
      memberId: r.member_id,
      name: r.members?.name ?? '익명',
      avatarUrl: r.members?.avatar_url ?? null,
      joinedAt: r.joined_at,
    }))
  }
}
