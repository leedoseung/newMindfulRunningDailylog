import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseChallengeRepository } from '@/infrastructure/supabase/challenge-repository'
import { SupabaseChallengeFeedRepository } from '@/infrastructure/supabase/challenge-feed-repository'
import { GetChallengeFeedUseCase } from '@/application/use-cases/get-challenge-feed'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cRepo = new SupabaseChallengeRepository(supabase)
  const fRepo = new SupabaseChallengeFeedRepository(supabase)

  const challenge = await cRepo.getActive()
  if (!challenge) return NextResponse.json({ items: [] })

  const uc = new GetChallengeFeedUseCase(fRepo)
  const items = await uc.execute({ challengeId: challenge.id, limit: 30 })
  return NextResponse.json({ items })
}
