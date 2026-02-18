import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../button'

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-[var(--color-primary-500)]')

    rerender(<Button variant="done">Done</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-[var(--color-done)]')

    rerender(<Button variant="skip">Skip</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-[var(--color-skip-bg)]')

    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-[var(--color-miss)]')
  })

  it('applies size classes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-9')

    rerender(<Button size="md">Medium</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-11')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-14')

    rerender(<Button size="icon">Icon</Button>)
    expect(screen.getByRole('button')).toHaveClass('w-11')
  })

  it('shows loading spinner when isLoading', () => {
    render(<Button isLoading>Submit</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('handles click events', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)

    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is keyboard accessible', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Press me</Button>)

    await userEvent.tab()
    expect(screen.getByRole('button')).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalled()
  })

  it('does not trigger click when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Disabled
      </Button>
    )

    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Button ref={ref}>Button</Button>)
    expect(ref).toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Button</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })
})
