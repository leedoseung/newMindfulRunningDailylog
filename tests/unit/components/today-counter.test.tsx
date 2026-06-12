import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { TodayCounter } from '@/presentation/components/mission/today-counter'

describe('TodayCounter', () => {
  it('renders current count and progress', () => {
    render(<TodayCounter count={47} goal={100} onAdd={() => {}} />)
    expect(screen.getByText('47')).toBeInTheDocument()
    expect(screen.getByText(/100/)).toBeInTheDocument()
  })

  it('calls onAdd with 10 when +10 button clicked', () => {
    const onAdd = vi.fn()
    render(<TodayCounter count={47} goal={100} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('+10'))
    expect(onAdd).toHaveBeenCalledWith(10)
  })

  it('calls onAdd with 20 when +20 button clicked', () => {
    const onAdd = vi.fn()
    render(<TodayCounter count={47} goal={100} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('+20'))
    expect(onAdd).toHaveBeenCalledWith(20)
  })

  it('calls onAdd with 50 when +50 button clicked', () => {
    const onAdd = vi.fn()
    render(<TodayCounter count={47} goal={100} onAdd={onAdd} />)
    fireEvent.click(screen.getByText('+50'))
    expect(onAdd).toHaveBeenCalledWith(50)
  })

  it('disables buttons when disabled prop set', () => {
    const onAdd = vi.fn()
    render(<TodayCounter count={47} goal={100} onAdd={onAdd} disabled />)
    fireEvent.click(screen.getByText('+10'))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('caps display count at goal when count > goal', () => {
    render(<TodayCounter count={150} goal={100} onAdd={() => {}} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })
})
