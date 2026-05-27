import { GetRecentRunsUseCase } from '@/application/use-cases/get-recent-runs'
import { GetMemberRecordsUseCase } from '@/application/use-cases/get-member-records'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { createServerClient } from '@/infrastructure/supabase/client'
import { HomeFeed } from '@/presentation/components/home/home-feed'
import Link from 'next/link'
import type { RunLog } from '@/domain/entities/run-log'

function computeMyStats(runs: RunLog[]) {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthRuns = runs.filter(r => r.date.startsWith(month))
  const totalMin = runs.reduce((s, r) => s + r.durationMin, 0)
  const monthMin = monthRuns.reduce((s, r) => s + r.durationMin, 0)
  return {
    totalHours: Math.floor(totalMin / 60),
    monthHours: Math.floor(monthMin / 60),
    totalCount: runs.length,
    monthCount: monthRuns.length,
  }
}

export default async function HomePage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const memberId = (user?.user_metadata?.member_id as string | undefined) ?? ''

  const repo = new SupabaseRunLogRepository(supabase)
  const recentRuns = await new GetRecentRunsUseCase(repo).execute(7)
  const myRuns     = memberId ? await new GetMemberRecordsUseCase(repo).execute(memberId) : []

  const stats = computeMyStats(myRuns)
  const memberName = myRuns[0]?.memberName ?? ''

  const statBoxes = [
    { label: '총 달린시간', value: `${stats.totalHours}h`, primary: true },
    { label: '이번달시간', value: `${stats.monthHours}h`, primary: false },
    { label: '총 달린횟수', value: `${stats.totalCount}`, primary: false },
    { label: '이번달횟수', value: `${stats.monthCount}`, primary: false },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#F4F5F6', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '52px 22px 0' }}>
        <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '0.68rem', fontWeight: 700, color: '#888', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Mindful Running
        </div>
        <Link
          href="/profile"
          style={{
            width: 36, height: 36, borderRadius: '50%', background: '#2d3031',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: 'var(--font-raleway)', fontSize: '0.8rem', fontWeight: 700,
            textDecoration: 'none', flexShrink: 0,
          }}
        >
          {memberName ? memberName[0] : '○'}
        </Link>
      </div>

      {/* Greeting */}
      <div style={{ padding: '18px 22px 20px' }}>
        {memberName && (
          <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '4px' }}>
            안녕하세요, {memberName}님 👋
          </div>
        )}
        <div style={{ fontFamily: 'var(--font-raleway)', fontSize: '1.8rem', fontWeight: 800, color: '#2d3031', lineHeight: 1.15, letterSpacing: '-0.3px' }}>
          오늘도<br /><em style={{ fontStyle: 'italic', fontWeight: 400, color: '#2E91FC' }}>달려볼까요</em>
        </div>
      </div>

      {/* Stats row */}
      {memberId && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '0 22px 22px' }}>
          {statBoxes.map(({ label, value, primary }) => (
            <div key={label} style={{
              background: primary ? '#2d3031' : '#fff',
              borderRadius: 16, padding: '13px 8px', textAlign: 'center',
            }}>
              <span style={{
                display: 'block', fontFamily: 'var(--font-raleway)',
                fontSize: '1.2rem', fontWeight: 800,
                color: primary ? '#fff' : '#2d3031',
              }}>
                {value}
              </span>
              <span style={{
                display: 'block', fontSize: '0.54rem', fontWeight: 400,
                color: primary ? '#555' : '#888', marginTop: 4, lineHeight: 1.3,
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      <HomeFeed recentRuns={recentRuns} myRuns={myRuns} memberId={memberId} />
    </main>
  )
}
