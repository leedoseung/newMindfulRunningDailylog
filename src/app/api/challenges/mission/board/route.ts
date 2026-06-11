import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { SupabaseMissionLogRepository } from '@/infrastructure/supabase/mission-log-repository'
import { GetMissionBoardUseCase } from '@/application/use-cases/get-mission-board'

function kstToday(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) return NextResponse.json({ error: 'NO_MEMBER_LINK' }, { status: 403 })

  try {
    const cRepo = new SupabaseChallengeRepository(supabase)
    const pRepo = new SupabaseChallengeParticipationRepository(supabase)
    const mRepo = new SupabaseMissionLogRepository(supabase)

    const challenge = await cRepo.getActive()
    if (!challenge) return NextResponse.json({ error: 'NO_ACTIVE_CHALLENGE' }, { status: 404 })

    const participation = await pRepo.getByMember(challenge.id, memberId)
    if (!participation) return NextResponse.json({ error: 'NOT_ENROLLED' }, { status: 404 })

    const uc = new GetMissionBoardUseCase(cRepo, mRepo)
    const board = await uc.execute({ participation, today: kstToday() })
    return NextResponse.json(board)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
