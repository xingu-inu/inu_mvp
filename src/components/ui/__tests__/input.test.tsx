import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Input, Textarea } from '../input'

describe('Input', () => {
  it('renders correctly', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('applies base styles', () => {
    render(<Input data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveClass('rounded-lg')
    expect(input).toHaveClass('glass-2')
  })

  it('shows error message when error prop is provided', () => {
    render(<Input error="This field is required" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('applies error styles when error prop is provided', () => {
    render(<Input error="Error" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveClass('border-[var(--color-miss)]')
  })

  it('handles user input', async () => {
    render(<Input data-testid="input" />)
    const input = screen.getByTestId('input')

    await userEvent.type(input, 'Hello World')
    expect(input).toHaveValue('Hello World')
  })

  it('calls onChange handler', async () => {
    const onChange = vi.fn()
    render(<Input onChange={onChange} data-testid="input" />)

    await userEvent.type(screen.getByTestId('input'), 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Input ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(<Input className="custom-class" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveClass('custom-class')
  })

  it('passes through input props', () => {
    render(<Input type="email" required disabled data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toBeRequired()
    expect(input).toBeDisabled()
  })
})

describe('Textarea', () => {
  it('renders correctly', () => {
    render(<Textarea placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('applies base styles', () => {
    render(<Textarea data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveClass('rounded-lg')
    expect(textarea).toHaveClass('glass-2')
    expect(textarea).toHaveClass('resize-none')
  })

  it('shows error message when error prop is provided', () => {
    render(<Textarea error="This field is required" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('applies error styles when error prop is provided', () => {
    render(<Textarea error="Error" data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveClass('border-[var(--color-miss)]')
  })

  it('handles user input', async () => {
    render(<Textarea data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')

    await userEvent.type(textarea, 'Hello World')
    expect(textarea).toHaveValue('Hello World')
  })

  it('calls onChange handler', async () => {
    const onChange = vi.fn()
    render(<Textarea onChange={onChange} data-testid="textarea" />)

    await userEvent.type(screen.getByTestId('textarea'), 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Textarea ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(<Textarea className="custom-class" data-testid="textarea" />)
    expect(screen.getByTestId('textarea')).toHaveClass('custom-class')
  })

  it('passes through textarea props', () => {
    render(<Textarea rows={5} maxLength={100} required disabled data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('rows', '5')
    expect(textarea).toHaveAttribute('maxLength', '100')
    expect(textarea).toBeRequired()
    expect(textarea).toBeDisabled()
  })
})
