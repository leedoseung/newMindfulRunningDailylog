import { ImageResponse } from 'next/og'
import { createServerClient } from '@/infrastructure/supabase/client'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ participationId: string }> }

export default async function OgImage({ params }: Props) {
  const { participationId } = await params

  let durationDays = 100
  let goalPerDay = 100
  try {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('challenge_participations')
      .select('challenges!inner(duration_days, goal_per_day)')
      .eq('id', participationId)
      .maybeSingle()
    const ch = (data as unknown as { challenges?: { duration_days: number; goal_per_day: number } } | null)?.challenges
    if (ch) {
      durationDays = ch.duration_days
      goalPerDay = ch.goal_per_day
    }
  } catch {
    // keep defaults on any infra error — OG image never blocks the share.
  }

  const total = (durationDays * goalPerDay).toLocaleString()

  return new ImageResponse(
    (
      <div style={{
        display: 'flex', flexDirection: 'column',
        background: '#F7F7F5', width: '100%', height: '100%',
        padding: 80, justifyContent: 'space-between',
        fontFamily: 'sans-serif',
      }}>
        <div style={{ fontSize: 24, color: '#888' }}>마인드풀러닝</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 96, fontWeight: 700, color: '#111', letterSpacing: '-0.03em' }}>{durationDays}일 완주</div>
          <div style={{ fontSize: 28, color: '#555', marginTop: 16 }}>매일 {goalPerDay}개 × {durationDays}일 = {total}개의 런지</div>
        </div>
        <div style={{ fontSize: 20, color: '#b8231f', letterSpacing: '0.1em' }}>CERTIFICATE</div>
      </div>
    ),
    size
  )
}
