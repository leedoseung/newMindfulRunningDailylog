import { createServiceRoleClient } from '../_shared/supabase-client.ts'
import { kstToday } from '../_shared/kst.ts'
import webpush from 'npm:web-push@3'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), { status: 500 })
  }

  const supabase = createServiceRoleClient()
  const today = kstToday()

  const { data: ch } = await supabase
    .from('challenges')
    .select('id, start_date, duration_days')
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!ch) {
    return new Response(JSON.stringify({ ok: true, message: 'no active challenge' }), { status: 200 })
  }

  const { data: parts } = await supabase
    .from('challenge_participations')
    .select('id, member_id, passes_remaining')
    .eq('challenge_id', ch.id)
    .is('completed_at', null)
    .is('failed_at', null)

  let sent = 0
  let failed = 0

  for (const p of (parts ?? [])) {
    const { data: log } = await supabase
      .from('mission_logs')
      .select('count')
      .eq('participation_id', p.id)
      .eq('log_date', today)
      .maybeSingle()
    const todayCount = log?.count ?? 0
    if (todayCount > 0) continue

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('member_id', p.member_id)

    for (const s of (subs ?? [])) {
      const payload = JSON.stringify({
        title: '오늘 런지 0개 🏃',
        body: `면죄권 ${p.passes_remaining}장 남음. 지금 시작!`,
        url: '/mission',
      })
      try {
        await webpush.sendNotification({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        }, payload)
        sent++
      } catch (e) {
        failed++
        const statusCode = (e as { statusCode?: number }).statusCode
        if (statusCode === 410 || statusCode === 404) {
          await supabase.from('push_subscriptions').delete()
            .eq('member_id', p.member_id).eq('endpoint', s.endpoint)
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, today, sent, failed }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
})
