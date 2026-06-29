// tests/unit/components/admin/admin-entry-button.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/infrastructure/supabase/require-admin', () => ({
  requireAdmin: vi.fn(),
  AdminGuardError: class extends Error { constructor(public code: string) { super(code) } },
}))

import { AdminEntryButton } from '@/presentation/components/admin/admin-entry-button'
import { requireAdmin, AdminGuardError } from '@/infrastructure/supabase/require-admin'

beforeEach(() => vi.clearAllMocks())

describe('<AdminEntryButton>', () => {
  it('renders link when requireAdmin resolves', async () => {
    ;(requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'u', memberId: 'm' })
    const el = await AdminEntryButton()
    render(el as React.ReactElement)
    const link = screen.getByRole('link', { name: /관리자/ })
    expect(link).toHaveAttribute('href', '/admin/mission-fix')
  })

  it('renders null when AdminGuardError thrown', async () => {
    ;(requireAdmin as ReturnType<typeof vi.fn>).mockRejectedValue(new AdminGuardError('NOT_ADMIN'))
    const el = await AdminEntryButton()
    expect(el).toBeNull()
  })

  it('renders null when AdminGuardError UNAUTHENTICATED', async () => {
    ;(requireAdmin as ReturnType<typeof vi.fn>).mockRejectedValue(new AdminGuardError('UNAUTHENTICATED'))
    const el = await AdminEntryButton()
    expect(el).toBeNull()
  })
})
