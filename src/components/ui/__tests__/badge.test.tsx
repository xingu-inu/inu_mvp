import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StreakBadge } from '../badge'

describe('StreakBadge', () => {
  it('renders with count greater than 0', () => {
    render(<StreakBadge count={12} />)
    expect(screen.getByText('🔥')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('returns null when count is 0', () => {
    const { container } = render(<StreakBadge count={0} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('applies base styles', () => {
    render(<StreakBadge count={5} data-testid="badge" />)
    const badge = screen.getByTestId('badge')
    expect(badge).toHaveClass('rounded-full')
    expect(badge).toHaveClass('font-mono')
    expect(badge).toHaveClass('font-semibold')
  })

  it('applies animate class when animate prop is true', () => {
    render(<StreakBadge count={5} animate data-testid="badge" />)
    expect(screen.getByTestId('badge')).toHaveClass('animate-streak-pop')
  })

  it('does not apply animate class when animate prop is false', () => {
    render(<StreakBadge count={5} animate={false} data-testid="badge" />)
    expect(screen.getByTestId('badge')).not.toHaveClass('animate-streak-pop')
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<StreakBadge count={5} ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(<StreakBadge count={5} className="custom-class" data-testid="badge" />)
    expect(screen.getByTestId('badge')).toHaveClass('custom-class')
  })

  it('displays count with tabular-nums', () => {
    render(<StreakBadge count={123} />)
    const countSpan = screen.getByText('123')
    expect(countSpan).toHaveClass('tabular-nums')
  })

  it('passes through other props', () => {
    render(<StreakBadge count={5} aria-label="Streak count" data-testid="badge" />)
    expect(screen.getByTestId('badge')).toHaveAttribute('aria-label', 'Streak count')
  })
})
