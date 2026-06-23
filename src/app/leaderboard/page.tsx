import { unstable_cache } from 'next/cache'
import { GetLeaderboardUseCase } from '@/application/use-cases/get-leaderboard'
import { SupabaseMemberRepository } from '@/infrastructure/supabase/member-repository'
import { LeaderboardList } from '@/presentation/components/leaderboard/leaderboard-list'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { createServerClient } from '@/infrastructure/supabase/client'
import { getAuthFromHeaders } from '@/infrastructure/supabase/server-auth'

// Shared across all users; cache 60s so leaderboard doesn't hit Supabase per request.
// Invalidate explicitly via revalidateTag('leaderboard') when a run is saved.
const getCachedLeaderboard = unstable_cache(
  async () => {
    const supabase = await createServerClient()
    return new GetLeaderboardUseCase(new SupabaseMemberRepository(supabase)).execute()
  },
  ['leaderboard-stats'],
  { revalidate: 60, tags: ['leaderboard'] },
)

export default async function LeaderboardPage() {
  const supabase = await createServerClient()
  let memberId = (await getAuthFromHeaders())?.memberId ?? ''
  if (!memberId) {
    const { data: { user } } = await supabase.auth.getUser()
    memberId = (user?.user_metadata?.member_id as string | undefined) ?? ''
  }

  const [stats, memberRow] = await Promise.all([
    getCachedLeaderboard(),
    memberId
      ? supabase.from('members').select('name, avatar_url').eq('id', memberId).single()
      : Promise.resolve({ data: null }),
  ])

  const memberName = (memberRow.data?.name as string | undefined) ?? ''
  const memberAvatarUrl = (memberRow.data?.avatar_url as string | undefined) ?? ''

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7F5' }}>
      <AppHeader memberName={memberName} memberAvatarUrl={memberAvatarUrl} memberId={memberId} />
      <div style={{ padding: '20px 22px 0' }}>
        <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '4px' }}>
          {stats.length}명 참여중
        </div>
        <div style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '1.9rem', fontWeight: 500, color: '#111111', lineHeight: 1.1, letterSpacing: '-0.3px' }}>
          이달의<br /><em style={{ fontStyle: 'italic', fontWeight: 400, color: '#111111' }}>달리기 챔피언</em>
        </div>
      </div>
      <LeaderboardList
        stats={stats}
        currentMemberId={memberId}
        currentMemberName={memberName}
        currentMemberAvatarUrl={memberAvatarUrl}
      />
    </main>
  )
}
