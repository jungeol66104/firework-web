"use client"

import { ColumnDef } from "@tanstack/react-table"

interface Answer {
  id: string
  interview_id: string
  question_id: string
  answer_data: any
  comment: string | null
  created_at: string
  updated_at: string
}

export const createAnswersColumns = (
  onAnswerClick?: (answerId: string) => void
): ColumnDef<Answer>[] => [
  {
    accessorKey: "index",
    header: () => "",
    cell: ({ row }) => <div className="font-medium w-1 text-center">{row.index + 1}</div>,
  },
  {
    accessorKey: "answer_data",
    header: "답변 내용",
    cell: ({ row }) => {
      const answerData = row.getValue("answer_data") as any

      // Extract answer text from the answer_data JSONB field
      let answerText = "답변 데이터 없음"

      if (answerData) {
        // Try to get answer text from various possible structures
        if (answerData.general_personality && Array.isArray(answerData.general_personality)) {
          answerText = answerData.general_personality.join(", ")
        } else if (answerData.cover_letter_personality && Array.isArray(answerData.cover_letter_personality)) {
          answerText = answerData.cover_letter_personality.join(", ")
        } else if (answerData.cover_letter_competency && Array.isArray(answerData.cover_letter_competency)) {
          answerText = answerData.cover_letter_competency.join(", ")
        } else if (typeof answerData === 'string') {
          answerText = answerData
        } else if (answerData.text) {
          answerText = answerData.text
        }
      }

      return (
        <div className="max-w-lg">
          <div className="text-sm line-clamp-3">
            {answerText.length > 150 ? answerText.substring(0, 150) + "..." : answerText}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "question_id",
    header: "질문 ID",
    cell: ({ row }) => {
      const questionId = row.getValue("question_id") as string
      return (
        <div className="font-mono text-xs text-gray-500">
          {questionId ? questionId.substring(0, 8) + "..." : "-"}
        </div>
      )
    },
  },
  {
    accessorKey: "interview_id",
    header: "면접 ID",
    cell: ({ row }) => {
      const interviewId = row.getValue("interview_id") as string
      return (
        <div className="font-mono text-xs text-gray-500">
          {interviewId ? interviewId.substring(0, 8) + "..." : "-"}
        </div>
      )
    },
  },
  {
    accessorKey: "comment",
    header: "코멘트",
    cell: ({ row }) => {
      const comment = row.getValue("comment") as string
      return (
        <div className="text-sm text-gray-600 max-w-xs">
          {comment ? (
            comment.length > 50 ? comment.substring(0, 50) + "..." : comment
          ) : "-"}
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "생성일",
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string
      return (
        <div className="text-sm text-gray-600">
          {new Date(date).toLocaleDateString('ko-KR')}
        </div>
      )
    },
  },
]