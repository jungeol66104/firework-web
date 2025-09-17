"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Interview } from "@/lib/types"

export const createInterviewsColumns = (
  onQuestionsClick: (interviewId: string, candidateName: string) => void,
  onInterviewClick?: (interviewId: string) => void
): ColumnDef<Interview>[] => [
  {
    accessorKey: "index",
    header: () => "",
    cell: ({ row }) => <div className="font-medium w-1 text-center">{row.index + 1}</div>,
  },
  {
    accessorKey: "company_name",
    header: "기업명",
    cell: ({ row }) => {
      const companyName = row.getValue("company_name") as string
      return (
        <div className="font-medium">
          {companyName || "기업명 없음"}
        </div>
      )
    },
  },
  {
    accessorKey: "position",
    header: "직무",
    cell: ({ row }) => {
      const position = row.getValue("position") as string
      return (
        <div className="text-sm text-gray-600">
          {position || "-"}
        </div>
      )
    },
  },
  {
    accessorKey: "user_id",
    header: "사용자 ID",
    cell: ({ row }) => {
      const userId = row.getValue("user_id") as string
      return (
        <div className="font-mono text-xs text-gray-500">
          {userId ? userId.substring(0, 8) + "..." : "-"}
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
      const interview = row.original
      return (
        <div className="flex items-center gap-2" data-actions-cell="true">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onQuestionsClick(interview.id, interview.company_name || "면접")
            }}
          >
            질문
          </Button>
        </div>
      )
    },
  },
]