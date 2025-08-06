import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Interview } from "@/utils/types"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useState } from "react"
import { toast } from "sonner"

const createColumns = (router: any, onDelete?: (id: string) => Promise<void>): ColumnDef<Interview>[] => [
  {
    accessorKey: "index",
    header: () => "",
    cell: ({ row }) => <div className="font-medium w-1 text-center">{row.index + 1}</div>,
  },
  {
    accessorKey: "company_name",
    header: "기업명",
    cell: ({ row }) => <div>{row.getValue("company_name")}</div>,
  },
  {
    accessorKey: "position",
    header: "직무",
    cell: ({ row }) => <div>{row.getValue("position")}</div>,
  },
  {
    accessorKey: "created_at",
    header: () => <div className="w-9 min-w-9 max-w-9 ">생성</div>,
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string
      const formattedDate = date ? new Date(date).toISOString().split('T')[0] : ''
      return <div className="w-9 min-w-9 max-w-9">{formattedDate}</div>
    },
  },
  {
    id: "actions",
    enableHiding: false,
    header: () => "",
    cell: ({ row }) => {
      const item = row.original
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

      const copyToClipboard = async (text: string) => {
        try {
          await navigator.clipboard.writeText(text)
          toast.success("링크가 클립보드에 복사되었습니다")
        } catch (err) {
          console.error("Failed to copy:", err)
          toast.error("링크 복사에 실패했습니다")
        }
      }

      const handleDelete = async () => {
        if (onDelete) {
          try {
            await onDelete(item.id)
            console.log("Interview deleted successfully")
            setIsDeleteDialogOpen(false)
          } catch (error) {
            console.error("Failed to delete interview:", error)
            alert("면접 삭제에 실패했습니다. 다시 시도해주세요.")
          }
        }
      }

      return (
        <div className="w-0">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="h-8 w-8 p-0 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="sr-only">메뉴 열기</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  copyToClipboard(`${window.location.origin}/${item.id}/interaction`)
                }}
                className="cursor-pointer"
              >
                링크 복사
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  setIsDeleteDialogOpen(true)
                }} 
                className="cursor-pointer !text-red-600 !hover:text-red-600"
              >
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>면접 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  정말로 이 면접을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete()
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
    },
  },
]

export default createColumns 