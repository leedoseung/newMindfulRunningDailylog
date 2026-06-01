import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/infrastructure/supabase/client'
import { createAdminClient } from '@/infrastructure/supabase/admin-client'
import type { DonationRecord } from '@/domain/entities/donation'

type DonationRow = {
  id: string
  member_id: string
  year_month: string
  duration_min: number
  amount: number
  created_at: string
  members: { name: string; avatar_url: string | null } | null
}

function toDonationRecord(row: DonationRow): DonationRecord {
  return {
    id: row.id,
    memberId: row.member_id,
    memberName: row.members?.name ?? '',
    memberAvatarUrl: row.members?.avatar_url ?? '',
    yearMonth: row.year_month,
    durationMin: row.duration_min,
    amount: row.amount,
    createdAt: row.created_at,
  }
}

export async function GET(req: NextRequest) {
  const month = new URL(req.url).searchParams.get('month')
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month query param required (YYYY-MM)' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('donations')
    .select('id, member_id, year_month, duration_min, amount, created_at, members(name, avatar_url)')
    .eq('year_month', month)
    .order('amount', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ donations: (data as unknown as DonationRow[]).map(toDonationRecord) })
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const memberId = (user.user_metadata?.member_id as string | undefined) ?? null
  if (!memberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let parsed: { yearMonth?: unknown; durationMin?: unknown; amount?: unknown }
  try { parsed = await req.json() } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다' }, { status: 400 })
  }
  const { yearMonth, durationMin, amount } = parsed
  if (
    typeof yearMonth !== 'string' || !/^\d{4}-\d{2}$/.test(yearMonth) ||
    typeof durationMin !== 'number' || durationMin <= 0 ||
    typeof amount !== 'number' || amount <= 0
  ) {
    return NextResponse.json({ error: '잘못된 입력입니다' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: inserted, error: insertError } = await admin
    .from('donations')
    .insert({ member_id: memberId, year_month: yearMonth, duration_min: durationMin, amount })
    .select('id, member_id, year_month, duration_min, amount, created_at, members(name, avatar_url)')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: existing, error: fetchError } = await admin
        .from('donations')
        .select('id, member_id, year_month, duration_min, amount, created_at, members(name, avatar_url)')
        .eq('member_id', memberId)
        .eq('year_month', yearMonth)
        .single()
      if (fetchError || !existing) return NextResponse.json({ error: '조회 실패' }, { status: 500 })
      return NextResponse.json(toDonationRecord(existing as unknown as DonationRow))
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(toDonationRecord(inserted as unknown as DonationRow), { status: 201 })
}
