import { GetRecentRunsUseCase } from '@/application/use-cases/get-recent-runs'
import { GetMemberRecordsUseCase } from '@/application/use-cases/get-member-records'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeParticipationRepository } from '@/infrastructure/supabase/challenge-participation-repository'
import { createServerClient } from '@/infrastructure/supabase/client'
import { HomeFeed } from '@/presentation/components/home/home-feed'
import type { CrewMember, WeeklyBar } from '@/presentation/components/home/home-feed'
import { ChallengeAnnouncementBanner } from '@/presentation/components/home/challenge-announcement-banner'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { kstToday } from '@/lib/kst'
import type { RunLog } from '@/domain/entities/run-log'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

type CrewMemberInternal = CrewMember & { lastCreatedAt: string }

function computeCrew(runs: RunLog[]): CrewMember[] {
  const today = new Date().toISOString().split('T')[0]!
  const map = new Map<string, CrewMemberInternal>()
  for (const run of runs) {
    const cur = map.get(run.memberId)
    if (!cur) {
      map.set(run.memberId, {
        memberId: run.memberId,
        memberName: run.memberName,
        avatarUrl: run.memberAvatarUrl,
        ranToday: run.date === today,
        todayMinutes: run.date === today ? run.durationMin : 0,
        lastCreatedAt: run.createdAt,
      })
    } else {
      if (run.date === today) {
        cur.ranToday = true
        cur.todayMinutes += run.durationMin
      }
      if (run.createdAt > cur.lastCreatedAt) cur.lastCreatedAt = run.createdAt
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.ranToday !== b.ranToday) return Number(b.ranToday) - Number(a.ranToday)
    return b.lastCreatedAt.localeCompare(a.lastCreatedAt)
  })
}

function computeWeeklyBars(runs: RunLog[]): WeeklyBar[] {
  const now = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - 6 + i)
    const dateStr = d.toISOString().split('T')[0]
    const count = runs.filter(r => r.date === dateStr).length
    return { label: DAY_LABELS[d.getDay()] ?? '?', count, isToday: i === 6 }
  })
}

export default async function HomePage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const memberId = (user?.user_metadata?.member_id as string | undefined) ?? ''

  const repo = new SupabaseRunLogRepository(supabase)
  const [crewRuns, initialGridRuns, myRuns, memberRow] = await Promise.all([
    new GetRecentRunsUseCase(repo).execute(7),
    repo.getRunsPage(0, 20),
    memberId ? new GetMemberRecordsUseCase(repo).execute(memberId) : Promise.resolve([]),
    memberId
      ? supabase.from('members').select('name, avatar_url').eq('id', memberId).single()
      : Promise.resolve({ data: null }),
  ])

  const crew = computeCrew(crewRuns)
  const weeklyBars = computeWeeklyBars(crewRuns)
  const weeklyTotalHours = Math.floor(crewRuns.reduce((s, r) => s + r.durationMin, 0) / 60)
  const memberName = (memberRow.data?.name as string | undefined) ?? myRuns[0]?.memberName ?? ''
  const memberAvatarUrl = (memberRow.data?.avatar_url as string | undefined) ?? myRuns[0]?.memberAvatarUrl ?? ''
  const recentRuns = initialGridRuns

  // Challenge banner: active OR upcoming
  let bannerChallenge: { id: string; title: string; description: string; startDate: string; registrationDeadline: string } | null = null
  let bannerEnrolled = false
  const today = kstToday()
  if (memberId) {
    const cRepo = new SupabaseChallengeRepository(supabase)
    const pRepo = new SupabaseChallengeParticipationRepository(supabase)
    const active = await cRepo.getActive()
    const candidate = active ?? (await cRepo.getUpcoming())[0] ?? null
    if (candidate) {
      const part = await pRepo.getByMember(candidate.id, memberId)
      bannerEnrolled = !!part
      const showWhenActive = !!active
      const showWhenUpcoming = !active && today <= candidate.registrationDeadline
      if (showWhenActive || showWhenUpcoming) {
        bannerChallenge = {
          id: candidate.id,
          title: candidate.title,
          description: candidate.description,
          startDate: candidate.startDate,
          registrationDeadline: candidate.registrationDeadline,
        }
      }
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7F5', position: 'relative' }}>
      <AppHeader memberName={memberName || '?'} memberAvatarUrl={memberAvatarUrl} memberId={memberId} />

      {bannerChallenge && (
        <div style={{ padding: '12px 16px 0' }}>
          <ChallengeAnnouncementBanner challenge={bannerChallenge} today={today} enrolled={bannerEnrolled} />
        </div>
      )}

      <HomeFeed
        recentRuns={recentRuns}
        myRuns={myRuns}
        memberId={memberId}
        crew={crew}
        weeklyBars={weeklyBars}
        weeklyTotalHours={weeklyTotalHours}
        memberName={memberName}
        memberAvatarUrl={memberAvatarUrl}
      />
    </main>
  )
}
