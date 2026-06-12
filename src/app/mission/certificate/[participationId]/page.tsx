import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { CertificateCard } from '@/presentation/components/mission/certificate-card'
import { redirect } from 'next/navigation'

type Props = { params: Promise<{ participationId: string }> }

type ParticipationWithMember = {
  id: string
  challenge_id: string
  completed_at: string | null
  members: { name: string } | null
}

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"

export default async function CertificatePage({ params }: Props) {
  const { participationId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('challenge_participations')
    .select('id, challenge_id, completed_at, members!inner(name)')
    .eq('id', participationId)
    .maybeSingle()

  const row = data as unknown as ParticipationWithMember | null

  if (error || !row || !row.completed_at) {
    return (
      <main style={{ fontFamily: FONT, padding: 40, textAlign: 'center', background: '#F7F7F5', minHeight: '100vh' }}>
        <p style={{ fontSize: 14, color: '#555' }}>완주 기록을 찾을 수 없어요.</p>
      </main>
    )
  }

  const cRepo = new SupabaseChallengeRepository(supabase)
  const challenge = await cRepo.getById(row.challenge_id)
  if (!challenge) {
    return (
      <main style={{ fontFamily: FONT, padding: 40, textAlign: 'center', background: '#F7F7F5', minHeight: '100vh' }}>
        <p style={{ fontSize: 14, color: '#555' }}>챌린지 정보를 찾을 수 없어요.</p>
      </main>
    )
  }

  const memberName = row.members?.name ?? '익명'

  return (
    <main style={{ padding: 20, background: '#F7F7F5', minHeight: '100vh' }}>
      <CertificateCard
        memberName={memberName}
        challengeTitle={challenge.title}
        completedAt={row.completed_at}
        durationDays={challenge.durationDays}
      />
    </main>
  )
}
