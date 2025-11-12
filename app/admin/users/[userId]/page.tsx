import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/clients/server"
import { getUserById } from "@/lib/admin/adminServices"
import { UserEditForm } from "./UserEditForm"

interface PageProps {
  params: Promise<{
    userId: string
  }>
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { userId } = await params

  const supabase = await createClient()
  const user = await getUserById(supabase, userId)

  if (!user) {
    notFound()
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl">
        <UserEditForm user={user} />
      </div>
    </div>
  )
}