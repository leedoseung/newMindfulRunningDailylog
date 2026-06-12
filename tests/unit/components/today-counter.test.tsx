import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { TodayCounter } from '@/presentation/components/mission/today-counter'

describe('TodayCounter', () => {
  it('renders current count and goal', () => {
    render(<TodayCounter count={47} goal={100} onSave={() => {}} />)
    expect(screen.getByText('47')).toBeInTheDocument()
    expect(screen.getByText(/100/)).toBeInTheDocument()
  })

  it('initialises the input with the current count', () => {
    render(<TodayCounter count={47} goal={100} onSave={() => {}} />)
    const input = screen.getByLabelText('런지 횟수') as HTMLInputElement
    expect(input.value).toBe('47')
  })

  it('save button disabled when the input matches the saved count', () => {
    render(<TodayCounter count={47} goal={100} onSave={() => {}} />)
    expect(screen.getByText('저장')).toBeDisabled()
  })

  it('calls onSave with the absolute count entered when 저장 clicked', () => {
    const onSave = vi.fn()
    render(<TodayCounter count={47} goal={100} onSave={onSave} />)
    fireEvent.change(screen.getByLabelText('런지 횟수'), { target: { value: '120' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).toHaveBeenCalledWith(120)
  })

  it('allows values greater than the goal', () => {
    const onSave = vi.fn()
    render(<TodayCounter count={0} goal={100} onSave={onSave} />)
    fireEvent.change(screen.getByLabelText('런지 횟수'), { target: { value: '250' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).toHaveBeenCalledWith(250)
  })

  it('does not call onSave when disabled prop set', () => {
    const onSave = vi.fn()
    render(<TodayCounter count={47} goal={100} onSave={onSave} disabled />)
    fireEvent.change(screen.getByLabelText('런지 횟수'), { target: { value: '60' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('caps display count at goal when count > goal', () => {
    render(<TodayCounter count={150} goal={100} onSave={() => {}} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('rejects negative input with an error message', () => {
    const onSave = vi.fn()
    render(<TodayCounter count={0} goal={100} onSave={onSave} />)
    fireEvent.change(screen.getByLabelText('런지 횟수'), { target: { value: '-5' } })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByText('저장'))
    expect(onSave).not.toHaveBeenCalled()
  })
})
