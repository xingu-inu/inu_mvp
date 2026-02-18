export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-y-auto bg-[var(--color-bg-primary)]">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pt-8 pb-6 lg:max-w-2xl lg:px-8 lg:pt-12 lg:pb-8">
        {children}
      </div>
    </div>
  )
}
