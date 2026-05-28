import { NextResponse } from 'next/server'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { createServerClient } from '@/infrastructure/supabase/client'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const repo = new SupabaseRunLogRepository(supabase)
    const today = new Date().toISOString().split('T')[0]!
    const runs = await repo.getByDate(today)
    return NextResponse.json(runs)
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch today runs' },
      { status: 500 }
    )
  }
}
