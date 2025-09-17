"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"

interface Question {
  id: string
  interview_id: string
  question_data: any
  comment: string | null
  created_at: string
  updated_at: string
}

export const createQuestionsColumns = (
  onAnswersClick: (questionId: string) => void,
  onQuestionClick?: (questionId: string) => void
): ColumnDef<Question>[] => [
  {
    accessorKey: "index",
    header: () => "",
    cell: ({ row }) => <div className="font-medium w-1 text-center">{row.index + 1}</div>,
  },
  {
    accessorKey: "question_data",
    header: "질문 내용",
    cell: ({ row }) => {
      const questionData = row.getValue("question_data") as any

      // Extract question text from the question_data JSONB field
      let questionText = "질문 데이터 없음"

      if (questionData) {
        // Try to get question text from various possible structures
        if (questionData.general_personality && Array.isArray(questionData.general_personality)) {
          questionText = questionData.general_personality.join(", ")
        } else if (questionData.cover_letter_personality && Array.isArray(questionData.cover_letter_personality)) {
          questionText = questionData.cover_letter_personality.join(", ")
        } else if (questionData.cover_letter_competency && Array.isArray(questionData.cover_letter_competency)) {
          questionText = questionData.cover_letter_competency.join(", ")
        } else if (typeof questionData === 'string') {
          questionText = questionData
        } else if (questionData.text) {
          questionText = questionData.text
        }
      }

      return (
        <div className="max-w-md">
          <div className="text-sm font-medium line-clamp-2">
            {questionText.length > 100 ? questionText.substring(0, 100) + "..." : questionText}
          </div>
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
  {
    id: "actions",
    header: "바로가기",
    cell: ({ row }) => {
      const question = row.original
      return (
        <div className="flex items-center gap-2" data-actions-cell="true">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onAnswersClick(question.id)
            }}
          >
            답변
          </Button>
        </div>
      )
    },
  },
]