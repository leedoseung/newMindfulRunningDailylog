import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { CompletionSheet } from '@/presentation/components/mission/completion-sheet'

describe('CompletionSheet', () => {
  it('renders title and certificate link', () => {
    render(<CompletionSheet open participationId="p1" onClose={() => {}} />)
    expect(screen.getByText(/100일 완주/)).toBeInTheDocument()
    expect(screen.getByText(/인증서/)).toBeInTheDocument()
  })

  it('closes on backdrop click', () => {
    const onClose = vi.fn()
    render(<CompletionSheet open participationId="p1" onClose={onClose} />)
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders nothing when closed', () => {
    const { container } = render(<CompletionSheet open={false} participationId="p1" onClose={() => {}} />)
    expect(container.firstChild).toBeNull()
  })
})
