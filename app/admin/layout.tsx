import { redirect } from 'next/navigation'
import { AdminLayout } from '@/components/admin/layout/AdminLayout'
import { isAdminServer } from '@/lib/admin/adminAuthServer'

export default async function AdminLayoutPage({
  children,
}: {
  children: React.ReactNode
}) {
  // Check admin access on server side
  try {
    const adminAccess = await isAdminServer()
    if (!adminAccess) {
      redirect('/dashboard')
    }
  } catch (error) {
    // If any error occurs (not authenticated, etc.), redirect to dashboard
    redirect('/dashboard')
  }

  return <AdminLayout>{children}</AdminLayout>
}