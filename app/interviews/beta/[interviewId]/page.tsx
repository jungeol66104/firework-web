import InformationSection from "@/components/interviews/informationSection"
import InterviewNavBar from "@/components/interviews/interviewNavBar"
import { AIInterviewSection } from "@/components/interviews/beta/AIInterviewSection"
import BetaTableOfContents from "@/components/interviews/beta/BetaTableOfContents"

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
              <AIInterviewSection showNavigation={false} />
              <InformationSection showNavigation={false} />
            </div>
            <BetaTableOfContents />
          </div>
        </div>

        {/* Mobile content */}
        <div className="sm:hidden">
          <div className="flex flex-col items-center">
            <div className="w-full">
              <AIInterviewSection showNavigation={false} />
            </div>
            <div className="w-full">
              <InformationSection showNavigation={false} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}