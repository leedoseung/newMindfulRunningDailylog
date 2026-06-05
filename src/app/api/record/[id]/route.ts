import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'
import type { RunLogInput } from '@/domain/entities/run-log-input'
import type { RunLog } from '@/domain/entities/run-log'

async function getAuthMemberId(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return (user.user_metadata?.member_id as string | undefined) ?? null
}

async function verifyOwnership(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  recordId: string,
  memberId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('run_logs')
    .select('member_id')
    .eq('id', recordId)
    .single()
  return data?.member_id === memberId
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('run_logs')
    .select(`
      id, member_id, date, run_time, duration_min,
      title, thought_before, thought_during, thought_after,
      location, photo_url, created_at,
      members!inner(name, avatar_url, insta_id),
      likes(count),
      comments(count)
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any

  const run: RunLog = {
    id: row.id as string,
    memberId: row.member_id as string,
    memberName: row.members?.name ?? '',
    memberAvatarUrl: row.members?.avatar_url ?? '',
    memberInstaId: row.members?.insta_id ?? '',
    date: row.date as string,
    runTime: (row.run_time as string | null) ?? null,
    durationMin: row.duration_min as number,
    title: row.title as string,
    thoughtBefore: row.thought_before as string,
    thoughtDuring: row.thought_during as string,
    thoughtAfter: row.thought_after as string,
    location: row.location as string,
    photoUrl: row.photo_url as string,
    rawPhotoUrl: (row.photo_url as string | null) ?? null,
    createdAt: row.created_at as string,
    likeCount: (row.likes?.[0]?.count as number) ?? 0,
    commentCount: (row.comments?.[0]?.count as number) ?? 0,
  }
  return NextResponse.json(run)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const memberId = await getAuthMemberId(supabase)
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isOwner = await verifyOwnership(supabase, id, memberId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('run_logs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const memberId = await getAuthMemberId(supabase)
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isOwner = await verifyOwnership(supabase, id, memberId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as RunLogInput
  const { data, error } = await supabase
    .from('run_logs')
    .update({
      date: body.date,
      run_time: body.runTime ?? null,
      duration_min: body.durationMin,
      title: body.title,
      thought_before: body.thoughtBefore,
      thought_during: body.thoughtDuring,
      thought_after: body.thoughtAfter,
      location: body.location,
      photo_url: body.photoUrl,
    })
    .eq('id', id)
    .select('id, member_id, date, run_time, duration_min, title, thought_before, thought_during, thought_after, location, photo_url, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
