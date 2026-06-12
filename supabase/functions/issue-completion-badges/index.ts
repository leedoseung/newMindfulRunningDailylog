import { createServiceRoleClient } from '../_shared/supabase-client.ts'
import { kstToday } from '../_shared/kst.ts'

function addDays(yyyyMmDd: string, days: number): string {
  const parts = yyyyMmDd.split('-').map(Number)
  const dt = new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const today = kstToday()

  const { data: ch } = await supabase
    .from('challenges')
    .select('id, title, start_date, duration_days')
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!ch) {
    return new Response(JSON.stringify({ ok: true, message: 'no active challenge' }), { status: 200 })
  }

  const lastDay = addDays(ch.start_date, ch.duration_days - 1)
  if (today <= lastDay) {
    return new Response(JSON.stringify({ ok: true, message: 'season not ended' }), { status: 200 })
  }

  const { data: parts } = await supabase
    .from('challenge_participations')
    .select('id, member_id, completed_at, failed_at')
    .eq('challenge_id', ch.id)
    .is('completed_at', null)
    .is('failed_at', null)

  let completed = 0
  for (const p of (parts ?? [])) {
    const { data: logs } = await supabase
      .from('mission_logs')
      .select('count, used_pass')
      .eq('participation_id', p.id)
    const successDays = (logs ?? []).filter(l => l.count >= 100 || l.used_pass).length
    if (successDays >= ch.duration_days) {
      await supabase
        .from('challenge_participations')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', p.id)
      // grant badge (idempotent via RPC)
      await supabase.rpc('grant_challenge_badge', {
        p_member_id: p.member_id,
        p_badge: {
          challenge_id: ch.id,
          challenge_title: ch.title,
          completed_at: new Date().toISOString(),
        },
      })
      completed++
    }
  }

  // mark challenge ended (idempotent)
  await supabase.from('challenges').update({ status: 'ended' }).eq('id', ch.id)

  return new Response(
    JSON.stringify({ ok: true, today, completed }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
})
