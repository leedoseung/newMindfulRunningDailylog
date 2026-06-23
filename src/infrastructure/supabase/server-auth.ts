import { headers } from 'next/headers'
import { createServerClient } from './client'

const USER_HDR = 'x-mr-user-id'
const MEMBER_HDR = 'x-mr-member-id'

export interface ServerAuth {
  userId: string
  memberId: string | null
}

/**
 * Read pre-validated auth from middleware-injected request headers.
 * Middleware verifies JWT locally via getClaims() and injects headers,
 * so route handlers/pages skip the /auth/v1/user network round trip.
 *
 * Returns null when middleware did not set headers (DEV_BYPASS, unauthenticated,
 * or a path the matcher excluded). Callers should fall back to getAuthFallback().
 */
export async function getAuthFromHeaders(): Promise<ServerAuth | null> {
  const h = await headers()
  const userId = h.get(USER_HDR)
  if (!userId) return null
  return { userId, memberId: h.get(MEMBER_HDR) }
}

/**
 * Slow path — calls supabase.auth.getUser() (one network round trip).
 * Use only when getAuthFromHeaders() returns null.
 */
export async function getAuthFallback(): Promise<ServerAuth | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const memberId = (user.user_metadata?.member_id as string | undefined) ?? null
  return { userId: user.id, memberId }
}

/**
 * Header-first auth with one-time fallback. Preferred for routes/pages.
 */
export async function getServerAuth(): Promise<ServerAuth | null> {
  return (await getAuthFromHeaders()) ?? (await getAuthFallback())
}
