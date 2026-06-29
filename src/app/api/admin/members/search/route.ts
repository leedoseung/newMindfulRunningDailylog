// src/app/api/admin/members/search/route.ts
import { NextResponse } from 'next/server'
import { requireAdmin, AdminGuardError } from '@/infrastructure/supabase/require-admin'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'

export async function GET(req: Request) {
  // 어드민 인증 — 미인증 401, 비어드민 403
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof AdminGuardError) {
      const status = err.code === 'UNAUTHENTICATED' ? 401 : 403
      return NextResponse.json({ error: err.code }, { status })
    }
    throw err
  }

  // q 파라미터 누락 → 400
  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'MISSING_Q' }, { status: 400 })

  // 서비스 롤 admin client만 사용 (cookie SSR 클라이언트 사용 금지)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('members')
    .select('id, name, generation')
    .ilike('name', `%${q}%`)
    .order('name', { ascending: true })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data ?? [] })
}
