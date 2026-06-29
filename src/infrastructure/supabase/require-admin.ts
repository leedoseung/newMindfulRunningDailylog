// src/infrastructure/supabase/require-admin.ts
import { getServerAuth } from './server-auth'
import { createAdminClient } from './admin-client'

export class AdminGuardError extends Error {
  constructor(public code: 'UNAUTHENTICATED' | 'NOT_ADMIN') {
    super(code)
  }
}

export async function requireAdmin(): Promise<{ userId: string; memberId: string }> {
  const auth = await getServerAuth()
  if (!auth || !auth.memberId) throw new AdminGuardError('UNAUTHENTICATED')

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('members')
    .select('is_admin')
    .eq('id', auth.memberId)
    .single()

  if (error || !data?.is_admin) throw new AdminGuardError('NOT_ADMIN')

  return { userId: auth.userId, memberId: auth.memberId }
}
