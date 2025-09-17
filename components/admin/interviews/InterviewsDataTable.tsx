"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Loader } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Interview } from "@/lib/types"
import { createInterviewsColumns } from "./InterviewsColumns"
import { createClient } from "@/lib/supabase/clients/client"
import { fetchAllInterviews, getUserById } from "@/lib/admin/adminServices"

export function InterviewsDataTable() {
  const [data, setData] = useState<Interview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<{ name: string } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('user_id')

  // Fetch interviews data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const supabase = createClient()

        // If userId is provided, fetch that user's info and interviews
        if (userId) {
          const [interviewsResult, user] = await Promise.all([
            fetchAllInterviews(supabase, { limit: 50, user_id: userId }),
            getUserById(supabase, userId)
          ])
          setData(interviewsResult.interviews)
          setUserInfo(user ? { name: user.name } : null)
        } else {
          // Fetch all interviews
          const result = await fetchAllInterviews(supabase, { limit: 50 })
          setData(result.interviews)
          setUserInfo(null)
        }
      } catch (error) {
        console.error('Error fetching interviews:', error)
        setData([])
        setUserInfo(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const handleQuestionsClick = (interviewId: string, candidateName: string) => {
    // Preserve user_id in the URL for breadcrumbs
    const params = new URLSearchParams()
    params.set('interview_id', interviewId)
    if (userId) {
      params.set('user_id', userId)
    }
    router.push(`/admin/questions?${params.toString()}`)
  }

  const handleInterviewClick = (interviewId: string) => {
    router.push(`/admin/interviews/${interviewId}`)
  }

  // Create columns with handlers
  const columns = createInterviewsColumns(handleQuestionsClick, handleInterviewClick)

  // Create table instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  const getTitle = () => {
    if (userId && userInfo) {
      return `${userInfo.name}님의 면접 목록`
    }
    return "전체 면접 목록"
  }

  const getEmptyMessage = () => {
    if (userId && userInfo) {
      return `${userInfo.name}님의 면접이 없습니다.`
    }
    return "면접이 없습니다."
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
                          onClick={() => handleInterviewClick(row.original.id)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              data-actions-cell={cell.column.id === 'actions' ? 'true' : undefined}
                            >
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