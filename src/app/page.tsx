import { GetRecentRunsUseCase } from '@/application/use-cases/get-recent-runs'
import { GetMemberRecordsUseCase } from '@/application/use-cases/get-member-records'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { createServerClient } from '@/infrastructure/supabase/client'
import { HomeFeed } from '@/presentation/components/home/home-feed'
import type { CrewMember, WeeklyBar } from '@/presentation/components/home/home-feed'
import { AvatarImage } from '@/presentation/components/shared/avatar-image'
import Link from 'next/link'
import type { RunLog } from '@/domain/entities/run-log'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function computeCrew(runs: RunLog[]): CrewMember[] {
  const today = new Date().toISOString().split('T')[0]
  const map = new Map<string, CrewMember>()
  for (const run of runs) {
    const cur = map.get(run.memberId)
    if (!cur) {
      map.set(run.memberId, {
        memberId: run.memberId,
        memberName: run.memberName,
        avatarUrl: run.memberAvatarUrl,
        ranToday: run.date === today,
        todayMinutes: run.date === today ? run.durationMin : 0,
      })
    } else if (run.date === today) {
      cur.ranToday = true
      cur.todayMinutes += run.durationMin
    }
  }
  return [...map.values()].sort((a, b) => Number(b.ranToday) - Number(a.ranToday))
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
  const memberName = (memberRow.data?.name as string | undefined) ?? myRuns[0]?.memberName ?? ''
  const memberAvatarUrl = (memberRow.data?.avatar_url as string | undefined) ?? myRuns[0]?.memberAvatarUrl ?? ''
  const recentRuns = initialGridRuns

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7F5', position: 'relative' }}>
      {/* Sticky header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '52px 22px 16px',
        background: 'rgba(240,241,242,0.92)', backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{
          fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '0.65rem', fontWeight: 500,
          color: '#999', letterSpacing: '2.5px', textTransform: 'uppercase',
        }}>
          Mindful Running
        </div>
        <Link
          href="/profile"
          style={{
            display: 'block', borderRadius: '50%', flexShrink: 0,
            textDecoration: 'none',
            boxShadow: '0 0 0 2px rgba(0,0,0,0.08)',
          }}
        >
          <AvatarImage
            name={memberName || '?'}
            avatarUrl={memberAvatarUrl}
            size={34}
            bg="#111111"
            color="#fff"
          />
        </Link>
      </div>

      <HomeFeed
        recentRuns={recentRuns}
        myRuns={myRuns}
        memberId={memberId}
        crew={crew}
        weeklyBars={weeklyBars}
      />
    </main>
  )
}
