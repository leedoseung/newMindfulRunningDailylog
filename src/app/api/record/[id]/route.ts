import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import type { RunLogInput } from '@/domain/entities/run-log-input'

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
      duration_min: body.durationMin,
      title: body.title,
      thought_before: body.thoughtBefore,
      thought_during: body.thoughtDuring,
      thought_after: body.thoughtAfter,
      location: body.location,
      photo_url: body.photoUrl,
    })
    .eq('id', id)
    .select('id, member_id, date, duration_min, title, thought_before, thought_during, thought_after, location, photo_url, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
