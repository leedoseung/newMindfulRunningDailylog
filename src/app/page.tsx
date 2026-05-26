import { GetRecentRunsUseCase } from '@/application/use-cases/get-recent-runs'
import { GetMemberRecordsUseCase } from '@/application/use-cases/get-member-records'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { createServerClient } from '@/infrastructure/supabase/client'
import { HomeFeed } from '@/presentation/components/home/home-feed'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const memberId = (user?.user_metadata?.member_id as string | undefined) ?? ''

  const repo = new SupabaseRunLogRepository(supabase)
  const recentRuns = await new GetRecentRunsUseCase(repo).execute(7)
  const myRuns     = memberId ? await new GetMemberRecordsUseCase(repo).execute(memberId) : []

  return (
    <main style={{ minHeight: '100vh', background: '#F4F5F6', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '52px 22px 0' }}>
        <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '0.68rem', fontWeight: 700, color: '#888', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Mindful Running
        </div>
        <Link
          href="/leaderboard"
          style={{ fontSize: '0.72rem', fontWeight: 500, color: '#2E91FC', textDecoration: 'none' }}
        >
          리더보드
        </Link>
      </div>

      <div style={{ padding: '18px 22px 20px' }}>
        <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '4px' }}>
          최근 7일 달리기 기록 · {recentRuns.length}건
        </div>
        <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '1.8rem', fontWeight: 800, color: '#2d3031', lineHeight: 1.15, letterSpacing: '-0.3px' }}>
          오늘도<br /><em style={{ fontStyle: 'italic', fontWeight: 400, color: '#2E91FC' }}>달려볼까요</em>
        </div>
      </div>

      <HomeFeed recentRuns={recentRuns} myRuns={myRuns} memberId={memberId} />

      <Link
        href="/record"
        style={{
          position: 'fixed', bottom: '28px', right: '20px',
          width: '50px', height: '50px', borderRadius: '50%',
          background: '#2E91FC', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', textDecoration: 'none',
          boxShadow: '0 6px 20px rgba(46,145,252,0.4)',
          zIndex: 101,
        }}
      >+</Link>
    </main>
  )
}
