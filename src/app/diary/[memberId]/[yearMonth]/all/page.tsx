import { notFound } from 'next/navigation'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseMemberRepository } from '@/infrastructure/supabase/member-repository'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { parseYearMonth, isValidMonth } from '@/domain/diary/month-range'
import { FullDiaryList } from '@/presentation/components/diary/full-diary-list'

export const revalidate = 3600

interface Props {
  params: Promise<{ memberId: string; yearMonth: string }>
}

export default async function FullDiaryPage({ params }: Props) {
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

  const runs = (
    await runLogRepo.getByMemberAndMonth(memberId, parsed.year, parsed.month)
  ).reverse()

  return (
    <main>
      <FullDiaryList
        runs={runs}
        year={parsed.year}
        month={parsed.month}
        memberId={memberId}
        memberName={member.name}
      />
    </main>
  )
}
