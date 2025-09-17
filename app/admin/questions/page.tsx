import { Suspense } from 'react'
import { QuestionsDataTable } from "@/components/admin/questions/QuestionsDataTable"

// Wrapper component to handle search params
function QuestionsPageContent() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">질문</h1>
      </div>
      <QuestionsDataTable />
    </div>
  )
}

export default function AdminQuestionsPage() {
  return (
    <Suspense fallback={
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">질문</h1>
        </div>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </div>
      </div>
    }>
      <QuestionsPageContent />
    </Suspense>
  )
}