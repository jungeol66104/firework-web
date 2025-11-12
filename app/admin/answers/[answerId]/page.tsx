import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/clients/server"
import { AnswerEditForm } from "./AnswerEditForm"

interface PageProps {
  params: Promise<{
    answerId: string
  }>
}

export default async function AdminAnswerDetailPage({ params }: PageProps) {
  const { answerId } = await params

  const supabase = await createClient()

  // Fetch answer data
  const { data: answer, error } = await supabase
    .from('interview_answers')
    .select('*')
    .eq('id', answerId)
    .single()

  if (error || !answer) {
    notFound()
  }

  // Extract answer text from answer_data JSONB field
  let answerText = "답변 데이터 없음"
  if (answer.answer_data) {
    if (answer.answer_data.general_personality && Array.isArray(answer.answer_data.general_personality)) {
      answerText = answer.answer_data.general_personality.join(", ")
    } else if (answer.answer_data.cover_letter_personality && Array.isArray(answer.answer_data.cover_letter_personality)) {
      answerText = answer.answer_data.cover_letter_personality.join(", ")
    } else if (answer.answer_data.cover_letter_competency && Array.isArray(answer.answer_data.cover_letter_competency)) {
      answerText = answer.answer_data.cover_letter_competency.join(", ")
    } else if (typeof answer.answer_data === 'string') {
      answerText = answer.answer_data
    } else if (answer.answer_data.text) {
      answerText = answer.answer_data.text
    }
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl">
        <AnswerEditForm answer={answer} />
      </div>
    </div>
  )
}