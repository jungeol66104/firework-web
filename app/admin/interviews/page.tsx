import { Suspense } from 'react'
import { InterviewsDataTable } from "@/components/admin/interviews/InterviewsDataTable"

// Wrapper component to handle search params
function InterviewsPageContent() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">면접</h1>
      </div>
      <InterviewsDataTable />
    </div>
  )
}

export default function AdminInterviewsPage() {
  return (
    <Suspense fallback={
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">면접</h1>
        </div>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </div>
      </div>
    }>
      <InterviewsPageContent />
    </Suspense>
  )
}