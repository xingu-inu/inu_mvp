interface LegalPageHeaderProps {
  title: string
  effectiveDate: string
  version: string
}

export function LegalPageHeader({ title, effectiveDate, version }: LegalPageHeaderProps) {
  return (
    <div className="mb-10">
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{title}</h1>
      <p className="mt-2 text-sm text-[var(--color-text-tertiary)]">
        시행일: {effectiveDate} | 버전 {version}
      </p>
    </div>
  )
}
