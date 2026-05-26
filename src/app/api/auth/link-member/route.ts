import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId } = await req.json() as { memberId: string }

  const { data: existing } = await supabase
    .from('members')
    .select('auth_user_id')
    .eq('id', memberId)
    .single()

  if (existing?.auth_user_id && existing.auth_user_id !== user.id) {
    return NextResponse.json(
      { error: '이미 다른 계정에서 사용 중인 이름입니다' },
      { status: 409 }
    )
  }

  const { error: dbError } = await supabase
    .from('members')
    .update({ auth_user_id: user.id })
    .eq('id', memberId)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const { error: metaError } = await supabase.auth.updateUser({
    data: { member_id: memberId },
  })

  if (metaError) return NextResponse.json({ error: metaError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
