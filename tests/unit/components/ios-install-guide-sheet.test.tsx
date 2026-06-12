import { render, screen } from '@testing-library/react'
import { IOSInstallGuideSheet } from '@/presentation/components/mission/ios-install-guide-sheet'

describe('IOSInstallGuideSheet', () => {
  it('renders guide when open', () => {
    render(<IOSInstallGuideSheet open onClose={() => {}} />)
    expect(screen.getByText(/홈 화면에 추가/)).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    const { container } = render(<IOSInstallGuideSheet open={false} onClose={() => {}} />)
    expect(container.firstChild).toBeNull()
  })
})
