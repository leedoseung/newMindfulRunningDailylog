// src/app/admin/layout.tsx
import { notFound } from 'next/navigation'
import { requireAdmin, AdminGuardError } from '@/infrastructure/supabase/require-admin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof AdminGuardError) notFound()
    throw err
  }
  return <>{children}</>
}
