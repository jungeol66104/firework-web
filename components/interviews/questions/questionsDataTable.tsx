"use client"

import { useState, useEffect } from "react"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Loader } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import createQuestionColumns from "./questionsColumns"

// Define the Question type for the history table
interface QuestionHistory {
  id: string
  question: string
  created_at: string
}

interface QuestionDataTableProps {
  data: QuestionHistory[]
  setData: React.Dispatch<React.SetStateAction<QuestionHistory[]>>
  isLoading: boolean
  onDelete?: (id: string) => Promise<void>
  onSetCurrent?: (question: string) => void
}

export function QuestionDataTable({ 
  data, 
  setData, 
  isLoading,
  onDelete,
  onSetCurrent
}: QuestionDataTableProps) {
  const handleDelete = async (id: string) => {
    if (onDelete) {
      try {
        await onDelete(id)
        // Remove the deleted question from the state
        setData(prevData => prevData.filter(question => question.id !== id))
      } catch (error) {
        console.error('Error deleting question:', error)
      }
    }
  }

  // Create columns with delete handler and set current handler
  const columns = createQuestionColumns(handleDelete, onSetCurrent)
  
  // Create table instance
  const table = useReactTable({ 
    data, 
    columns, 
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="flex justify-center items-center py-4">
          <Loader className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <div className="w-full">
          <div className="rounded-md border w-full">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} style={{
                          minWidth: header.column.columnDef.minSize,
                          maxWidth: header.column.columnDef.maxSize,
                        }}>
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
                      className="hover:bg-muted/50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell 
                          key={cell.id}
                          data-actions-cell={cell.column.id === 'actions' ? 'true' : undefined}
                          style={{
                            minWidth: cell.column.columnDef.minSize,
                            maxWidth: cell.column.columnDef.maxSize,
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="w-full h-24 text-center">
                      질문 기록이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}


