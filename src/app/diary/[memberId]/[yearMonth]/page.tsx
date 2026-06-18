import { notFound } from 'next/navigation'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseMemberRepository } from '@/infrastructure/supabase/member-repository'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { parseYearMonth, isValidMonth } from '@/domain/diary/month-range'
import { computeWrappedStats } from '@/domain/diary/wrapped-stats'

export const revalidate = 3600

interface Props {
  params: Promise<{ memberId: string; yearMonth: string }>
}

export default async function DiaryWrappedPage({ params }: Props) {
  const { memberId, yearMonth } = await params

  const parsed = parseYearMonth(yearMonth)
  if (!parsed || !isValidMonth(parsed.year, parsed.month)) {
    notFound()
  }

  const supabase = await createServerClient()
  const memberRepo = new SupabaseMemberRepository(supabase)
  const runLogRepo = new SupabaseRunLogRepository(supabase)

  const member = await memberRepo.getById(memberId)
  if (!member) {
    notFound()
  }

  const runs = await runLogRepo.getByMemberAndMonth(memberId, parsed.year, parsed.month)
  const stats = computeWrappedStats(runs)

  // Phase 2 will replace this with <WrappedDeck member={member} year={parsed.year} month={parsed.month} stats={stats} runs={runs} />
  return (
    <pre style={{ padding: 20, fontSize: 12 }}>
      {JSON.stringify(
        { memberName: member.name, year: parsed.year, month: parsed.month, stats },
        null,
        2,
      )}
    </pre>
  )
}
