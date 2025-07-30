import AnswersSection from "@/components/answersSection"
import InformationSection from "@/components/informationSection"
import QuestionsSection from "@/components/questionsSection"
import TableOfContents from "@/components/tableOfContents"
import { fetchInterviewByIdServer } from "@/lib/supabase/services/serverServices"
import { notFound } from "next/navigation"

export default async function Page({ params }: { params: Promise<{ interviewId: string }> }) {
  const { interviewId } = await params
  const interview = await fetchInterviewByIdServer(interviewId)
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
