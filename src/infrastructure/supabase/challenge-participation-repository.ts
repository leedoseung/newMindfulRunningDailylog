import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  IChallengeParticipationRepository,
  EnrollInput,
} from '@/domain/repositories/challenge-participation-repository'
import type { ChallengeParticipation } from '@/domain/entities/challenge-participation'

type Row = {
  id: string
  challenge_id: string
  member_id: string
  joined_at: string
  passes_remaining: number
  completed_at: string | null
  failed_at: string | null
  revived_at: string | null
}

function toEntity(row: Row): ChallengeParticipation {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    memberId: row.member_id,
    joinedAt: row.joined_at,
    passesRemaining: row.passes_remaining,
    completedAt: row.completed_at,
    failedAt: row.failed_at,
    revivedAt: row.revived_at,
  }
}

const SELECT = 'id, challenge_id, member_id, joined_at, passes_remaining, completed_at, failed_at, revived_at'

export class SupabaseChallengeParticipationRepository
  implements IChallengeParticipationRepository
{
  constructor(private supabase: SupabaseClient) {}

  async enroll(input: EnrollInput): Promise<ChallengeParticipation> {
    const { data, error } = await this.supabase
      .from('challenge_participations')
      .upsert(
        {
          challenge_id: input.challengeId,
          member_id: input.memberId,
          passes_remaining: input.passesRemaining,
        },
        { onConflict: 'challenge_id,member_id', ignoreDuplicates: false }
      )
      .select(SELECT)
      .single()

    if (error) throw new Error(`enroll failed: ${error.message}`)
    return toEntity(data as unknown as Row)
  }

  async getByMember(
    challengeId: string,
    memberId: string
  ): Promise<ChallengeParticipation | null> {
    const { data, error } = await this.supabase
      .from('challenge_participations')
      .select(SELECT)
      .eq('challenge_id', challengeId)
      .eq('member_id', memberId)
      .maybeSingle()

    if (error) throw new Error(`getByMember failed: ${error.message}`)
    return data ? toEntity(data as unknown as Row) : null
  }

  async decrementPass(participationId: string): Promise<void> {
    const { error } = await this.supabase.rpc('decrement_participation_pass', {
      participation_id: participationId,
    })
    if (error) throw new Error(`decrementPass failed: ${error.message}`)
  }

  async markFailed(participationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('challenge_participations')
      .update({ failed_at: new Date().toISOString() })
      .eq('id', participationId)
    if (error) throw new Error(`markFailed failed: ${error.message}`)
  }

  async markCompleted(participationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('challenge_participations')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', participationId)
    if (error) throw new Error(`markCompleted failed: ${error.message}`)
  }

  async listForChallenge(challengeId: string): Promise<ChallengeParticipation[]> {
    const { data, error } = await this.supabase
      .from('challenge_participations')
      .select(SELECT)
      .eq('challenge_id', challengeId)

    if (error) throw new Error(`listForChallenge failed: ${error.message}`)
    return (data as unknown as Row[]).map(toEntity)
  }

  async delete(participationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('challenge_participations')
      .delete()
      .eq('id', participationId)

    if (error) throw new Error(`delete participation failed: ${error.message}`)
  }
}
