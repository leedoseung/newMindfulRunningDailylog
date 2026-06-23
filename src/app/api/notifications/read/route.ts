import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'
import { getServerAuth } from '@/infrastructure/supabase/server-auth'

export async function PATCH() {
  const auth = await getServerAuth()
  if (!auth?.memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const memberId = auth.memberId

  const admin = createAdminClient()
  const { error } = await admin
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_member_id', memberId)
    .eq('is_read', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
