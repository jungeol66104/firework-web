"use client"

import BetaQuestionsSection from "./BetaQuestionsSection"
import BetaAnswersSection from "./BetaAnswersSection"
import { useCurrentInterview } from "@/lib/zustand"

interface AIInterviewSectionProps {
  showNavigation?: boolean
}

export function AIInterviewSection({ showNavigation = true }: AIInterviewSectionProps) {
  const currentInterview = useCurrentInterview()
  const companyName = currentInterview?.company_name || "회사명"

  return (
    <div id="ai-interview" className="w-full max-w-4xl">
      <div>
        {/* Company Header Section */}
        <div className="p-4">
          <h1 className="text-2xl font-bold text-left text-gray-900">
            {companyName}
          </h1>
        </div>

        {/* Divider */}
        <div className="border-b border-gray-200 mx-4"></div>

        {/* Questions Section */}
        <div>
          <BetaQuestionsSection showNavigation={false} />
        </div>

        {/* Answers Section - Hidden for now */}
        {/* <div>
          <BetaAnswersSection showNavigation={false} />
        </div> */}
      </div>
    </div>
  )
}