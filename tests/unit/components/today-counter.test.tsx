import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { TodayCounter } from '@/presentation/components/mission/today-counter'

describe('TodayCounter (delta-add mode)', () => {
  it('renders cumulative count and goal', () => {
    render(<TodayCounter count={47} goal={100} onAdd={() => {}} />)
    expect(screen.getByText('47')).toBeInTheDocument()
    expect(screen.getByText('/ 100')).toBeInTheDocument()
  })

  it('add input starts empty and 저장 is disabled', () => {
    render(<TodayCounter count={47} goal={100} onAdd={() => {}} />)
    const input = screen.getByLabelText('이번에 추가할 횟수') as HTMLInputElement
    expect(input.value).toBe('')
    expect(screen.getByText('저장')).toBeDisabled()
  })

  it('calls onAdd with the delta when 저장 clicked', () => {
    const onAdd = vi.fn()
    render(<TodayCounter count={20} goal={100} onAdd={onAdd} />)
    fireEvent.change(screen.getByLabelText('이번에 추가할 횟수'), { target: { value: '30' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onAdd).toHaveBeenCalledWith(30, null)
  })

  it('rejects 0 or negative deltas', () => {
    const onAdd = vi.fn()
    render(<TodayCounter count={0} goal={100} onAdd={onAdd} />)
    fireEvent.change(screen.getByLabelText('이번에 추가할 횟수'), { target: { value: '0' } })
    expect(screen.getByText('저장')).toBeDisabled()
    fireEvent.click(screen.getByText('저장'))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('shows raw count and gold-bonus label when cumulative count > goal', () => {
    render(<TodayCounter count={150} goal={100} onAdd={() => {}} />)
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText(/골드 보너스 \+50/)).toBeInTheDocument()
  })

  it('opens absolute-edit mode when 오늘 누적 횟수 수정 clicked and saves via onSetAbsolute', () => {
    const onSetAbsolute = vi.fn()
    render(<TodayCounter count={42} goal={100} onAdd={() => {}} onSetAbsolute={onSetAbsolute} />)
    fireEvent.click(screen.getByText('오늘 누적 횟수 수정'))
    fireEvent.change(screen.getByLabelText('누적 런지 횟수'), { target: { value: '90' } })
    fireEvent.click(screen.getByText('덮어쓰기 저장'))
    expect(onSetAbsolute).toHaveBeenCalledWith(90, null)
  })

  it('rest button is gated by restAvailable', () => {
    render(
      <TodayCounter
        count={0}
        goal={100}
        onAdd={() => {}}
        onRest={() => {}}
        restAvailable={false}
      />
    )
    expect(screen.getByText('이번 주 휴식 끝')).toBeDisabled()
  })
})
