import { NextRequest, NextResponse } from 'next/server'
import { GetMemberRecordsUseCase } from '@/application/use-cases/get-member-records'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { createServerClient } from '@/infrastructure/supabase/client'

export async function GET(request: NextRequest) {
  const memberId = request.nextUrl.searchParams.get('memberId')
  if (!memberId) {
    return NextResponse.json({ error: 'memberId required' }, { status: 400 })
  }

  try {
    const supabase = await createServerClient()
    const repo = new SupabaseRunLogRepository(supabase)
    const useCase = new GetMemberRecordsUseCase(repo)
    const records = await useCase.execute(memberId)
    return NextResponse.json(records)
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch member records' },
      { status: 500 }
    )
  }
}
