import { ImageResponse } from 'next/og'
import { createServerClient } from '@/infrastructure/supabase/client'
import { SupabaseMemberRepository } from '@/infrastructure/supabase/member-repository'
import { SupabaseRunLogRepository } from '@/infrastructure/supabase/run-log-repository'
import { parseYearMonth, isValidMonth } from '@/domain/diary/month-range'

export const runtime = 'nodejs'

// Allowlist of trusted photo hosts (defense-in-depth against SSRF).
// Derived from NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_R2_PUBLIC_URL in .env.local.
const ALLOWED_PHOTO_HOSTS = [
  'hirljfwzignkehulchpj.supabase.co', // Supabase Storage
  'pub-f85277209ed54f1da9f285aad41c', // Cloudflare R2 public bucket (prefix match)
] as const

function isAllowedPhotoUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    if (ALLOWED_PHOTO_HOSTS.some(h => u.hostname === h || u.hostname.startsWith(h))) return true
    return false
  } catch {
    return false
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ memberId: string; yearMonth: string }> },
): Promise<Response> {
  const { memberId, yearMonth } = await params

  const parsed = parseYearMonth(yearMonth)
  if (!parsed || !isValidMonth(parsed.year, parsed.month)) {
    return new Response('Not Found', { status: 404 })
  }

  const supabase = await createServerClient()
  const memberRepo = new SupabaseMemberRepository(supabase)
  const runLogRepo = new SupabaseRunLogRepository(supabase)

  const member = await memberRepo.getById(memberId)
  if (!member) {
    return new Response('Not Found', { status: 404 })
  }

  const runs = await runLogRepo.getByMemberAndMonth(memberId, parsed.year, parsed.month)
  const candidate = runs.find((r) => r.photoUrl)?.photoUrl
  const firstPhotoUrl = candidate && isAllowedPhotoUrl(candidate) ? candidate : null

  const { year, month } = parsed
  const label = `${year}.${String(month).padStart(2, '0')} 일기`

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: firstPhotoUrl
            ? 'transparent'
            : 'linear-gradient(135deg,#FB7185,#7C3AED)',
          overflow: 'hidden',
        }}
      >
        {/* Background photo layer */}
        {firstPhotoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firstPhotoUrl}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '1200px',
              height: '630px',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        )}

        {/* Dark gradient overlay when photo is present */}
        {firstPhotoUrl && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '1200px',
              height: '630px',
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)',
              display: 'flex',
            }}
          />
        )}

        {/* Foreground content */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          {/* Member name label */}
          <div
            style={{
              fontSize: '28px',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: '0.05em',
            }}
          >
            {member.name}
          </div>

          {/* Main title */}
          <div
            style={{
              fontSize: '84px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-2px',
              lineHeight: 1.1,
            }}
          >
            {label}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    },
  )
}
