const PUBLIC_PREFIXES = ['/login', '/auth/']

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export function getRedirectPath(
  pathname: string,
  userId: string | undefined,
  memberId: string | undefined,
): string | null {
  if (isPublic(pathname)) return null
  if (!userId) return '/login'
  if (!memberId && !pathname.startsWith('/link-member') && !pathname.startsWith('/api/auth/')) return '/link-member'
  return null
}
