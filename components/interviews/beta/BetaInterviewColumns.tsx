"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ChevronRight, ChevronDown } from "lucide-react"

// Combined type for questions and answers
interface InterviewItem {
  id: string
  type: 'question' | 'answer'
  index: string // Q1, Q2, A1, A2, etc.
  content: string
  created_at: string
  status?: string
  isJob?: boolean
  questionId?: string // For answers, which question they belong to
  isExpanded?: boolean // For questions, whether their answers are shown
  level: number // 0 for questions, 1 for answers (for indentation)
}

export const createBetaInterviewColumns = (
  onDelete: (id: string, type: 'question' | 'answer') => Promise<void>,
  onItemClick: (item: InterviewItem) => void,
  onChevronClick?: (e: React.MouseEvent, questionId: string) => void,
  currentQuestionId?: string,
  currentAnswerId?: string
): ColumnDef<InterviewItem>[] => [
  {
    accessorKey: "index",
    header: "구분",
    size: 50,
    cell: ({ row }) => {
      const item = row.original
      const isQuestion = item.type === 'question'

      return (
        <div className={`flex items-center gap-2 ${item.level === 1 ? "pl-8" : ""}`}>
          {isQuestion && (
            <div
              className="w-4 h-4 flex items-center justify-center cursor-pointer"
              onClick={(e) => onChevronClick?.(e, item.id)}
            >
              {item.isExpanded ? (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-500" />
              )}
            </div>
          )}
          <span className={`font-mono text-sm ${
            isQuestion ? "text-gray-900" : "text-gray-600"
          }`}>
            {item.index}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "content",
    header: "내용",
    minSize: 300,
    maxSize: 400,
    cell: ({ row }) => {
      const item = row.original

      return (
        <div className={`truncate ${item.level === 1 ? "pl-4" : ""}`}>
          {item.status && item.isJob ? (
            <span>
              {item.status === 'processing' || item.status === 'progress'
                ? '🔄 생성 중...'
                : '🔄 대기 중...'
              }
              {item.content.includes('(') && item.content.match(/\(([^)]+)\)/)?.[0]}
            </span>
          ) : (
            <span>
              {item.type === 'question' ? `AI 면접 질문: ${item.content}` : `AI 면접 답변: ${item.content}`}
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: () => <div>생성일</div>,
    size: 100,
    cell: ({ row }) => {
      const item = row.original
      const date = item.created_at

      // Handle different date formats properly without timezone conversion
      let formattedDate = ''
      if (date) {
        try {
          // If date includes timezone info, use it directly
          if (date.includes('T')) {
            formattedDate = date.split('T')[0]
          } else {
            // For database timestamps like "2025-09-03 08:37:41.60393"
            formattedDate = date.split(' ')[0]
          }
        } catch (error) {
          console.error('Error formatting date:', error)
          formattedDate = date.split(' ')[0] || date.split('T')[0] || ''
        }
      }

      return <div className="text-sm text-gray-500">{formattedDate}</div>
    },
  },
  {
    id: "actions",
    header: "",
    size: 50,
    cell: ({ row }) => {
      const item = row.original

      // Don't show actions for job items or answer rows
      if (item.isJob) {
        return null
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">메뉴 열기</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item.id, item.type)
              }}
              className="text-red-600 focus:text-red-600"
            >
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]