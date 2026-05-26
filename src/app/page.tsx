import { GetRecentRunsUseCase } from '@/application/use-cases/get-recent-runs'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { RunFeed } from '@/presentation/components/feed/run-feed'
import { createServerClient } from '@/infrastructure/supabase/client'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createServerClient()
  const repo = new SupabaseRunLogRepository(supabase)
  const useCase = new GetRecentRunsUseCase(repo)
  const runs = await useCase.execute(7)

  return (
    <main className="min-h-screen" style={{ background: 'var(--color-surface)' }}>
      <header className="px-4 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-white tracking-tight">
            마인드풀러닝
          </h1>
          <p className="text-xs text-white/30 mt-0.5">최근 7일 기록 · {runs.length}건</p>
        </div>
        <Link
          href="/leaderboard"
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          리더보드
        </Link>
      </header>
      <RunFeed runs={runs} />
    </main>
  )
}
