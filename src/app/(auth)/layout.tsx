import { UnderwaterBackground } from '@/components/backgrounds'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <UnderwaterBackground>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </UnderwaterBackground>
  )
}
