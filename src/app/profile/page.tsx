import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { GetMemberRecordsUseCase } from '@/application/use-cases/get-member-records'
import { ProfileView } from '@/presentation/components/profile/profile-view'
import { redirect } from 'next/navigation'
import type { RunLog } from '@/domain/entities/run-log'

function computeStats(runs: RunLog[]) {
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

function computeMonthlyChart(runs: RunLog[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const minutes = runs
      .filter(r => r.date.startsWith(key))
      .reduce((s, r) => s + r.durationMin, 0)
    return { key, label: String(d.getMonth() + 1), minutes, isCurrent: i === 5 }
  })
}

export default async function ProfilePage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const memberId = (user?.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) redirect('/')

  const [memberRes, myRuns] = await Promise.all([
    supabase
      .from('members')
      .select('name, group_name, generation, insta_id, avatar_url')
      .eq('id', memberId)
      .single(),
    new GetMemberRecordsUseCase(new SupabaseRunLogRepository(supabase)).execute(memberId),
  ])

  if (!memberRes.data) redirect('/')
  const m = memberRes.data as { name: string; group_name: string; generation: string; insta_id: string; avatar_url: string | null }

  return (
    <ProfileView
      member={{ name: m.name, groupName: m.group_name, generation: m.generation, instaId: m.insta_id, avatarUrl: m.avatar_url ?? '' }}
      stats={computeStats(myRuns)}
      monthlyChart={computeMonthlyChart(myRuns)}
      recentRuns={myRuns.slice(0, 5)}
      allRuns={myRuns}
      memberId={memberId}
      memberName={m.name}
      memberAvatarUrl={m.avatar_url ?? ''}
    />
  )
}
