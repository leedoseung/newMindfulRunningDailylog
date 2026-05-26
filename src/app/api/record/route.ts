import { NextResponse } from 'next/server'
import { SaveRunLogUseCase } from '@/application/use-cases/save-run-log'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { createServerClient } from '@/infrastructure/supabase/client'
import type { RunLogInput } from '@/domain/entities/run-log-input'

export async function POST(req: Request) {
  try {
    const body: RunLogInput = await req.json()
    const supabase = await createServerClient()
    const repo = new SupabaseRunLogRepository(supabase)
    const useCase = new SaveRunLogUseCase(repo)
    const runLog = await useCase.execute(body)
    return NextResponse.json(runLog, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
