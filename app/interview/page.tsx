"use client"

import { useState, useEffect, useRef } from "react"
import { Loader, History, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

// Helper function to format question_data into HTML with optional answers merged
const formatQuestionDataAsHTML = (
  questionData: any,
  answerData?: any,
  selectedItems?: Set<string>,
  onItemClick?: (itemId: string) => void,
  showEditDropdown?: string | null,
  editText?: string,
  onEditTextChange?: (text: string) => void,
  onEditSave?: () => void,
  onEditCancel?: () => void
): React.ReactNode => {
  if (!questionData || typeof questionData !== 'object') {
    return <div className="text-gray-500">유효하지 않은 질문 데이터입니다</div>
  }

  const { general_personality, cover_letter_personality, cover_letter_competency } = questionData

  if (!Array.isArray(general_personality) || !Array.isArray(cover_letter_personality) || !Array.isArray(cover_letter_competency)) {
    return <div className="text-gray-500">질문 데이터 형식이 올바르지 않습니다</div>
  }

  // Extract answers if provided
  const answers = answerData ? {
    general_personality: answerData.general_personality || [],
    cover_letter_personality: answerData.cover_letter_personality || [],
    cover_letter_competency: answerData.cover_letter_competency || []
  } : null

  const handleItemClick = (itemId: string) => {
    if (onItemClick) {
      onItemClick(itemId)
    }
  }

  return (
    <div className="text-black">
      <div className="mb-0">
        <h3 className="font-bold text-sm mb-0 px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">일반 인성면접 질문 (10개)</h3>
        <div>
          {general_personality.map((q, i) => {
            const itemId = `general_personality_${i}`
            const isSelected = selectedItems?.has(itemId) || false
            return (
              <div
                key={i}
                className={`relative text-sm cursor-pointer border-b border-gray-100 transition-colors ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleItemClick(itemId)}
              >
                <div className="px-4 py-3">
                  <div className="flex mb-2">
                    <span className="w-6 flex-shrink-0 font-medium">{i + 1}.</span>
                    <span className="flex-1 font-medium">{q}</span>
                  </div>
                  {answers && answers.general_personality[i] && (
                    <div className="ml-6 mt-2 text-gray-700 whitespace-pre-wrap">
                      {answers.general_personality[i]}
                    </div>
                  )}
                </div>
                {showEditDropdown === itemId && (
                  <div className="absolute left-10 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg" data-edit-dropdown>
                    <div className="p-2">
                      <Textarea
                        value={editText || ""}
                        onChange={(e) => onEditTextChange?.(e.target.value)}
                        placeholder="수정할 내용을 입력하세요..."
                        className="mb-3 border-0 focus:ring-0 shadow-none focus:outline-none focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onEditSave}>
                          수정
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-0">
        <h3 className="font-bold text-sm mb-0 px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">자기소개서 기반 인성면접 질문 (10개)</h3>
        <div>
          {cover_letter_personality.map((q, i) => {
            const itemId = `cover_letter_personality_${i}`
            const isSelected = selectedItems?.has(itemId) || false
            return (
              <div
                key={i}
                className={`relative text-sm cursor-pointer border-b border-gray-100 transition-colors ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleItemClick(itemId)}
              >
                <div className="px-4 py-3">
                  <div className="flex mb-2">
                    <span className="w-6 flex-shrink-0 font-medium">{i + 1}.</span>
                    <span className="flex-1 font-medium">{q}</span>
                  </div>
                  {answers && answers.cover_letter_personality[i] && (
                    <div className="ml-6 mt-2 text-gray-700 whitespace-pre-wrap">
                      {answers.cover_letter_personality[i]}
                    </div>
                  )}
                </div>
                {showEditDropdown === itemId && (
                  <div className="absolute left-10 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg" data-edit-dropdown>
                    <div className="p-2">
                      <Textarea
                        value={editText || ""}
                        onChange={(e) => onEditTextChange?.(e.target.value)}
                        placeholder="수정할 내용을 입력하세요..."
                        className="mb-3 border-0 focus:ring-0 shadow-none focus:outline-none focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onEditSave}>
                          수정
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-0">
        <h3 className="font-bold text-sm mb-0 px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">자기소개서 기반 직무 역량 확인 질문 (10개)</h3>
        <div>
          {cover_letter_competency.map((q, i) => {
            const itemId = `cover_letter_competency_${i}`
            const isSelected = selectedItems?.has(itemId) || false
            return (
              <div
                key={i}
                className={`text-sm cursor-pointer transition-colors ${
                  i < cover_letter_competency.length - 1 ? 'border-b border-gray-100' : ''
                } ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                onClick={() => handleItemClick(itemId)}
              >
                <div className="px-4 py-3">
                  <div className="flex mb-2">
                    <span className="w-6 flex-shrink-0 font-medium">{i + 1}.</span>
                    <span className="flex-1 font-medium">{q}</span>
                  </div>
                  {answers && answers.cover_letter_competency[i] && (
                    <div className="ml-6 mt-2 text-gray-700 whitespace-pre-wrap">
                      {answers.cover_letter_competency[i]}
                    </div>
                  )}
                </div>
                {showEditDropdown === itemId && (
                  <div className="absolute left-10 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg" data-edit-dropdown>
                    <div className="p-2">
                      <Textarea
                        value={editText || ""}
                        onChange={(e) => onEditTextChange?.(e.target.value)}
                        placeholder="수정할 내용을 입력하세요..."
                        className="mb-3 border-0 focus:ring-0 shadow-none focus:outline-none focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onEditSave}>
                          수정
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  const [questionData, setQuestionData] = useState<any>(null)
  const [answerData, setAnswerData] = useState<any>(null)
  const [companyName, setCompanyName] = useState<string>("회사명")
  const [jobPosition, setJobPosition] = useState<string>("직무명")
  const [selectedVersion, setSelectedVersion] = useState<string>("최신")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showEditDropdown, setShowEditDropdown] = useState<string | null>(null)
  const [editText, setEditText] = useState<string>("")
  const [showHistoryDialog, setShowHistoryDialog] = useState<boolean>(false)
  const [interviewId, setInterviewId] = useState<string | null>(null)
  const [showQuestionsDialog, setShowQuestionsDialog] = useState<boolean>(false)
  const [showAnswersDialog, setShowAnswersDialog] = useState<boolean>(false)
  const [generationComment, setGenerationComment] = useState<string>("")

  const handleItemClick = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleEditClick = () => {
    const selectedItemId = Array.from(selectedItems)[0]
    setShowEditDropdown(selectedItemId)
    setEditText("")
  }

  const handleEditSave = () => {
    // TODO: Implement save logic
    console.log("Saving edit for:", showEditDropdown, "Text:", editText)
    setShowEditDropdown(null)
    setEditText("")
  }

  const handleEditCancel = () => {
    setShowEditDropdown(null)
    setEditText("")
  }

  const handleGenerateQuestions = async () => {
    if (!interviewId) return

    try {
      const response = await fetch(`/api/interviews/${interviewId}/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: generationComment
        })
      })

      if (response.ok) {
        console.log('Questions generation started')
        setShowQuestionsDialog(false)
        setGenerationComment("")
        // You can add toast notification or refresh logic here
      } else {
        console.error('Failed to start questions generation')
      }
    } catch (error) {
      console.error('Error generating questions:', error)
    }
  }

  const handleGenerateAnswers = async () => {
    if (!interviewId) return

    try {
      const response = await fetch(`/api/interviews/${interviewId}/generate-answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: generationComment
        })
      })

      if (response.ok) {
        console.log('Answers generation started')
        setShowAnswersDialog(false)
        setGenerationComment("")
        // You can add toast notification or refresh logic here
      } else {
        console.error('Failed to start answers generation')
      }
    } catch (error) {
      console.error('Error generating answers:', error)
    }
  }

  // Click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEditDropdown) {
        const target = event.target as Element
        const dropdown = document.querySelector('[data-edit-dropdown]')
        if (dropdown && !dropdown.contains(target)) {
          setShowEditDropdown(null)
          setEditText("")
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEditDropdown])

  useEffect(() => {
    const fetchLatestData = async () => {
      try {
        setLoading(true)

        // First get the latest interview
        const interviewsResponse = await fetch('/api/interviews/latest')
        if (!interviewsResponse.ok) {
          throw new Error('Failed to fetch latest interview')
        }
        const latestInterview = await interviewsResponse.json()

        if (!latestInterview?.id) {
          throw new Error('No interviews found')
        }

        // Set company name and job position from interview data
        setCompanyName(latestInterview.company_name || "회사명")
        setJobPosition(latestInterview.position || "직무명")
        setInterviewId(latestInterview.id)

        // Then get questions and answers for that interview
        const [questionsResponse, answersResponse] = await Promise.all([
          fetch(`/api/interviews/${latestInterview.id}/questions`),
          fetch(`/api/interviews/${latestInterview.id}/answers`)
        ])

        if (questionsResponse.ok) {
          const questions = await questionsResponse.json()
          if (questions.length > 0) {
            setQuestionData(questions[0].question_data)
          }
        }

        if (answersResponse.ok) {
          const answers = await answersResponse.json()
          if (answers.length > 0) {
            setAnswerData(answers[0].answer_data)
          }
        }

      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchLatestData()
  }, [])

  return (
    <div className="h-[calc(100vh-60px)] overflow-hidden">
      {/* Desktop layout */}
      <div className="hidden sm:flex sm:justify-center sm:items-start sm:gap-4 h-full">
        <div className="w-full max-w-4xl flex gap-4 h-full">
          <div className="w-full flex flex-col justify-center items-center gap-4 h-full">
            <div className="w-full max-w-4xl p-4 h-full flex flex-col">
              <div className="h-full flex flex-col border border-gray-300 rounded-md bg-white">
                {/* Company Header Section - Inside Card */}
                <div className="h-15 px-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-left text-gray-900">
                      {companyName}
                    </h1>
                    <span className="text-sm text-gray-500">
                      {jobPosition}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-8 text-sm" onClick={() => setShowQuestionsDialog(true)}>
                      질문지 생성
                    </Button>
                    <Button variant="outline" className="h-8 text-sm" onClick={() => setShowAnswersDialog(true)}>
                      답변지 생성
                    </Button>
                    <Button variant="outline" className="h-8 text-sm" disabled={selectedItems.size !== 1} onClick={handleEditClick}>
                      수정
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="h-8 w-8 p-0">
                          <History className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl p-0">
                        <DialogHeader className="px-6 py-4">
                          <DialogTitle>History</DialogTitle>
                        </DialogHeader>
                        <div className="px-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell>2024-01-15</TableCell>
                                <TableCell>Questions</TableCell>
                                <TableCell>Completed</TableCell>
                                <TableCell>View</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>2024-01-14</TableCell>
                                <TableCell>Answers</TableCell>
                                <TableCell>In Progress</TableCell>
                                <TableCell>View</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>2024-01-13</TableCell>
                                <TableCell>Questions</TableCell>
                                <TableCell>Failed</TableCell>
                                <TableCell>Retry</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                      <SelectTrigger className="w-24 !h-8 text-sm !min-h-0 !py-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="최신">최신</SelectItem>
                        <div className="px-2 py-1 border-t border-gray-200">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-8 justify-start text-sm"
                          >
                            <Plus className="h-3 w-3 mr-2" />
                            새로 저장
                          </Button>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Content that fills exact remaining space */}
                <div className="flex-1 overflow-y-scroll">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader className="h-4 w-4 animate-spin text-black" />
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center h-full text-red-600">
                      {error}
                    </div>
                  ) : questionData ? (
                    <div>
                      <div>
                        {formatQuestionDataAsHTML(
                          questionData,
                          answerData,
                          selectedItems,
                          handleItemClick,
                          showEditDropdown,
                          editText,
                          setEditText,
                          handleEditSave,
                          handleEditCancel
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      질문 데이터를 찾을 수 없습니다
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile content */}
      <div className="sm:hidden h-full flex flex-col">
        <div className="flex flex-col items-center h-full">
          <div className="w-full h-full flex flex-col">
            <div className="w-full p-4 h-full flex flex-col">
              <div className="h-full flex flex-col border border-gray-300 rounded-md bg-white">
                {/* Company Header Section - Inside Card Mobile */}
                <div className="p-4 border-b border-gray-200 flex-shrink-0">
                  <h1 className="text-xl font-bold text-left text-gray-900">
                    {companyName}
                  </h1>
                </div>

                {/* Content that fills exact remaining space Mobile */}
                <div className="flex-1 overflow-y-scroll p-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader className="h-4 w-4 animate-spin text-black" />
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center h-full text-red-600">
                      {error}
                    </div>
                  ) : questionData ? (
                    <div>
                      <div>
                        {formatQuestionDataAsHTML(
                          questionData,
                          answerData,
                          selectedItems,
                          handleItemClick,
                          showEditDropdown,
                          editText,
                          setEditText,
                          handleEditSave,
                          handleEditCancel
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      질문 데이터를 찾을 수 없습니다
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Generation Dialog */}
      <AlertDialog open={showQuestionsDialog} onOpenChange={setShowQuestionsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>질문지 생성</AlertDialogTitle>
            <AlertDialogDescription>
              3 토큰이 차감됩니다. 새로운 질문을 생성하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mb-4">
            <Textarea
              value={generationComment}
              onChange={(e) => setGenerationComment(e.target.value)}
              placeholder="질문 생성 시 참고할 코멘트를 입력하세요 (선택사항)"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGenerationComment("")}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateQuestions}>
              생성
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Answers Generation Dialog */}
      <AlertDialog open={showAnswersDialog} onOpenChange={setShowAnswersDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>답변지 생성</AlertDialogTitle>
            <AlertDialogDescription>
              6 토큰이 차감됩니다. 새로운 답변을 생성하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mb-4">
            <Textarea
              value={generationComment}
              onChange={(e) => setGenerationComment(e.target.value)}
              placeholder="답변 생성 시 참고할 코멘트를 입력하세요 (선택사항)"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGenerationComment("")}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateAnswers}>
              생성
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}