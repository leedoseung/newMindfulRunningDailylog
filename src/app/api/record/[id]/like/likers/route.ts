import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: runLogId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const memberId = (user?.user_metadata?.member_id as string | undefined) ?? null
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: likes, error: likesError } = await admin
    .from('likes')
    .select('member_id')
    .eq('run_log_id', runLogId)

  if (likesError) return NextResponse.json({ error: likesError.message }, { status: 500 })
  if (!likes || likes.length === 0) return NextResponse.json({ likers: [] })

  const memberIds = likes.map(l => l.member_id)

  const { data: members, error: membersError } = await admin
    .from('members')
    .select('id, name, avatar_url')
    .in('id', memberIds)

  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 })

  const likers = (members ?? []).map(m => ({
    id: m.id,
    name: m.name,
    avatarUrl: m.avatar_url,
  }))

  return NextResponse.json({ likers })
}
