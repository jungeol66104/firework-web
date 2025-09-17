
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  // Redirect to users page as the main admin entry point
  redirect('/admin/users')
}
