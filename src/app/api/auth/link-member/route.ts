import { NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId } = await req.json() as { memberId: string }

  const { data: existing } = await supabase
    .from('members')
    .select('auth_user_id, avatar_url')
    .eq('id', memberId)
    .single()

  if (existing?.auth_user_id && existing.auth_user_id !== user.id) {
    return NextResponse.json(
      { error: '이미 다른 계정에서 사용 중인 이름입니다' },
      { status: 409 }
    )
  }

  // 카카오 프로필 사진 — 멤버에 아직 사진이 없을 때만 적용
  const kakaoAvatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? ''
  const shouldSetAvatar = !existing?.avatar_url && kakaoAvatarUrl

  const { error: dbError } = await supabase
    .from('members')
    .update({
      auth_user_id: user.id,
      ...(shouldSetAvatar ? { avatar_url: kakaoAvatarUrl } : {}),
    })
    .eq('id', memberId)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
