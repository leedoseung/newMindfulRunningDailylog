import { describe, it, expect } from 'vitest'
import { getRedirectPath } from '@/lib/auth-redirect'

describe('getRedirectPath', () => {
  it('redirects to /login when no user on protected route', () => {
    expect(getRedirectPath('/', undefined, undefined)).toBe('/login')
    expect(getRedirectPath('/leaderboard', undefined, undefined)).toBe('/login')
    expect(getRedirectPath('/record', undefined, undefined)).toBe('/login')
  })

  it('does not redirect for public routes without user', () => {
    expect(getRedirectPath('/login', undefined, undefined)).toBeNull()
    expect(getRedirectPath('/auth/callback', undefined, undefined)).toBeNull()
  })

  it('redirects to /link-member when user has no memberId', () => {
    expect(getRedirectPath('/', 'user-123', undefined)).toBe('/link-member')
    expect(getRedirectPath('/record', 'user-123', undefined)).toBe('/link-member')
  })

  it('does not redirect /link-member itself when user has no memberId', () => {
    expect(getRedirectPath('/link-member', 'user-123', undefined)).toBeNull()
  })

  it('does not redirect when user has memberId', () => {
    expect(getRedirectPath('/', 'user-123', 'member-456')).toBeNull()
    expect(getRedirectPath('/record', 'user-123', 'member-456')).toBeNull()
    expect(getRedirectPath('/leaderboard', 'user-123', 'member-456')).toBeNull()
  })

  it('does not redirect authenticated user visiting /admin/* (even without memberId)', () => {
    // Authenticated admin users pass through; layout's requireAdmin() handles non-admin 404.
    expect(getRedirectPath('/admin/mission-fix', 'user-123', 'member-456')).toBeNull()
    expect(getRedirectPath('/admin/mission-fix', 'user-123', undefined)).toBeNull()
  })

  it('redirects unauthenticated user visiting /admin/* to /login', () => {
    expect(getRedirectPath('/admin/mission-fix', undefined, undefined)).toBe('/login')
  })
})
