import { redirect } from 'next/navigation'
import { isAdminServer } from '@/lib/admin/adminAuthServer'

export default async function ReportDetailLayout({
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
    redirect('/dashboard')
  }

  // No AdminNav wrapper - clean layout for report detail
  return <>{children}</>;
}
