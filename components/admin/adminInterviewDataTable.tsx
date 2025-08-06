"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable, ColumnDef } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Loader } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminCreateInterviewButton } from "@/components/admin/adminCreateInterviewButton"
import { Interview } from "@/utils/types"
import createColumns from "@/components/admin/adminInterviewColumns"
import { deleteInterviewClient, searchInterviewsByCandidateNameClient, getCurrentUserInterviewsClient } from "@/utils/supabase/services/clientServices"
import { createClient } from "@/utils/supabase/clients/client"

export function AdminInterviewDataTable() {
  const router = useRouter()
  const [data, setData] = useState<Interview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    getCurrentUser()
  }, [])

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return
      
      try {
        const result = await getCurrentUserInterviewsClient({ limit: 50 })
        setData(result.interviews)
      } catch (error) {
        console.error('Error fetching interviews:', error)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      fetchData()
    }
  }, [userId])

  const handleDelete = async (id: string) => {
    try {
      await deleteInterviewClient(id, userId || undefined)
      // Update local state immediately
      setData(prevData => prevData.filter(interview => interview.id !== id))
    } catch (error) {
      console.error('Error deleting interview:', error)
      // Optionally show error message to user
    }
  }

  // Create columns with router and delete handler
  const columns = createColumns(router, handleDelete)
  
  // Create table instance
  const table = useReactTable({ 
    data, 
    columns, 
    getCoreRowModel: getCoreRowModel(), 
    getPaginationRowModel: getPaginationRowModel() 
  })

  const handleInterviewCreated = (newInterview: Interview) => {
    // Add the new interview to the beginning of the list
    setData(prevData => [newInterview, ...prevData])
  }

  const performSearch = useCallback(async (searchTerm: string) => {
    if (!userId) return
    
    if (!searchTerm.trim()) {
      // If search is cleared, fetch all interviews again
      // Only show loading for initial data fetch, not for search
      try {
        const result = await getCurrentUserInterviewsClient({ limit: 50 })
        setData(result.interviews)
      } catch (error) {
        console.error('Error fetching interviews:', error)
        setData([])
      }
      return
    }

    // Don't set loading state for search - keep table visible
    try {
      const interviews = await searchInterviewsByCandidateNameClient(searchTerm, 50, userId)
      setData(interviews)
    } catch (error) {
      console.error('Error searching interviews:', error)
      setData([])
    }
  }, [userId])

  const handleSearch = useCallback((searchTerm: string) => {
    // Clear any existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    // If search term is empty, immediately fetch all data
    if (!searchTerm.trim()) {
      performSearch('')
      return
    }

    // Set a new timeout for the search
    const timeout = setTimeout(() => {
      performSearch(searchTerm)
    }, 300) // 300ms debounce delay

    setSearchTimeout(timeout)
  }, [searchTimeout, performSearch])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchTimeout])

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input 
          placeholder="지원자명으로 검색..." 
          className="max-w-sm" 
          onChange={(e) => handleSearch(e.target.value)}
        />
        <div className="ml-auto">
          <AdminCreateInterviewButton onInterviewCreated={handleInterviewCreated} />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-4">
          <Loader className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <>
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
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      현재 데이터베이스에 면접 기록이 없습니다. 새로운 면접을 생성해보세요.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination controls */}
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
                    table.setPageSize(pageSize)
                  }}
                >
                  <SelectTrigger className="w-[70px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{[10, 20, 30, 40, 50].map((pageSize) => (<SelectItem key={pageSize} value={`${pageSize}`} className="cursor-pointer">{pageSize}</SelectItem>))}</SelectContent>
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