import { Suspense } from 'react'
import { AnswersDataTable } from "@/components/admin/answers/AnswersDataTable"

// Wrapper component to handle search params
function AnswersPageContent() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">답변</h1>
      </div>
      <AnswersDataTable />
    </div>
  )
}

export default function AdminAnswersPage() {
  return (
    <Suspense fallback={
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">답변</h1>
        </div>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </div>
      </div>
    }>
      <AnswersPageContent />
    </Suspense>
  )
}