import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProgressBar } from '../progress'

describe('ProgressBar', () => {
  it('renders correctly', () => {
    render(<ProgressBar value={50} data-testid="progress" />)
    expect(screen.getByTestId('progress')).toBeInTheDocument()
  })

  it('calculates percentage correctly', () => {
    render(<ProgressBar value={50} max={100} data-testid="progress" />)
    const progressBar = screen.getByTestId('progress')
    const fill = progressBar.querySelector('.bg-\\[var\\(--color-primary-500\\)\\]')
    expect(fill).toHaveStyle({ width: '50%' })
  })

  it('clamps percentage between 0 and 100', () => {
    const { rerender } = render(<ProgressBar value={-10} max={100} data-testid="progress" />)
    let fill = screen
      .getByTestId('progress')
      .querySelector('.bg-\\[var\\(--color-primary-500\\)\\]')
    expect(fill).toHaveStyle({ width: '0%' })

    rerender(<ProgressBar value={150} max={100} data-testid="progress" />)
    fill = screen.getByTestId('progress').querySelector('.bg-\\[var\\(--color-primary-500\\)\\]')
    expect(fill).toHaveStyle({ width: '100%' })
  })

  it('shows label when showLabel is true', () => {
    render(<ProgressBar value={75} showLabel />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('does not show label when showLabel is false', () => {
    render(<ProgressBar value={75} showLabel={false} />)
    expect(screen.queryByText('75%')).not.toBeInTheDocument()
  })

  it('uses default max of 100', () => {
    render(<ProgressBar value={25} showLabel />)
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<ProgressBar value={50} ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(<ProgressBar value={50} className="custom-class" data-testid="progress" />)
    expect(screen.getByTestId('progress')).toHaveClass('custom-class')
  })
})
