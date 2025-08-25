"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Loader } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Interview } from "@/lib/types"
import createTestColumns from "@/components/dashboard/interviewsColumns"
import { deleteInterviewClient } from "@/lib/supabase/services/clientServices"

interface InterviewDataTableProps {
  data: Interview[]
  setData: React.Dispatch<React.SetStateAction<Interview[]>>
  isLoading: boolean
  userId: string | null
  handleInterviewCreated: (newInterview: Interview) => void
  handleInterviewDeleted: (deletedId: string) => void
}

export function InterviewDataTable({ 
  data, 
  setData, 
  isLoading, 
  userId, 
  handleInterviewCreated, 
  handleInterviewDeleted 
}: InterviewDataTableProps) {
  const router = useRouter()

  const handleDelete = async (id: string) => {
    try {
      await deleteInterviewClient(id, userId || undefined)
      // Call the parent's delete handler to update the state
      handleInterviewDeleted(id)
    } catch (error) {
      console.error('Error deleting interview:', error)
      // Optionally show error message to user
    }
  }

  // Create columns with router and delete handler
  const columns = createTestColumns(router, handleDelete)
  
  // Create table instance
  const table = useReactTable({ 
    data, 
    columns, 
    getCoreRowModel: getCoreRowModel(), 
    getPaginationRowModel: getPaginationRowModel() 
  })

  return (
    <div className="w-full">
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
                    <TableRow 
                      key={row.id} 
                      data-state={row.getIsSelected() && "selected"}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={(e) => {
                        // Don't navigate if clicking on the actions column or any button
                        const target = e.target as HTMLElement
                        if (target.closest('[data-actions-cell]') || 
                            target.closest('button') || 
                            target.closest('[role="button"]') ||
                            target.closest('[data-radix-collection-item]')) {
                          return
                        }
                        router.push(`/interviews/${row.original.id}`)
                      }}
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
                      면접 기록이 없습니다. 새로운 면접을 생성해보세요.
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