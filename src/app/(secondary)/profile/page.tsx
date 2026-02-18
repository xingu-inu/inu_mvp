import Link from 'next/link'
import { PageContainer } from '@/components/layout'
import { Card } from '@/components/ui'
import { Bell, Globe, Shield, ChevronRight } from 'lucide-react'

const settingsLinks = [
  { href: '/profile/notifications', icon: Bell, label: '알림 설정' },
  { href: '/profile/language', icon: Globe, label: '언어 설정' },
  { href: '/profile/privacy', icon: Shield, label: '개인정보 보호' },
]

export default function ProfilePage() {
  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Profile Header */}
        <Card className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-primary-100)]">
            <span className="text-3xl">👤</span>
          </div>
          <h1 className="mb-1 text-xl font-bold">Developer</h1>
          <p className="text-[var(--color-text-secondary)]">dev@example.com</p>
        </Card>

        {/* Settings Links */}
        <div className="space-y-2">
          {settingsLinks.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}>
              <Card className="flex items-center justify-between p-4 transition-colors hover:bg-[var(--color-bg-secondary)]">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-[var(--color-text-secondary)]" />
                  <span>{label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-[var(--color-text-tertiary)]" />
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageContainer>
  )
}
