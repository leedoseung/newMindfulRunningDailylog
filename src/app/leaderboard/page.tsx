import { GetLeaderboardUseCase } from '@/application/use-cases/get-leaderboard'
import { SupabaseMemberRepository } from '@/infrastructure/supabase/member-repository'
import { LeaderboardList } from '@/presentation/components/leaderboard/leaderboard-list'
import { createServerClient } from '@/infrastructure/supabase/client'
import Link from 'next/link'

export default async function LeaderboardPage() {
  const supabase = await createServerClient()
  const repo = new SupabaseMemberRepository(supabase)
  const useCase = new GetLeaderboardUseCase(repo)
  const stats = await useCase.execute()

  return (
    <main className="min-h-screen" style={{ background: 'var(--color-surface)' }}>
      <header className="px-4 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-white tracking-tight">
            리더보드
          </h1>
          <p className="text-xs text-white/30 mt-0.5">{stats.length}명 참여중</p>
        </div>
        <Link
          href="/"
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          홈으로
        </Link>
      </header>
      <LeaderboardList stats={stats} />
    </main>
  )
}
