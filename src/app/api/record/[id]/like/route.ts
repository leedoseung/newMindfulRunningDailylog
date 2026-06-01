import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'

async function getAuthMemberId(): Promise<string | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return (user.user_metadata?.member_id as string | undefined) ?? null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: runLogId } = await params
  const memberId = await getAuthMemberId()
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const [existingRow, { count }] = await Promise.all([
    admin.from('likes').select('id').eq('run_log_id', runLogId).eq('member_id', memberId).maybeSingle(),
    admin.from('likes').select('*', { count: 'exact', head: true }).eq('run_log_id', runLogId),
  ])

  return NextResponse.json({ liked: Boolean(existingRow.data), likeCount: count ?? 0 })
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: runLogId } = await params
  const memberId = await getAuthMemberId()
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('likes')
    .select('id')
    .eq('run_log_id', runLogId)
    .eq('member_id', memberId)
    .maybeSingle()

  if (existing) {
    await admin.from('likes').delete().eq('id', existing.id)
  } else {
    await admin.from('likes').insert({ run_log_id: runLogId, member_id: memberId })
  }

  const { count } = await admin
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('run_log_id', runLogId)

  return NextResponse.json({ liked: !existing, likeCount: count ?? 0 })
}
