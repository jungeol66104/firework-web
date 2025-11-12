import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/clients/server"
import { QuestionEditForm } from "./QuestionEditForm"

interface PageProps {
  params: Promise<{
    questionId: string
  }>
}

export default async function AdminQuestionDetailPage({ params }: PageProps) {
  const { questionId } = await params

  const supabase = await createClient()

  // Fetch question data
  const { data: question, error } = await supabase
    .from('interview_questions')
    .select('*')
    .eq('id', questionId)
    .single()

  if (error || !question) {
    notFound()
  }

  // Extract question text from question_data JSONB field
  let questionText = "질문 데이터 없음"
  if (question.question_data) {
    if (question.question_data.general_personality && Array.isArray(question.question_data.general_personality)) {
      questionText = question.question_data.general_personality.join(", ")
    } else if (question.question_data.cover_letter_personality && Array.isArray(question.question_data.cover_letter_personality)) {
      questionText = question.question_data.cover_letter_personality.join(", ")
    } else if (question.question_data.cover_letter_competency && Array.isArray(question.question_data.cover_letter_competency)) {
      questionText = question.question_data.cover_letter_competency.join(", ")
    } else if (typeof question.question_data === 'string') {
      questionText = question.question_data
    } else if (question.question_data.text) {
      questionText = question.question_data.text
    }
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl">
        <QuestionEditForm question={question} />
      </div>
    </div>
  )
}