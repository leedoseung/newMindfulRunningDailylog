import { createServerClient } from '@/infrastructure/supabase/client'
import { NextResponse } from 'next/server'

export async function PUT(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberId = user.user_metadata?.member_id as string | undefined
  if (!memberId) return NextResponse.json({ error: 'No member linked' }, { status: 400 })

  const { avatarUrl } = await req.json() as { avatarUrl?: string }
  if (!avatarUrl) return NextResponse.json({ error: 'avatarUrl required' }, { status: 400 })

  const { error } = await supabase
    .from('members')
    .update({ avatar_url: avatarUrl })
    .eq('id', memberId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ avatarUrl })
}
