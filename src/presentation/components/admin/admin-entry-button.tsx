// src/presentation/components/admin/admin-entry-button.tsx
import Link from 'next/link'
import { requireAdmin, AdminGuardError } from '@/infrastructure/supabase/require-admin'

export async function AdminEntryButton() {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof AdminGuardError) return null
    throw err
  }

  return (
    <Link
      href="/admin/mission-fix"
      style={{
        display: 'inline-block',
        marginTop: 12,
        padding: '8px 14px',
        borderRadius: 8,
        background: '#111111',
        color: '#ffffff',
        fontSize: '0.85rem',
        fontWeight: 500,
        textDecoration: 'none',
      }}
    >
      관리자 — 기록 정정
    </Link>
  )
}
