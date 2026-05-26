import { NextResponse } from 'next/server'
import { GetRecentRunsUseCase } from '@/application/use-cases/get-recent-runs'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { createServerClient } from '@/infrastructure/supabase/client'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const repo = new SupabaseRunLogRepository(supabase)
    const useCase = new GetRecentRunsUseCase(repo)
    const runs = await useCase.execute(1)
    return NextResponse.json(runs)
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch today runs' },
      { status: 500 }
    )
  }
}
