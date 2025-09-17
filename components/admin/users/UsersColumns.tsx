"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Profile } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

export const createUsersColumns = (
  onInterviewsClick: (userId: string, userName: string) => void,
  onUserClick?: (userId: string) => void
): ColumnDef<Profile>[] => [
  {
    accessorKey: "index",
    header: () => "",
    cell: ({ row }) => <div className="font-medium w-1 text-center">{row.index + 1}</div>,
  },
  {
    accessorKey: "name",
    header: "이름",
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex items-center gap-2">
          <div className="font-medium">{user.name}</div>
          {user.is_admin && (
            <Badge className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200">
              관리자
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "email",
    header: "이메일",
    cell: ({ row }) => {
      const email = row.getValue("email") as string
      return (
        <div className="text-sm text-gray-600">
          {email || "-"}
        </div>
      )
    },
  },
  {
    accessorKey: "id",
    header: "사용자 ID",
    cell: ({ row }) => {
      const id = row.getValue("id") as string
      return (
        <div className="font-mono text-xs text-gray-600">
          {id.substring(0, 8)}...
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "가입일",
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
      const user = row.original
      return (
        <div className="flex items-center gap-2" data-actions-cell="true">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onInterviewsClick(user.id, user.name)
            }}
          >
            면접
          </Button>
        </div>
      )
    },
  },
]