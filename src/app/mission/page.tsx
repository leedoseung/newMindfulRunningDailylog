import { createServerClient } from '@/infrastructure/supabase/client'
import { getAuthFromHeaders } from '@/infrastructure/supabase/server-auth'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { SupabaseMissionLogRepository } from '@/infrastructure/supabase/mission-log-repository'
export const dynamic = 'force-dynamic'

import { GetActiveChallengeUseCase } from '@/application/use-cases/get-active-challenge'
import { GetMissionBoardUseCase } from '@/application/use-cases/get-mission-board'
import { GetChallengeParticipantsUseCase } from '@/application/use-cases/get-challenge-participants'
import { GetChallengeLeaderboardUseCase } from '@/application/use-cases/get-challenge-leaderboard'
import { MissionPageClient } from '@/presentation/components/mission/mission-page-client'
import { AdminEntryButton } from '@/presentation/components/admin/admin-entry-button'
import { redirect } from 'next/navigation'
import { kstToday } from '@/lib/kst'

export default async function MissionPage() {
  const supabase = await createServerClient()
  // Auth pre-validated by middleware; skip /auth/v1/user round trip.
  let memberId = (await getAuthFromHeaders())?.memberId ?? ''
  if (!memberId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  }
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
      // participants + existing-participation are independent → run in parallel.
      const [participants, existing] = await Promise.all([
        participantsUC.execute(next.id),
        pRepo.getByMember(next.id, memberId),
      ])
      if (existing) {
        const board = await new GetMissionBoardUseCase(cRepo, mRepo).execute({
          participation: existing, today,
        })
        return (
          <>
            <AdminEntryButton />
            <MissionPageClient
              mode="enrolled"
              challenge={next}
              participation={existing}
              board={board}
              participants={today < next.startDate ? participants : undefined}
              currentMemberId={memberId}
            />
          </>
        )
      }
      return (
        <>
          <AdminEntryButton />
          <MissionPageClient
            mode="not-enrolled"
            challenge={next}
            participants={participants}
            currentMemberId={memberId}
          />
        </>
      )
    }
    return (
      <>
        <AdminEntryButton />
        <MissionPageClient mode="no-challenge" />
      </>
    )
  }

  const preStart = today < active.challenge.startDate

  if (!active.participation) {
    const participants = preStart ? await participantsUC.execute(active.challenge.id) : []
    return (
      <>
        <AdminEntryButton />
        <MissionPageClient
          mode="not-enrolled"
          challenge={active.challenge}
          participants={participants}
          currentMemberId={memberId}
        />
      </>
    )
  }

  // participants + board + leaderboard are all independent → parallel waterfall collapse.
  const [participants, board, leaderboard] = await Promise.all([
    preStart ? participantsUC.execute(active.challenge.id) : Promise.resolve([]),
    new GetMissionBoardUseCase(cRepo, mRepo).execute({
      participation: active.participation, today,
    }),
    !preStart
      ? new GetChallengeLeaderboardUseCase(supabase).execute({
          challengeId: active.challenge.id,
          today,
          startDate: active.challenge.startDate,
          goalMin: active.challenge.goalMin ?? 10,
        })
      : Promise.resolve([]),
  ])

  return (
    <>
      <AdminEntryButton />
      <MissionPageClient
        mode="enrolled"
        challenge={active.challenge}
        participation={active.participation}
        board={board}
        participants={preStart ? participants : undefined}
        leaderboard={!preStart ? leaderboard : undefined}
        currentMemberId={memberId}
      />
    </>
  )
}
