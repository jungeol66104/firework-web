import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/clients/server"
import { getQAById, getInterviewById } from "@/lib/admin/adminServices"
import { QAEditForm } from "./QAEditForm"

interface PageProps {
  params: Promise<{
    qaId: string
  }>
}

export default async function AdminQADetailPage({ params }: PageProps) {
  const { qaId } = await params

  const supabase = await createClient()
  const qa = await getQAById(supabase, qaId)

  if (!qa) {
    notFound()
  }

  // Fetch interview info if interview_id exists
  let interview: any = null
  if (qa.interview_id) {
    try {
      interview = await getInterviewById(supabase, qa.interview_id)
    } catch (error) {
      console.error('Failed to fetch interview:', error)
    }
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl p-8">
        <QAEditForm qa={qa} interview={interview} />
      </div>
    </div>
  )
}
