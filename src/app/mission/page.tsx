import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { SupabaseMissionLogRepository } from '@/infrastructure/supabase/mission-log-repository'
import { GetActiveChallengeUseCase } from '@/application/use-cases/get-active-challenge'
import { GetMissionBoardUseCase } from '@/application/use-cases/get-mission-board'
import { GetChallengeParticipantsUseCase } from '@/application/use-cases/get-challenge-participants'
import { GetChallengeLeaderboardUseCase } from '@/application/use-cases/get-challenge-leaderboard'
import { MissionPageClient } from '@/presentation/components/mission/mission-page-client'
import { redirect } from 'next/navigation'
import { kstToday } from '@/lib/kst'

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
  const today = kstToday()
  const participantsUC = new GetChallengeParticipantsUseCase(supabase)

  if (!active.challenge) {
    // try upcoming
    const upcoming = await cRepo.getUpcoming()
    if (upcoming.length > 0) {
      const next = upcoming[0]!
      const participants = await participantsUC.execute(next.id)
      const existing = await pRepo.getByMember(next.id, memberId)
      if (existing) {
        const board = await new GetMissionBoardUseCase(cRepo, mRepo).execute({
          participation: existing, today,
        })
        return (
          <MissionPageClient
            mode="enrolled"
            challenge={next}
            participation={existing}
            board={board}
            participants={today < next.startDate ? participants : undefined}
            currentMemberId={memberId}
          />
        )
      }
      return (
        <MissionPageClient
          mode="not-enrolled"
          challenge={next}
          participants={participants}
          currentMemberId={memberId}
        />
      )
    }
    return <MissionPageClient mode="no-challenge" />
  }

  const preStart = today < active.challenge.startDate
  const participants = preStart ? await participantsUC.execute(active.challenge.id) : []

  if (!active.participation) {
    return (
      <MissionPageClient
        mode="not-enrolled"
        challenge={active.challenge}
        participants={participants}
        currentMemberId={memberId}
      />
    )
  }

  const board = await new GetMissionBoardUseCase(cRepo, mRepo).execute({
    participation: active.participation, today,
  })

  const leaderboard = !preStart
    ? await new GetChallengeLeaderboardUseCase(supabase).execute({
        challengeId: active.challenge.id,
        today,
        startDate: active.challenge.startDate,
        goalMin: active.challenge.goalMin ?? 10,
      })
    : []

  return (
    <MissionPageClient
      mode="enrolled"
      challenge={active.challenge}
      participation={active.participation}
      board={board}
      participants={preStart ? participants : undefined}
      leaderboard={!preStart ? leaderboard : undefined}
      currentMemberId={memberId}
    />
  )
}
