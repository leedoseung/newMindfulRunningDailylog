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
  const [existingRow, countResult] = await Promise.all([
    admin.from('likes').select('id').eq('run_log_id', runLogId).eq('member_id', memberId).maybeSingle(),
    admin.from('likes').select('*', { count: 'exact', head: true }).eq('run_log_id', runLogId),
  ])

  if (existingRow.error) return NextResponse.json({ error: existingRow.error.message }, { status: 500 })
  if (countResult.error) return NextResponse.json({ error: countResult.error.message }, { status: 500 })

  return NextResponse.json({ liked: Boolean(existingRow.data), likeCount: countResult.count ?? 0 })
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
    const { error } = await admin.from('likes').delete().eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await admin.from('likes').upsert(
      { run_log_id: runLogId, member_id: memberId },
      { onConflict: 'run_log_id,member_id', ignoreDuplicates: true }
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 좋아요 알림 생성 (자신의 글 제외, fire-and-forget)
    void (async () => {
      try {
        const [runRow, actorRow] = await Promise.all([
          admin.from('run_logs').select('member_id, title').eq('id', runLogId).single(),
          admin.from('members').select('name, avatar_url').eq('id', memberId).single(),
        ])
        const owner = runRow.data?.member_id
        if (!owner || owner === memberId) return
        // partial unique index handles dedup
        await admin.from('notifications').upsert(
          {
            recipient_member_id: owner,
            actor_member_id: memberId,
            actor_name: actorRow.data?.name ?? '',
            actor_avatar_url: actorRow.data?.avatar_url ?? null,
            type: 'like',
            run_log_id: runLogId,
            run_title: runRow.data?.title ?? null,
            comment_body: null,
            is_read: false,
          },
          { onConflict: 'recipient_member_id,actor_member_id,run_log_id,type', ignoreDuplicates: false }
        )
      } catch { /* non-critical */ }
    })()
  }

  const { count, error: countError } = await admin
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('run_log_id', runLogId)

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })

  return NextResponse.json({ liked: !existing, likeCount: count ?? 0 })
}
