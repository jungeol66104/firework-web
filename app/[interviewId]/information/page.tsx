import InformationSection from "@/components/informationSection"
import { fetchInterviewByIdServer } from "@/lib/supabase/services/serverServices"
import { notFound } from "next/navigation"

export default async function Page({ params }: { params: Promise<{ interviewId: string }> }) {
  const { interviewId } = await params
  const interview = await fetchInterviewByIdServer(interviewId)
  if (!interview) return notFound()
    
  return (
    <div className="flex justify-center">
      <InformationSection interview={interview} />
    </div>
  )
}
