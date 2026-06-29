// src/app/api/admin/participations/route.ts
import { NextResponse } from 'next/server'
import { requireAdmin, AdminGuardError } from '@/infrastructure/supabase/require-admin'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'

type Row = {
  id: string
  challenge_id: string
  passes_remaining: number
  failed_at: string | null
  completed_at: string | null
  challenge: { title: string; start_date: string; duration_days: number } | null
}

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

  // memberId 쿼리 파라미터 없으면 400
  const memberId = new URL(req.url).searchParams.get('memberId')
  if (!memberId) return NextResponse.json({ error: 'MISSING_MEMBER_ID' }, { status: 400 })

  // 서비스 롤 admin client만 사용 (cookie SSR 클라이언트 사용 금지)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('challenge_participations')
    .select('id, challenge_id, passes_remaining, failed_at, completed_at, challenge:challenges(title, start_date, duration_days)')
    .eq('member_id', memberId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // DB 컬럼명 → camelCase 변환 후 반환
  const participations = (data as unknown as Row[]).map((r) => ({
    id: r.id,
    challengeId: r.challenge_id,
    challengeTitle: r.challenge?.title ?? '',
    startDate: r.challenge?.start_date ?? '',
    durationDays: r.challenge?.duration_days ?? 0,
    passesRemaining: r.passes_remaining,
    failedAt: r.failed_at,
    completedAt: r.completed_at,
  }))
  return NextResponse.json({ participations })
}
