import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/clients/server"
import { getInterviewById, getUserById } from "@/lib/admin/adminServices"
import { InterviewEditForm } from "./InterviewEditForm"

interface PageProps {
  params: Promise<{
    interviewId: string
  }>
}

export default async function AdminInterviewDetailPage({ params }: PageProps) {
  const { interviewId } = await params

  const supabase = await createClient()
  const interview = await getInterviewById(supabase, interviewId)

  if (!interview) {
    notFound()
  }

  // Fetch user info
  let user: any = null
  try {
    user = await getUserById(supabase, interview.user_id)
  } catch (error) {
    console.error('Failed to fetch user:', error)
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl p-8">
        <InterviewEditForm interview={interview} user={user} />
      </div>
    </div>
  )
}