import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { SupabaseMissionLogRepository } from '@/infrastructure/supabase/mission-log-repository'
import { LogMissionCountUseCase, LogMissionError } from '@/application/use-cases/log-mission-count'
import { SetMissionCountUseCase } from '@/application/use-cases/set-mission-count'
import { MarkRestDayUseCase } from '@/application/use-cases/mark-rest-day'
import { kstToday } from '@/lib/kst'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) return NextResponse.json({ error: 'NO_MEMBER_LINK' }, { status: 403 })

  let body: { delta?: number; count?: number; note?: string | null; rest?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const isRest = body.rest === true
  const hasCount = typeof body.count === 'number'
  const hasDelta = typeof body.delta === 'number'
  if (!isRest && !hasCount && !hasDelta) {
    return NextResponse.json({ error: 'MISSING_COUNT' }, { status: 400 })
  }

  try {
    const cRepo = new SupabaseChallengeRepository(supabase)
    const pRepo = new SupabaseChallengeParticipationRepository(supabase)
    const mRepo = new SupabaseMissionLogRepository(supabase)

    const challenge = await cRepo.getActive()
    if (!challenge) return NextResponse.json({ error: 'NO_ACTIVE_CHALLENGE' }, { status: 404 })

    const participation = await pRepo.getByMember(challenge.id, memberId)
    if (!participation) return NextResponse.json({ error: 'NOT_ENROLLED' }, { status: 404 })

    if (isRest) {
      const log = await new MarkRestDayUseCase(cRepo, mRepo).execute({
        participation,
        today: kstToday(),
      })
      return NextResponse.json(log, { status: 200 })
    }

    const log = hasCount
      ? await new SetMissionCountUseCase(cRepo, mRepo).execute({
          participation,
          count: body.count as number,
          note: body.note ?? null,
          today: kstToday(),
        })
      : await new LogMissionCountUseCase(cRepo, pRepo, mRepo).execute({
          participation,
          delta: body.delta as number,
          today: kstToday(),
        })
    return NextResponse.json(log, { status: 200 })
  } catch (err) {
    if (err instanceof LogMissionError) {
      return NextResponse.json({ error: err.code }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('weekly rest budget exhausted')) {
      return NextResponse.json({ error: 'REST_BUDGET_EXHAUSTED' }, { status: 400 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
