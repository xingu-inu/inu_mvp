import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Card } from '../card'

describe('Card', () => {
  it('renders with children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies default variant classes', () => {
    render(<Card data-testid="card">Content</Card>)
    const card = screen.getByTestId('card')
    expect(card).toHaveClass('glass-2')
    expect(card).toHaveClass('rounded-xl')
  })

  it('applies variant classes correctly', () => {
    const { rerender } = render(
      <Card variant="default" data-testid="card">
        Default
      </Card>
    )
    expect(screen.getByTestId('card')).toHaveClass('glass-2')

    rerender(
      <Card variant="hero" data-testid="card">
        Hero
      </Card>
    )
    expect(screen.getByTestId('card')).toHaveClass('glass-3')

    rerender(
      <Card variant="list" data-testid="card">
        List
      </Card>
    )
    expect(screen.getByTestId('card')).toHaveClass('glass-1')

    rerender(
      <Card variant="done" data-testid="card">
        Done
      </Card>
    )
    expect(screen.getByTestId('card')).toHaveClass('bg-[var(--color-done-bg)]')

    rerender(
      <Card variant="skip" data-testid="card">
        Skip
      </Card>
    )
    expect(screen.getByTestId('card')).toHaveClass('bg-[var(--color-skip-bg)]/80')

    rerender(
      <Card variant="miss" data-testid="card">
        Miss
      </Card>
    )
    expect(screen.getByTestId('card')).toHaveClass('bg-[var(--color-miss-bg)]')
  })

  it('applies padding classes correctly', () => {
    const { rerender } = render(
      <Card padding="none" data-testid="card">
        None
      </Card>
    )
    expect(screen.getByTestId('card')).toHaveClass('p-0')

    rerender(
      <Card padding="sm" data-testid="card">
        Small
      </Card>
    )
    expect(screen.getByTestId('card')).toHaveClass('p-3')

    rerender(
      <Card padding="md" data-testid="card">
        Medium
      </Card>
    )
    expect(screen.getByTestId('card')).toHaveClass('p-4')

    rerender(
      <Card padding="lg" data-testid="card">
        Large
      </Card>
    )
    expect(screen.getByTestId('card')).toHaveClass('p-6')
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Card ref={ref}>Card</Card>)
    expect(ref).toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(
      <Card className="custom-class" data-testid="card">
        Card
      </Card>
    )
    expect(screen.getByTestId('card')).toHaveClass('custom-class')
  })

  it('passes through other props', () => {
    render(
      <Card data-testid="card" aria-label="Test card">
        Card
      </Card>
    )
    expect(screen.getByTestId('card')).toHaveAttribute('aria-label', 'Test card')
  })
})
