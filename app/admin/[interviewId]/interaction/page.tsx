import AnswersSection from "@/components/interviews/answers/answersSection"
import InformationSection from "@/components/interviews/informationSection"
import QuestionsSection from "@/components/interviews/questions/questionsSection"
import TableOfContents from "@/components/interviews/tableOfContents"
import { fetchInterviewByIdServer } from "@/lib/supabase/services/serverServices"
import { createClient } from "@/lib/supabase/clients/server"
import { notFound } from "next/navigation"

export default async function Page({ params }: { params: Promise<{ interviewId: string }> }) {
  const { interviewId } = await params
  
  // Get current user for access control
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id
  
  const interview = await fetchInterviewByIdServer(interviewId, userId)
  if (!interview) return notFound()

  return (
    <div className="flex justify-center items-center gap-4">
    <div className="w-full max-w-4xl flex gap-4">
      <div className="w-full flex flex-col justify-center items-center gap-4">
          <InformationSection showNavigation={false} interview={interview} />
          <QuestionsSection showNavigation={false} />
          <AnswersSection showNavigation={false} />
          <div className="h-[462px]"></div>
        </div>
        <TableOfContents />
      </div>
    </div>
  )
}
