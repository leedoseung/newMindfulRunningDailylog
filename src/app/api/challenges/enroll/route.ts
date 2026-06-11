import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { EnrollChallengeUseCase, EnrollError } from '@/application/use-cases/enroll-challenge'

function kstToday(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) return NextResponse.json({ error: 'NO_MEMBER_LINK' }, { status: 403 })

  let body: { challengeId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }
  if (!body.challengeId) return NextResponse.json({ error: 'MISSING_CHALLENGE_ID' }, { status: 400 })

  try {
    const cRepo = new SupabaseChallengeRepository(supabase)
    const pRepo = new SupabaseChallengeParticipationRepository(supabase)
    const uc = new EnrollChallengeUseCase(cRepo, pRepo)
    const participation = await uc.execute({
      challengeId: body.challengeId,
      memberId,
      today: kstToday(),
    })
    return NextResponse.json(participation, { status: 201 })
  } catch (err) {
    if (err instanceof EnrollError) {
      return NextResponse.json({ error: err.code }, { status: 400 })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
