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

  // Promote upcoming → active if start_date reached (idempotent).
  await supabase
    .from('challenges')
    .update({ status: 'active' })
    .eq('status', 'upcoming')
    .lte('start_date', today)

  const { data: challengeRow, error: cErr } = await supabase
    .from('challenges')
    .select('id, start_date, duration_days')
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (cErr) return new Response(JSON.stringify({ error: cErr.message }), { status: 500 })
  if (!challengeRow) {
    return new Response(JSON.stringify({ ok: true, message: 'no active challenge' }), { status: 200 })
  }

  const yesterday = addDays(today, -1)
  if (yesterday < challengeRow.start_date) {
    return new Response(JSON.stringify({ ok: true, message: 'before season start' }), { status: 200 })
  }

  const { data: parts, error: pErr } = await supabase
    .from('challenge_participations')
    .select('id, passes_remaining, completed_at, failed_at')
    .eq('challenge_id', challengeRow.id)
    .is('completed_at', null)
    .is('failed_at', null)
  if (pErr) return new Response(JSON.stringify({ error: pErr.message }), { status: 500 })

  let decremented = 0
  let failed = 0
  let processed = 0

  for (const p of (parts ?? [])) {
    processed++
    const { data: log, error: lErr } = await supabase
      .from('mission_logs')
      .select('count, used_pass')
      .eq('participation_id', p.id)
      .eq('log_date', yesterday)
      .maybeSingle()
    if (lErr) continue

    const missed = !log || (log.count === 0 && !log.used_pass)
    if (!missed) continue

    if (p.passes_remaining > 0) {
      const { error: decErr } = await supabase.rpc('decrement_participation_pass', { participation_id: p.id })
      if (decErr) continue
      const { error: passErr } = await supabase.rpc('mark_mission_log_pass', {
        p_participation_id: p.id,
        p_log_date: yesterday,
      })
      if (passErr) continue
      decremented++
    } else {
      const { error: failErr } = await supabase
        .from('challenge_participations')
        .update({ failed_at: new Date().toISOString() })
        .eq('id', p.id)
      if (failErr) continue
      failed++
    }
  }

  return new Response(
    JSON.stringify({ ok: true, today, yesterday, processed, decremented, failed }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
})
