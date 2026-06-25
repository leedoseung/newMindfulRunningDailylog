import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getRedirectPath } from './lib/auth-redirect'

const USER_HDR = 'x-mr-user-id'
const MEMBER_HDR = 'x-mr-member-id'

export async function middleware(request: NextRequest) {
  if (process.env.DEV_BYPASS === 'true') {
    return NextResponse.next({ request })
  }

  // Strip any client-supplied auth headers BEFORE forwarding to handlers.
  const fwdHeaders = new Headers(request.headers)
  fwdHeaders.delete(USER_HDR)
  fwdHeaders.delete(MEMBER_HDR)

  let supabaseResponse = NextResponse.next({ request: { headers: fwdHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: fwdHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getClaims() verifies JWT locally (via cached JWKS), avoids /auth/v1/user round trip.
  // Fall back to getUser() if claims unavailable (e.g. legacy project state).
  let userId: string | undefined
  let memberId: string | undefined
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims()
  if (!claimsErr && claimsData?.claims) {
    userId = claimsData.claims.sub
    const meta = claimsData.claims.user_metadata as { member_id?: string } | undefined
    memberId = meta?.member_id
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id
    memberId = user?.user_metadata?.member_id as string | undefined
  }

  if (userId) fwdHeaders.set(USER_HDR, userId)
  if (memberId) fwdHeaders.set(MEMBER_HDR, memberId)

  const pathname = request.nextUrl.pathname
  const redirectTo = getRedirectPath(pathname, userId, memberId)
  if (redirectTo) {
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/|favicon\\.ico|sw\\.js|manifest\\.webmanifest|fonts/|audio/|images/|reports/|apple-touch-icon\\.png|icon-192\\.png|icon-512\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2|woff|ttf|ico|mp3|m4a|html)$).*)',
  ],
}
