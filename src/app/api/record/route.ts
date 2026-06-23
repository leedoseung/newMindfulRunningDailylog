import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { SaveRunLogUseCase } from '@/application/use-cases/save-run-log'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { createServerClient } from '@/infrastructure/supabase/client'
import type { RunLogInput } from '@/domain/entities/run-log-input'
import { revalidateDiaryMonth } from '@/app/api/_lib/diary-revalidate'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: RunLogInput = await req.json()

  // JWT metadata의 member_id와 요청 body의 memberId가 일치해야 함
  const linkedMemberId = user.user_metadata?.member_id as string | undefined
  if (!linkedMemberId || linkedMemberId !== body.memberId) {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
  }

  try {
    const repo = new SupabaseRunLogRepository(supabase)
    const useCase = new SaveRunLogUseCase(repo)
    const runLog = await useCase.execute(body)
    revalidateDiaryMonth(runLog.memberId, runLog.date)
    revalidateTag('leaderboard', 'max')
    return NextResponse.json(runLog, { status: 201 })
  } catch (err) {
    const msg = String(err)
    if (msg.includes('row-level security') || msg.includes('violates')) {
      return NextResponse.json(
        { error: '계정 연결 오류입니다. 로그아웃 후 다시 로그인해주세요.' },
        { status: 403 }
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
