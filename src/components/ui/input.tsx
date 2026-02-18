import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => (
  <div className="w-full">
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-xl bg-[var(--color-bg-secondary)] px-4 text-sm',
        'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]',
        'border border-[var(--color-border)]',
        'focus:border-[var(--color-primary-500)] focus:outline-none',
        'transition-all duration-[var(--duration-fast)]',
        error && 'input-error border-[var(--color-miss)] focus:border-[var(--color-miss)]',
        className
      )}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-[var(--color-miss)]">{error}</p>}
  </div>
))
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <textarea
        ref={ref}
        className={cn(
          'min-h-[120px] w-full resize-none rounded-xl bg-[var(--color-bg-secondary)] px-4 py-3 text-sm',
          'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]',
          'border border-[var(--color-border)]',
          'focus:border-[var(--color-primary-500)] focus:outline-none',
          'transition-all duration-[var(--duration-fast)]',
          error && 'input-error border-[var(--color-miss)] focus:border-[var(--color-miss)]',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-[var(--color-miss)]">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'

export { Input, Textarea }
