import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { ReviveChallengeParticipationUseCase } from '@/application/use-cases/revive-challenge-participation'
import { kstToday } from '@/lib/kst'

const STATUS: Record<string, number> = {
  CHALLENGE_NOT_FOUND: 404,
  NOT_PARTICIPATING: 400,
  NOT_ELIGIBLE: 400,
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) return NextResponse.json({ error: 'NO_MEMBER_LINK' }, { status: 403 })

  const cRepo = new SupabaseChallengeRepository(supabase)
  const pRepo = new SupabaseChallengeParticipationRepository(supabase)
  const uc = new ReviveChallengeParticipationUseCase(cRepo, pRepo)
  const result = await uc.execute({ challengeId: id, memberId, today: kstToday() })

  if (result.ok) return NextResponse.json({ ok: true }, { status: 200 })
  return NextResponse.json(result, { status: STATUS[result.reason] ?? 400 })
}
