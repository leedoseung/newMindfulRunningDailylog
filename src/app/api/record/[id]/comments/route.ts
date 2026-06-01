import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'
import type { Comment } from '@/domain/entities/comment'

type CommentRow = {
  id: string
  member_id: string
  body: string
  created_at: string
  members: { name: string; avatar_url: string | null } | null
}

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    memberId: row.member_id,
    memberName: row.members?.name ?? '',
    memberAvatarUrl: row.members?.avatar_url ?? '',
    body: row.body,
    createdAt: row.created_at,
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: runLogId } = await params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('comments')
    .select('id, member_id, body, created_at, members(name, avatar_url)')
    .eq('run_log_id', runLogId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments: (data as unknown as CommentRow[]).map(toComment) })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: runLogId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const memberId = (user.user_metadata?.member_id as string | undefined) ?? null
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let parsed: { body?: unknown }
  try {
    parsed = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다' }, { status: 400 })
  }
  const body = typeof parsed.body === 'string' ? parsed.body : ''
  if (!body || body.trim().length < 1 || body.trim().length > 500) {
    return NextResponse.json({ error: '댓글은 1자 이상 500자 이하여야 합니다' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('comments')
    .insert({ run_log_id: runLogId, member_id: memberId, body: body.trim() })
    .select('id, member_id, body, created_at, members(name, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(toComment(data as unknown as CommentRow), { status: 201 })
}
