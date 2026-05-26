import { render, screen, fireEvent } from '@testing-library/react'
import { DurationPicker } from '@/presentation/components/form/duration-picker'
import { vi } from 'vitest'

describe('DurationPicker', () => {
  it('displays current value', () => {
    render(<DurationPicker value={30} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('30')).toBeInTheDocument()
  })

  it('+1 increments value', () => {
    const onChange = vi.fn()
    render(<DurationPicker value={30} onChange={onChange} />)
    fireEvent.click(screen.getByText('+1'))
    expect(onChange).toHaveBeenCalledWith(31)
  })

  it('-1 decrements value', () => {
    const onChange = vi.fn()
    render(<DurationPicker value={30} onChange={onChange} />)
    fireEvent.click(screen.getByText('-1'))
    expect(onChange).toHaveBeenCalledWith(29)
  })

  it('does not go below 1', () => {
    const onChange = vi.fn()
    render(<DurationPicker value={1} onChange={onChange} />)
    fireEvent.click(screen.getByText('-1'))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('+10 increments by 10', () => {
    const onChange = vi.fn()
    render(<DurationPicker value={30} onChange={onChange} />)
    fireEvent.click(screen.getByText('+10'))
    expect(onChange).toHaveBeenCalledWith(40)
  })
})
