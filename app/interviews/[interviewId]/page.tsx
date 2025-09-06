import AnswersSection from "@/components/interviews/answers/answersSection"
import InformationSection from "@/components/interviews/informationSection"
import QuestionsSection from "@/components/interviews/questions/questionsSection"
import TableOfContents from "@/components/interviews/tableOfContents"
import InterviewNavBar from "@/components/interviews/interviewNavBar"

export default function Page() {
  return (
    <>
      {/* Interview-specific navbar with table of contents */}
      <InterviewNavBar />
      
      <div className="min-h-screen">
        {/* Desktop layout with sidebar */}
        <div className="hidden sm:flex sm:justify-center sm:items-start sm:gap-4">
          <div className="w-full max-w-4xl flex gap-4">
            <div className="w-full flex flex-col justify-center items-center gap-4">
              <InformationSection showNavigation={false} />
              <QuestionsSection showNavigation={false} />
              <AnswersSection showNavigation={false} />
              <div className="h-[800px]"></div>
            </div>
            <TableOfContents />
          </div>
        </div>
        
        {/* Mobile content */}
        <div className="sm:hidden">
          <div className="flex flex-col items-center">
            <div className="w-full">
              <InformationSection showNavigation={false} />
            </div>
            <div className="w-full">
              <QuestionsSection showNavigation={false} />
            </div>
            <div className="w-full">
              <AnswersSection showNavigation={false} />
            </div>
            <div className="h-[400px]"></div>
          </div>
        </div>
      </div>
    </>
  )
}
