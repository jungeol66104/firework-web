"use client"

import { useParams } from "next/navigation"
import { useCurrentInterview } from "@/lib/zustand"

export function CompanyHeader() {
  const params = useParams()
  const interviewId = params.interviewId as string
  const currentInterview = useCurrentInterview()

  const companyName = currentInterview?.company_name || "회사명"

  return (
    <div className="w-full flex justify-center py-6">
      <div className="w-full max-w-4xl px-4">
        <h1 className="text-2xl font-bold text-left text-gray-900">
          {companyName}
        </h1>
      </div>
    </div>
  )
}