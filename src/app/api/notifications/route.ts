import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'
import type { Notification, NotificationType, ChallengeAnnouncementPayload } from '@/domain/entities/notification'

async function getAuthMemberId(): Promise<string | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return (user.user_metadata?.member_id as string | undefined) ?? null
}

export async function GET() {
  const memberId = await getAuthMemberId()
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('notifications')
    .select('id, type, actor_name, actor_avatar_url, run_log_id, run_title, comment_body, payload, is_read, created_at')
    .eq('recipient_member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const notifications: Notification[] = (data ?? []).map(n => ({
    id: n.id as string,
    type: n.type as NotificationType,
    actorName: n.actor_name as string | null,
    actorAvatarUrl: n.actor_avatar_url as string | null,
    runLogId: n.run_log_id as string | null,
    runTitle: n.run_title as string | null,
    commentBody: n.comment_body as string | null,
    payload: (n.payload ?? null) as ChallengeAnnouncementPayload | null,
    isRead: n.is_read as boolean,
    createdAt: n.created_at as string,
  }))

  return NextResponse.json({ notifications })
}
