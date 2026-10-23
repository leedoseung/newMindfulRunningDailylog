import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { CompletionSheet } from '@/presentation/components/mission/completion-sheet'

describe('CompletionSheet', () => {
  it('renders S1 (100일 × 100개) copy from props', () => {
    render(
      <CompletionSheet open participationId="p1" durationDays={100} goalPerDay={100} onClose={() => {}} />,
    )
    expect(screen.getByText(/100일 완주/)).toBeInTheDocument()
    expect(screen.getByText(/10,000개의 런지/)).toBeInTheDocument()
    expect(screen.getByText(/인증서/)).toBeInTheDocument()
  })

  it('renders S2 (30일 × 100개) copy from props', () => {
    render(
      <CompletionSheet open participationId="p1" durationDays={30} goalPerDay={100} onClose={() => {}} />,
    )
    expect(screen.getByText(/30일 완주/)).toBeInTheDocument()
    expect(screen.getByText(/3,000개의 런지/)).toBeInTheDocument()
  })

  it('closes on backdrop click', () => {
    const onClose = vi.fn()
    render(
      <CompletionSheet open participationId="p1" durationDays={100} goalPerDay={100} onClose={onClose} />,
    )
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <CompletionSheet open={false} participationId="p1" durationDays={100} goalPerDay={100} onClose={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
