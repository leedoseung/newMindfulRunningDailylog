import type { SupabaseClient } from '@supabase/supabase-js'
import type { IChallengeFeedRepository, ChallengeFeedItem } from '@/application/use-cases/get-challenge-feed'

type Row = {
  id: string
  log_date: string
  count: number
  completed: boolean
  participation_id: string
}

type ParticipationRow = {
  id: string
  member_id: string
  challenge_id: string
}

type MemberRow = {
  id: string
  name: string
  avatar_url: string | null
}

type ChallengeRow = {
  id: string
  start_date: string
}

export class SupabaseChallengeFeedRepository implements IChallengeFeedRepository {
  constructor(private supabase: SupabaseClient) {}

  async listRecent(challengeId: string, limit: number): Promise<ChallengeFeedItem[]> {
    // Step 1: list participations for this challenge
    const { data: parts, error: pErr } = await this.supabase
      .from('challenge_participations')
      .select('id, member_id, challenge_id')
      .eq('challenge_id', challengeId)
    if (pErr) throw new Error(`listRecent: participations failed: ${pErr.message}`)
    const partRows = (parts ?? []) as ParticipationRow[]
    if (partRows.length === 0) return []

    const partIds = partRows.map(p => p.id)
    const partById = new Map(partRows.map(p => [p.id, p]))

    // Step 2: recent mission logs across those participations
    const { data: logs, error: lErr } = await this.supabase
      .from('mission_logs')
      .select('id, log_date, count, completed, participation_id, updated_at')
      .in('participation_id', partIds)
      .order('updated_at', { ascending: false })
      .limit(limit)
    if (lErr) throw new Error(`listRecent: logs failed: ${lErr.message}`)
    const logRows = (logs ?? []) as Row[]
    if (logRows.length === 0) return []

    // Step 3: load members + challenge meta
    const memberIds = Array.from(new Set(logRows.map(l => partById.get(l.participation_id)?.member_id).filter((v): v is string => Boolean(v))))
    const { data: members, error: mErr } = await this.supabase
      .from('members')
      .select('id, name, avatar_url')
      .in('id', memberIds)
    if (mErr) throw new Error(`listRecent: members failed: ${mErr.message}`)
    const memberById = new Map((members ?? []).map(m => [m.id as string, m as MemberRow]))

    const { data: ch, error: cErr } = await this.supabase
      .from('challenges')
      .select('id, start_date')
      .eq('id', challengeId)
      .maybeSingle()
    if (cErr) throw new Error(`listRecent: challenge failed: ${cErr.message}`)
    const challenge = ch as ChallengeRow | null
    if (!challenge) return []

    const startMs = new Date(challenge.start_date).getTime()

    return logRows.map(l => {
      const part = partById.get(l.participation_id)
      const member = part ? memberById.get(part.member_id) : undefined
      const dayIndex = Math.floor((new Date(l.log_date).getTime() - startMs) / 86400000)
      return {
        id: l.id,
        memberId: part?.member_id ?? '',
        memberName: member?.name ?? '',
        memberAvatarUrl: member?.avatar_url ?? '',
        logDate: l.log_date,
        dayIndex,
        count: l.count,
        completed: l.completed,
      }
    })
  }
}
