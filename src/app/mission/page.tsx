import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { SupabaseMissionLogRepository } from '@/infrastructure/supabase/mission-log-repository'
import { GetActiveChallengeUseCase } from '@/application/use-cases/get-active-challenge'
import { GetMissionBoardUseCase } from '@/application/use-cases/get-mission-board'
import { MissionPageClient } from '@/presentation/components/mission/mission-page-client'
import { redirect } from 'next/navigation'

function kstToday(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export default async function MissionPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) redirect('/link-member')

  const cRepo = new SupabaseChallengeRepository(supabase)
  const pRepo = new SupabaseChallengeParticipationRepository(supabase)
  const mRepo = new SupabaseMissionLogRepository(supabase)

  const active = await new GetActiveChallengeUseCase(cRepo, pRepo).execute(memberId)

  if (!active.challenge) {
    // try upcoming
    const upcoming = await cRepo.getUpcoming()
    if (upcoming.length > 0) {
      const next = upcoming[0]!
      const existing = await pRepo.getByMember(next.id, memberId)
      if (existing) {
        // already enrolled in upcoming, show board with no today
        const board = await new GetMissionBoardUseCase(cRepo, mRepo).execute({
          participation: existing, today: kstToday(),
        })
        return <MissionPageClient mode="enrolled" challenge={next} board={board} />
      }
      return <MissionPageClient mode="not-enrolled" challenge={next} />
    }
    return <MissionPageClient mode="no-challenge" />
  }

  if (!active.participation) {
    return <MissionPageClient mode="not-enrolled" challenge={active.challenge} />
  }

  const board = await new GetMissionBoardUseCase(cRepo, mRepo).execute({
    participation: active.participation, today: kstToday(),
  })

  return <MissionPageClient mode="enrolled" challenge={active.challenge} board={board} />
}
