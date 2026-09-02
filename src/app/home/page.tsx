import { GetRecentRunsUseCase } from '@/application/use-cases/get-recent-runs'
import { GetMemberRecordsUseCase } from '@/application/use-cases/get-member-records'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { createServerClient } from '@/infrastructure/supabase/client'
import { getAuthFromHeaders } from '@/infrastructure/supabase/server-auth'
import { HomeFeed } from '@/presentation/components/home/home-feed'
import type { CrewMember, WeeklyBar } from '@/presentation/components/home/home-feed'
import { DiaryEntryBanner } from '@/presentation/components/home/diary-entry-banner'
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
  // Auth pre-validated by middleware; skip /auth/v1/user round trip.
  let memberId = (await getAuthFromHeaders())?.memberId ?? ''
  if (!memberId) {
    const { data: { user } } = await supabase.auth.getUser()
    memberId = (user?.user_metadata?.member_id as string | undefined) ?? ''
  }

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

  // Diary entry banner:
  //   day 1~7  → 지난달 결산 (지난달 러닝이 있을 때만)
  //   day 25~ → 이번달 예고 (이번달 러닝이 있을 때만)
  //   그 외    → 숨김
  const todayKst = kstToday()
  const [yStr, mStr, dStr] = todayKst.split('-')
  const curYear = Number(yStr)
  const curMonth = Number(mStr)
  const curDay = Number(dStr)
  const prevYear = curMonth === 1 ? curYear - 1 : curYear
  const prevMonth = curMonth === 1 ? 12 : curMonth - 1
  const monthPrefix = `${yStr}-${mStr}`
  const prevMonthPrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`
  const thisMonthRunCount = memberId
    ? myRuns.filter(r => r.date.startsWith(monthPrefix)).length
    : 0
  const prevMonthRunCount = memberId
    ? myRuns.filter(r => r.date.startsWith(prevMonthPrefix)).length
    : 0
  const diaryBannerVariant: 'previous' | 'current' | null =
    memberId === ''
      ? null
      : curDay <= 7 && prevMonthRunCount > 0
        ? 'previous'
        : curDay >= 25 && thisMonthRunCount > 0
          ? 'current'
          : null
  const showH1DashboardBanner = todayKst <= '2026-09-07'

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7F5', position: 'relative' }}>
      <AppHeader memberName={memberName || '?'} memberAvatarUrl={memberAvatarUrl} memberId={memberId} />

      {diaryBannerVariant === 'previous' && (
        <DiaryEntryBanner
          memberId={memberId}
          year={prevYear}
          month={prevMonth}
          runCount={prevMonthRunCount}
          variant="previous"
        />
      )}
      {diaryBannerVariant === 'current' && (
        <DiaryEntryBanner
          memberId={memberId}
          year={curYear}
          month={curMonth}
          runCount={thisMonthRunCount}
          variant="current"
        />
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
        showH1DashboardBanner={showH1DashboardBanner}
      />
    </main>
  )
}
