import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  padded?: boolean
  fullWidth?: boolean
}

export function PageContainer({
  children,
  className,
  padded = true,
  fullWidth = false,
}: PageContainerProps) {
  return (
    <main
      id="main-content"
      className={cn(
        'min-h-screen bg-[var(--color-bg-primary)] lg:min-h-0',
        padded && 'px-4 py-6 md:px-6 lg:px-8',
        className
      )}
    >
      <div
        className={cn(
          'mx-auto lg:h-full',
          fullWidth ? 'max-w-none' : 'max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl'
        )}
      >
        {children}
      </div>
    </main>
  )
}
