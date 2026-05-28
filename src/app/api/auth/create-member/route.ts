import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const name: string =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    (user.email?.split('@')[0] ?? '새 멤버')

  const avatarUrl: string =
    (user.user_metadata?.avatar_url as string | undefined) ?? ''

  const { data, error } = await supabase
    .from('members')
    .insert({ name, avatar_url: avatarUrl, auth_user_id: user.id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const memberId = (data as { id: string }).id
  return NextResponse.json({ memberId })
}
