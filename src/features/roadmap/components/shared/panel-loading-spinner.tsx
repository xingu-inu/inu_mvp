export function PanelLoadingSpinner() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
    </div>
  )
}
