import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { SupabaseMissionLogRepository } from '@/infrastructure/supabase/mission-log-repository'
import { LogMissionCountUseCase, LogMissionError } from '@/application/use-cases/log-mission-count'

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

  let body: { delta?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }
  if (typeof body.delta !== 'number') {
    return NextResponse.json({ error: 'MISSING_DELTA' }, { status: 400 })
  }

  try {
    const cRepo = new SupabaseChallengeRepository(supabase)
    const pRepo = new SupabaseChallengeParticipationRepository(supabase)
    const mRepo = new SupabaseMissionLogRepository(supabase)

    const challenge = await cRepo.getActive()
    if (!challenge) return NextResponse.json({ error: 'NO_ACTIVE_CHALLENGE' }, { status: 400 })

    const participation = await pRepo.getByMember(challenge.id, memberId)
    if (!participation) return NextResponse.json({ error: 'NOT_ENROLLED' }, { status: 400 })

    const uc = new LogMissionCountUseCase(cRepo, pRepo, mRepo)
    const log = await uc.execute({
      participation,
      delta: body.delta,
      today: kstToday(),
    })
    return NextResponse.json(log, { status: 200 })
  } catch (err) {
    if (err instanceof LogMissionError) {
      return NextResponse.json({ error: err.code }, { status: 400 })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
