import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  error?: boolean
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, error, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'mb-1 block text-sm font-medium text-[var(--color-text-primary)]',
        error && 'text-[var(--color-miss)]',
        className
      )}
      {...props}
    >
      {children}
    </label>
  )
)
Label.displayName = 'Label'

export { Label }
