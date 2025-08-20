"use client"

import { useState, useEffect } from "react"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Loader } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import createAnswerColumns from "./answersColumns"

// Define the Answer type for the history table
interface AnswerHistory {
  id: string
  answer: string
  answer_data?: any
  created_at: string
  question_id: string
}

interface AnswerDataTableProps {
  data: AnswerHistory[]
  setData: React.Dispatch<React.SetStateAction<AnswerHistory[]>>
  isLoading: boolean
  onDelete?: (id: string) => Promise<void>
  onSetCurrent?: (answer: string, answerId: string, answerData?: any) => void
  currentAnswerId?: string
}

export function AnswerDataTable({ 
  data, 
  setData, 
  isLoading,
  onDelete,
  onSetCurrent,
  currentAnswerId
}: AnswerDataTableProps) {
  const handleDelete = async (id: string) => {
    if (onDelete) {
      try {
        await onDelete(id)
        // Remove the deleted answer from the state
        setData(prevData => prevData.filter(answer => answer.id !== id))
      } catch (error) {
        console.error('Error deleting answer:', error)
      }
    }
  }

  // Create columns with delete handler
  const columns = createAnswerColumns(handleDelete, onSetCurrent, currentAnswerId)
  
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
        <>
          <div className="rounded-md border">
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
                      className={`transition-colors cursor-pointer ${
                        currentAnswerId === row.original.id 
                          ? "bg-blue-50 hover:bg-blue-100 border-blue-200" 
                          : "hover:bg-muted/50"
                      }`}
                      onClick={(e) => {
                        // Don't trigger row click if clicking on actions cell
                        const target = e.target as HTMLElement
                        if (target.closest('[data-actions-cell="true"]')) {
                          return
                        }
                        if (onSetCurrent) {
                          onSetCurrent(row.original.answer, row.original.id, row.original.answer_data)
                        }
                      }}
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
                      답변 기록이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}

