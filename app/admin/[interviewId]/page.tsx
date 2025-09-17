import { notFound } from "next/navigation"
import { fetchInterviewByIdServer } from "@/lib/supabase/services/serverServices"
import { createClient } from "@/lib/supabase/clients/server"

interface PageProps {
  params: Promise<{
    interviewId: string
  }>
}

export default async function AdminInterviewPage({ params }: PageProps) {
  const { interviewId } = await params
  
  // Get current user for access control
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  
  const interview = await fetchInterviewByIdServer(interviewId, userId)

  if (!interview) {
    notFound()
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl p-8">
        <h1 className="text-2xl font-bold mb-4">면접 상세</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">면접 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-medium text-gray-700">사용자 ID:</label>
              <p className="text-gray-900 font-mono text-sm">{interview.user_id}</p>
            </div>
            <div>
              <label className="font-medium text-gray-700">회사명:</label>
              <p className="text-gray-900">{interview.company_name}</p>
            </div>
            <div>
              <label className="font-medium text-gray-700">직무:</label>
              <p className="text-gray-900">{interview.position}</p>
            </div>
            <div>
              <label className="font-medium text-gray-700">생성일:</label>
              <p className="text-gray-900">{new Date(interview.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
