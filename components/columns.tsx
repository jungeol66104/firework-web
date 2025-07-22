import { ColumnDef } from "@tanstack/react-table"
import { FileText, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DataItem } from "@/lib/types"

const createColumns = (router: any): ColumnDef<DataItem>[] => [
  {
    accessorKey: "index",
    header: "번호",
    minSize: 1000,
    cell: ({ row }) => <div className="font-medium">{row.index + 1}</div>,
  },
  {
    accessorKey: "name",
    header: "이름",
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "info",
    header: () => <div>정보</div>,
    cell: ({ row }) => (
        <div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 group" onClick={() => router.push(`/${row.original.id}/information`)}><FileText className="h-4 w-4 group-hover:text-blue-600 transition-colors" /></Button>
        </div>
    ),
  },
  {
    accessorKey: "question",
    header: () => <div>질문</div>,
    cell: ({ row }) => (
        <div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 group" onClick={() => router.push(`/${row.original.id}/questions`)}><FileText className="h-4 w-4 group-hover:text-blue-600 transition-colors" /></Button>
        </div>
    ),
  },
  {
    accessorKey: "answer",
    header: () => <div>답변</div>,
    cell: ({ row }) => (
        <div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 group" onClick={() => router.push(`/${row.original.id}/answers`)}><FileText className="h-4 w-4 group-hover:text-blue-600 transition-colors" /></Button>
        </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: () => <div className="w-9 min-w-9 max-w-9 ">생성</div>,
    cell: ({ row }) => <div className="w-9 min-w-9 max-w-9">{row.getValue("createdAt")}</div>,
  },
  {
    accessorKey: "updatedAt",
    header: () => <div className="w-9 min-w-9 max-w-9">수정</div>,
    cell: ({ row }) => <div className="w-9 min-w-9 max-w-9">{row.getValue("updatedAt")}</div>,
  },
  {
    id: "actions",
    enableHiding: false,
    header: () => <div className="w-1"></div>,
    cell: ({ row }) => {
      const item = row.original

      const copyToClipboard = async (text: string) => {
        try {
          await navigator.clipboard.writeText(text)
          console.log("Copied to clipboard:", text)
        } catch (err) {
          console.error("Failed to copy:", err)
        }
      }

      return (
        <div className="w-1">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">메뉴 열기</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => copyToClipboard(item.id)} className="cursor-pointer">ID 복사</DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log("Delete item:", item.id)} className="cursor-pointer !text-red-600 !hover:text-red-600">삭제</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]

export default createColumns
