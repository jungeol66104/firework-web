"use client"

import { useState, useEffect } from "react"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Loader, ChevronRight, ChevronDown } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createBetaInterviewColumns } from "./BetaInterviewColumns"

// Combined type for questions and answers
interface InterviewItem {
  id: string
  type: 'question' | 'answer'
  index: string // Q1, Q2, A1, A2, etc.
  content: string
  created_at: string
  status?: string
  isJob?: boolean
  questionId?: string // For answers, which question they belong to
  isExpanded?: boolean // For questions, whether their answers are shown
  level: number // 0 for questions, 1 for answers (for indentation)
}

interface BetaInterviewDataTableProps {
  questions: any[]
  answers: any[]
  isLoading: boolean
  onDelete?: (id: string, type: 'question' | 'answer') => Promise<void>
  onSetCurrent?: (item: InterviewItem) => void
  currentQuestionId?: string
  currentAnswerId?: string
}

export function BetaInterviewDataTable({
  questions,
  answers,
  isLoading,
  onDelete,
  onSetCurrent,
  currentQuestionId,
  currentAnswerId
}: BetaInterviewDataTableProps) {
  const [displayData, setDisplayData] = useState<InterviewItem[]>([])
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())

  // Helper function to get 2nd + 3rd questions for display
  const getSecondAndThirdQuestions = (questionData: any): string => {
    if (!questionData || typeof questionData !== 'object') {
      return "질문 데이터 없음"
    }

    const { general_personality } = questionData

    if (!Array.isArray(general_personality) || general_personality.length < 3) {
      return "질문 데이터 부족"
    }

    // Get 2nd question (index 1) + space + 3rd question (index 2)
    const secondQuestion = general_personality[1] || ""
    const thirdQuestion = general_personality[2] || ""

    return `${secondQuestion} ${thirdQuestion}`
  }

  // Helper function to get first answer for display
  const getFirstAnswer = (answerData: any): string => {
    if (!answerData || typeof answerData !== 'object') {
      return "답변 데이터 없음"
    }

    const { general_personality } = answerData

    if (!Array.isArray(general_personality) || general_personality.length < 1) {
      return "답변 데이터 부족"
    }

    // Get first answer and truncate if too long
    const firstAnswer = general_personality[0] || ""
    return firstAnswer.length > 100 ? firstAnswer.substring(0, 100) + "..." : firstAnswer
  }

  // Convert questions and answers to unified format
  useEffect(() => {
    const questionItems: InterviewItem[] = questions.map((q, index) => ({
      id: q.id,
      type: 'question' as const,
      index: `Q${index + 1}`,
      content: q.question_data ? getSecondAndThirdQuestions(q.question_data) : (q.question_text || "질문 없음"),
      created_at: q.created_at,
      status: q.status,
      isJob: q.isJob,
      isExpanded: expandedQuestions.has(q.id),
      level: 0
    }))

    // Create display data with expanded answers
    const result: InterviewItem[] = []

    questionItems.forEach(questionItem => {
      result.push(questionItem)

      if (expandedQuestions.has(questionItem.id)) {
        // Find answers for this question
        const questionAnswers = answers.filter(a => a.question_id === questionItem.id)
        const answerItems: InterviewItem[] = questionAnswers.map((a, index) => ({
          id: a.id,
          type: 'answer' as const,
          index: `A${index + 1}`,
          content: a.answer_data ? getFirstAnswer(a.answer_data) : (a.answer_text || "답변 없음"),
          created_at: a.created_at,
          status: a.status,
          isJob: a.isJob,
          questionId: questionItem.id,
          level: 1
        }))

        result.push(...answerItems)
      }
    })

    setDisplayData(result)
  }, [questions, answers, expandedQuestions])

  const handleToggleExpand = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }

  const handleChevronClick = (e: React.MouseEvent, questionId: string) => {
    e.stopPropagation()
    handleToggleExpand(questionId)
  }

  const handleItemClick = (item: InterviewItem) => {
    if (item.type === 'question') {
      // For questions: if not expanded, expand and select; if expanded, just select
      if (!expandedQuestions.has(item.id)) {
        handleToggleExpand(item.id)
      }
      // Set as current selection
      if (onSetCurrent) {
        onSetCurrent(item)
      }
    } else {
      // For answers, just set as current
      if (onSetCurrent) {
        onSetCurrent(item)
      }
    }
  }

  const handleDelete = async (id: string, type: 'question' | 'answer') => {
    if (onDelete) {
      try {
        await onDelete(id, type)
        // Note: Parent component will handle updating the questions/answers arrays
      } catch (error) {
        console.error(`Error deleting ${type}:`, error)
      }
    }
  }

  // Create columns with handlers
  const columns = createBetaInterviewColumns(handleDelete, handleItemClick, handleChevronClick, currentQuestionId, currentAnswerId)

  // Create table instance
  const table = useReactTable({
    data: displayData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="flex justify-center items-center py-4">
          <Loader className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <div className="w-full">
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <div className={displayData.length > 0 ? "min-w-[768px]" : ""}>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          style={{
                            minWidth: header.column.columnDef.minSize,
                            maxWidth: header.column.columnDef.maxSize,
                          }}
                        >
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
                    table.getRowModel().rows.map((row) => {
                      const item = row.original
                      const isSelected = item.type === 'question' ? currentQuestionId === item.id : currentAnswerId === item.id
                      const isQuestion = item.type === 'question'

                      return (
                        <TableRow
                          key={row.id}
                          data-state={isSelected && "selected"}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-blue-50 hover:bg-blue-100 border-blue-200"
                              : "hover:bg-muted/50"
                          }`}
                          style={isSelected ? { backgroundColor: '#dbeafe' } : undefined}
                          onClick={() => handleItemClick(item)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} style={{
                              minWidth: cell.column.columnDef.minSize,
                              maxWidth: cell.column.columnDef.maxSize,
                            }}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="w-full h-24 text-center">
                        질문이 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}