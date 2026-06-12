import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabasePushSubscriptionRepository } from '@/infrastructure/supabase/push-subscription-repository'
import { UnsubscribePushUseCase } from '@/application/use-cases/unsubscribe-push'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) return NextResponse.json({ error: 'NO_MEMBER_LINK' }, { status: 403 })

  let body: { endpoint?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }
  if (!body.endpoint) return NextResponse.json({ error: 'MISSING_ENDPOINT' }, { status: 400 })

  try {
    const repo = new SupabasePushSubscriptionRepository(supabase)
    const uc = new UnsubscribePushUseCase(repo)
    await uc.execute({ memberId, endpoint: body.endpoint })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
