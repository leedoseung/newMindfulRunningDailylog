import { unstable_cache } from 'next/cache'
import { GetRecentRunsUseCase } from '@/application/use-cases/get-recent-runs'
import { GetMemberRecordsUseCase } from '@/application/use-cases/get-member-records'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { createServerClient } from '@/infrastructure/supabase/client'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'
import { getAuthFromHeaders } from '@/infrastructure/supabase/server-auth'
import { HomeFeed } from '@/presentation/components/home/home-feed'
import type { CrewMember, WeeklyBar } from '@/presentation/components/home/home-feed'
import { DiaryEntryBanner } from '@/presentation/components/home/diary-entry-banner'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { kstToday } from '@/lib/kst'
import type { RunLog } from '@/domain/entities/run-log'

// Shared across all users — crew activity + first feed page.
// unstable_cache runs OUTSIDE request context; cookies()/headers() throw inside.
// Use service-role admin client (no cookies). Invalidate via revalidateTag('home-feed') on writes.
const getCachedFeed = unstable_cache(
  async (): Promise<{ crewRuns: RunLog[]; initialGridRuns: RunLog[] }> => {
    const repo = new SupabaseRunLogRepository(createAdminClient())
    const [crewRuns, initialGridRuns] = await Promise.all([
      new GetRecentRunsUseCase(repo).execute(7),
      repo.getRunsPage(0, 20),
    ])
    return { crewRuns, initialGridRuns }
  },
  ['home-feed-v1'],
  { revalidate: 60, tags: ['home-feed'] },
)

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
  const [cachedFeed, myRuns, memberRow] = await Promise.all([
    getCachedFeed(),
    memberId ? new GetMemberRecordsUseCase(repo).execute(memberId) : Promise.resolve([]),
    memberId
      ? supabase.from('members').select('name, avatar_url').eq('id', memberId).single()
      : Promise.resolve({ data: null }),
  ])
  const { crewRuns, initialGridRuns } = cachedFeed

  const crew = computeCrew(crewRuns)
  const weeklyBars = computeWeeklyBars(crewRuns)
  const weeklyTotalHours = Math.floor(crewRuns.reduce((s, r) => s + r.durationMin, 0) / 60)
  const memberName = (memberRow.data?.name as string | undefined) ?? myRuns[0]?.memberName ?? ''
  const memberAvatarUrl = (memberRow.data?.avatar_url as string | undefined) ?? myRuns[0]?.memberAvatarUrl ?? ''
  const recentRuns = initialGridRuns

  // Diary entry banner: show only late in month (day >= 25) and if user ran this month.
  // Admins (testing) always see the banner regardless of date — set ADMIN_EMAILS env (comma-separated)
  // or fall back to the hardcoded admin email for QA visibility.
  const todayKst = kstToday()
  const [yStr, mStr, dStr] = todayKst.split('-')
  const curYear = Number(yStr)
  const curMonth = Number(mStr)
  const curDay = Number(dStr)
  const monthPrefix = `${yStr}-${mStr}`
  const thisMonthRunCount = memberId
    ? myRuns.filter(r => r.date.startsWith(monthPrefix)).length
    : 0
  // Admin override (testing): force-show banner regardless of date.
  // 이두승 hardcoded as fallback; override via ADMIN_MEMBER_IDS env (comma-separated UUIDs).
  const adminMemberIds = (process.env.ADMIN_MEMBER_IDS ?? '90d2a65e-ffd1-49de-adce-4aa36cdbd347')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  const isAdmin = memberId !== '' && adminMemberIds.includes(memberId)
  const showDiaryBanner =
    memberId !== '' && (isAdmin || (curDay >= 25 && thisMonthRunCount > 0))

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7F5', position: 'relative' }}>
      <AppHeader memberName={memberName || '?'} memberAvatarUrl={memberAvatarUrl} memberId={memberId} />

      {showDiaryBanner && (
        <DiaryEntryBanner
          memberId={memberId}
          year={curYear}
          month={curMonth}
          thisMonthRunCount={thisMonthRunCount}
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
      />
    </main>
  )
}
