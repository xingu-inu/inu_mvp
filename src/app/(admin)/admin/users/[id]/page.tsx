import { AdminUserDetail } from '@/features/admin/components'

interface AdminUserDetailPageProps {
  params: Promise<{ id: string }>
}

export default function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  return <AdminUserDetail paramsPromise={params} />
}
