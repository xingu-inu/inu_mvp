export function LiveRegion({
  children,
  politeness = 'polite',
}: {
  children: React.ReactNode
  politeness?: 'polite' | 'assertive'
}) {
  return (
    <div role="status" aria-live={politeness} aria-atomic="true" className="sr-only">
      {children}
    </div>
  )
}
