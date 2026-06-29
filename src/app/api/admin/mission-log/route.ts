// src/app/api/admin/mission-log/route.ts
import { NextResponse } from 'next/server'
import { requireAdmin, AdminGuardError } from '@/infrastructure/supabase/require-admin'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'
import { AdminMissionLogRepository } from '@/infrastructure/supabase/admin-mission-log-repository'

// 요청 바디 판별 유니온 타입
type Body =
  | { op: 'setCount'; participationId: string; logDate: string; count: number; note?: string | null }
  | { op: 'setRestDay'; participationId: string; logDate: string }
  | { op: 'setUsedPass'; participationId: string; logDate: string; usedPass: boolean }
  | { op: 'adjustPasses'; participationId: string; delta: 1 | -1 }

// 요청 바디 유효성 검사 (런타임 타입 가드)
function isValid(b: unknown): b is Body {
  if (!b || typeof b !== 'object') return false
  const o = b as Record<string, unknown>
  switch (o.op) {
    case 'setCount':
      return typeof o.participationId === 'string' && typeof o.logDate === 'string' && typeof o.count === 'number'
    case 'setRestDay':
      return typeof o.participationId === 'string' && typeof o.logDate === 'string'
    case 'setUsedPass':
      return typeof o.participationId === 'string' && typeof o.logDate === 'string' && typeof o.usedPass === 'boolean'
    case 'adjustPasses':
      return typeof o.participationId === 'string' && (o.delta === 1 || o.delta === -1)
    default:
      return false
  }
}

export async function POST(req: Request) {
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

  // JSON 파싱 실패 → 400
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  // 바디 유효성 검사 실패 → 400
  if (!isValid(body)) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })

  // 서비스 롤 admin client만 사용 (cookie SSR 클라이언트 사용 금지)
  const repo = new AdminMissionLogRepository(createAdminClient())

  try {
    switch (body.op) {
      case 'setCount': {
        const log = await repo.setCount({
          participationId: body.participationId,
          logDate: body.logDate,
          count: body.count,
          note: body.note ?? null,
        })
        return NextResponse.json({ log })
      }
      case 'setRestDay': {
        const log = await repo.setRestDay({
          participationId: body.participationId,
          logDate: body.logDate,
        })
        return NextResponse.json({ log })
      }
      case 'setUsedPass': {
        const log = await repo.setUsedPass({
          participationId: body.participationId,
          logDate: body.logDate,
          usedPass: body.usedPass,
        })
        return NextResponse.json({ log })
      }
      case 'adjustPasses': {
        const { passesRemaining } = await repo.adjustPassesRemaining({
          participationId: body.participationId,
          delta: body.delta,
        })
        return NextResponse.json({ passesRemaining })
      }
      default:
        return NextResponse.json({ error: 'UNHANDLED_OP' }, { status: 500 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
