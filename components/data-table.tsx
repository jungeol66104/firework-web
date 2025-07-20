"use client"

import * as React from "react"
import { ColumnDef,flexRender,getCoreRowModel,getPaginationRowModel,useReactTable} from "@tanstack/react-table"
import { FileText, MoreHorizontal, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataItem } from "@/lib/types"
import { sampleData } from "@/lib/constants"
import { useRouter } from "next/navigation"

const data: DataItem[] = sampleData

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
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 group" onClick={() => console.log("Question clicked:", row.getValue("question"))}><FileText className="h-4 w-4 group-hover:text-blue-600 transition-colors" /></Button>
        </div>
    ),
  },
  {
    accessorKey: "answer",
    header: () => <div>답변</div>,
    cell: ({ row }) => (
        <div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 group" onClick={() => console.log("Answer clicked:", row.getValue("answer"))}><FileText className="h-4 w-4 group-hover:text-blue-600 transition-colors" /></Button>
        </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "생성",
    cell: ({ row }) => <div>{row.getValue("createdAt")}</div>,
  },
  {
    accessorKey: "updatedAt",
    header: "수정",
    cell: ({ row }) => <div>{row.getValue("updatedAt")}</div>,
  },
  {
    id: "actions",
    enableHiding: false,
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">메뉴 열기</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => copyToClipboard(item.id)}>ID 복사</DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log("Delete item:", item.id)} className="text-red-600">삭제</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export function DataTable() {
  const router = useRouter()
  const columns = createColumns(router)
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel() })

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input placeholder="이름으로 검색..." className="max-w-sm" />
        <Button variant="outline" className="ml-auto" onClick={() => router.push("/create")}>새 면접 생성</Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                        {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())
                        }
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">결과가 없습니다.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end py-4">
        <div className="flex items-center space-x-6">
          <div className="text-sm text-muted-foreground">
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of {table.getFilteredRowModel().rows.length}
          </div>
          
          <div className="flex items-center space-x-2">
                      <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                const pageSize = Number(value)
                if (pageSize === -1) {
                  table.setPageSize(table.getFilteredRowModel().rows.length)
                } else {
                  table.setPageSize(pageSize)
                }
              }}
            >
            <SelectTrigger className="w-[70px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
              <SelectItem value="-1">
                전체
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="h-9 w-9 p-0"
            >
              <span className="sr-only">첫 페이지</span>
              <ChevronFirst className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-9 w-9 p-0"
            >
              <span className="sr-only">이전 페이지</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-9 w-9 p-0"
            >
              <span className="sr-only">다음 페이지</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="h-9 w-9 p-0"
            >
              <span className="sr-only">마지막 페이지</span>
              <ChevronLast className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 