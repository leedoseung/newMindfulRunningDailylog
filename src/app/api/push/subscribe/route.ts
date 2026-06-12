import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabasePushSubscriptionRepository } from '@/infrastructure/supabase/push-subscription-repository'
import { SubscribePushUseCase } from '@/application/use-cases/subscribe-push'

type Body = {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
  userAgent?: string
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = (user.user_metadata?.member_id as string | undefined) ?? ''
  if (!memberId) return NextResponse.json({ error: 'NO_MEMBER_LINK' }, { status: 403 })

  let body: Body
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }
  if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })
  }

  try {
    const repo = new SupabasePushSubscriptionRepository(supabase)
    const uc = new SubscribePushUseCase(repo)
    const result = await uc.execute({
      memberId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: body.userAgent,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
