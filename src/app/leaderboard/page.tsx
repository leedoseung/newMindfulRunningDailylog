import { GetLeaderboardUseCase } from '@/application/use-cases/get-leaderboard'
import { SupabaseMemberRepository } from '@/infrastructure/supabase/member-repository'
import { LeaderboardList } from '@/presentation/components/leaderboard/leaderboard-list'
import { createServerClient } from '@/infrastructure/supabase/client'

export default async function LeaderboardPage() {
  const supabase = await createServerClient()
  const repo = new SupabaseMemberRepository(supabase)
  const useCase = new GetLeaderboardUseCase(repo)
  const stats = await useCase.execute()

  return (
    <main style={{ minHeight: '100vh', background: '#F7F7F5' }}>
      <div style={{ padding: '30px 22px 0' }}>
        <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '4px' }}>
          {stats.length}명 참여중
        </div>
        <div style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", fontSize: '1.9rem', fontWeight: 500, color: '#111111', lineHeight: 1.1, letterSpacing: '-0.3px' }}>
          이달의<br /><em style={{ fontStyle: 'italic', fontWeight: 400, color: '#111111' }}>달리기 챔피언</em>
        </div>
      </div>
      <LeaderboardList stats={stats} />
    </main>
  )
}
