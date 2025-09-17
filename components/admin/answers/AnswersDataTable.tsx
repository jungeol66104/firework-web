"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Loader } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createAnswersColumns } from "./AnswersColumns"
import { createClient } from "@/lib/supabase/clients/client"
import { fetchAllAnswers } from "@/lib/admin/adminServices"

interface Answer {
  id: string
  interview_id: string
  question_id: string
  answer_data: any
  comment: string | null
  created_at: string
  updated_at: string
}

export function AnswersDataTable() {
  const [data, setData] = useState<Answer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const questionId = searchParams.get('question_id')

  // Fetch answers data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const supabase = createClient()

        // If questionId is provided, fetch that question's answers
        if (questionId) {
          const result = await fetchAllAnswers(supabase, { limit: 50, question_id: questionId })
          setData(result.answers)
        } else {
          // Fetch all answers
          const result = await fetchAllAnswers(supabase, { limit: 50 })
          setData(result.answers)
        }
      } catch (error) {
        console.error('Error fetching answers:', error)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [questionId])

  const handleAnswerClick = (answerId: string) => {
    router.push(`/admin/answers/${answerId}`)
  }

  // Create columns
  const columns = createAnswersColumns(handleAnswerClick)

  // Create table instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  const getEmptyMessage = () => {
    if (questionId) {
      return "이 질문에 대한 답변이 없습니다."
    }
    return "답변이 없습니다."
  }

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <div className={data.length > 0 ? "min-w-[768px]" : ""}>
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())
                            }
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className="hover:bg-muted/50 transition-colors h-[49px] cursor-pointer"
                          onClick={() => handleAnswerClick(row.original.id)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="w-full h-24 text-center">
                          {getEmptyMessage()}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-end py-4">
            <div className="flex items-center space-x-6">
              <div className="hidden sm:block text-sm text-muted-foreground">
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of {table.getFilteredRowModel().rows.length}
              </div>
              <div className="hidden sm:flex items-center space-x-2">
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                    const pageSize = Number(value)
                    table.setPageSize(pageSize)
                  }}
                >
                  <SelectTrigger className="w-[70px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`} className="cursor-pointer">
                        {pageSize}
                      </SelectItem>
                    ))}
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
        </>
      )}
    </div>
  )
}