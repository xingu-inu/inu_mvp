import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Chip } from '../chip'

describe('Chip', () => {
  it('renders with children', () => {
    render(<Chip>Health</Chip>)
    expect(screen.getByText('Health')).toBeInTheDocument()
  })

  it('renders with emoji', () => {
    render(<Chip emoji="💪">Health</Chip>)
    expect(screen.getByText('💪')).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
  })

  it('applies area variant classes', () => {
    render(
      <Chip variant="area" data-testid="chip">
        Area
      </Chip>
    )
    expect(screen.getByTestId('chip')).toHaveClass('rounded-full')
    expect(screen.getByTestId('chip')).toHaveClass('text-xs')
  })

  it('applies selection variant classes', () => {
    render(
      <Chip variant="selection" data-testid="chip">
        Selection
      </Chip>
    )
    expect(screen.getByTestId('chip')).toHaveClass('border-2')
    expect(screen.getByTestId('chip')).toHaveClass('cursor-pointer')
  })

  it('applies selected state styles', () => {
    const { rerender } = render(
      <Chip variant="selection" selected={false} data-testid="chip">
        Unselected
      </Chip>
    )
    expect(screen.getByTestId('chip')).toHaveClass('border-[var(--color-border)]')

    rerender(
      <Chip variant="selection" selected={true} data-testid="chip">
        Selected
      </Chip>
    )
    expect(screen.getByTestId('chip')).toHaveClass('border-[var(--color-primary-500)]')
  })

  it('applies custom color for area variant', () => {
    render(
      <Chip variant="area" color="#22c55e" data-testid="chip">
        Health
      </Chip>
    )
    const chip = screen.getByTestId('chip')
    expect(chip).toHaveStyle({ backgroundColor: '#22c55e20', color: '#22c55e' })
  })

  it('does not apply color styles for non-area variant', () => {
    render(
      <Chip variant="selection" color="#22c55e" data-testid="chip">
        Selection
      </Chip>
    )
    const chip = screen.getByTestId('chip')
    expect(chip).not.toHaveStyle({ backgroundColor: '#22c55e20' })
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Chip ref={ref}>Chip</Chip>)
    expect(ref).toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(
      <Chip className="custom-class" data-testid="chip">
        Chip
      </Chip>
    )
    expect(screen.getByTestId('chip')).toHaveClass('custom-class')
  })

  it('passes through other props', () => {
    render(
      <Chip data-testid="chip" onClick={() => {}}>
        Clickable
      </Chip>
    )
    expect(screen.getByTestId('chip')).toBeInTheDocument()
  })
})
