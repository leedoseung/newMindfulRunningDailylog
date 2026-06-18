import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseMemberRepository } from '@/infrastructure/supabase/member-repository'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { parseYearMonth, isValidMonth } from '@/domain/diary/month-range'
import { computeWrappedStats } from '@/domain/diary/wrapped-stats'
import { WrappedDeck } from '@/presentation/components/diary/wrapped-deck'

export const revalidate = 3600

interface Props {
  params: Promise<{ memberId: string; yearMonth: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { memberId, yearMonth } = await params
  const h = await headers()
  const host = h.get('host') ?? 'localhost'
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const origin = `${proto}://${host}`
  const ogImageUrl = `${origin}/api/og/diary/${memberId}/${yearMonth}`

  return {
    title: `${yearMonth} 달리기 일기`,
    openGraph: {
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImageUrl],
    },
    robots: {
      index: false,
      follow: false,
    },
  }
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

  const h = await headers()
  const host = h.get('host') ?? ''
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const shareUrl = `${proto}://${host}/diary/${memberId}/${yearMonth}`
  const allUrl = `${shareUrl}/all`

  return (
    <WrappedDeck
      member={{ id: member.id, name: member.name }}
      year={parsed.year}
      month={parsed.month}
      stats={stats}
      shareUrl={shareUrl}
      allUrl={allUrl}
    />
  )
}
