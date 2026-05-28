import { NextRequest, NextResponse } from 'next/server'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { createServerClient } from '@/infrastructure/supabase/client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

    const supabase = await createServerClient()
    const repo = new SupabaseRunLogRepository(supabase)
    const runs = await repo.getRunsPage(offset, limit)

    return NextResponse.json({ runs, hasMore: runs.length === limit })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 })
  }
}
