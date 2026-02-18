export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background:
          'linear-gradient(180deg, var(--color-bg-secondary) 0%, var(--color-primary-50) 50%, var(--color-bg-secondary) 100%)',
      }}
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
