"use client"

import { useState, useEffect, useRef, useMemo, Suspense } from "react"
import { Loader, History, Plus, ChevronDown, MoreHorizontal, MoreVertical, FileText, Trash2 } from "lucide-react"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { getCurrentUserClient, updateInterviewClient } from "@/lib/supabase/services/clientServices"
import { extractTextFromDocument } from "@/lib/utils/documentExtractor"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ReportModal from "@/components/interview/ReportModal"
import { useInterviews, useStore, useRefreshTokens } from "@/lib/zustand"
import { Interview } from "@/lib/types"
import { createClient } from "@/lib/supabase/clients/client"
import { getCurrentUserInterviewsClient } from "@/lib/supabase/services/clientServices"
import { useSearchParams, useRouter } from "next/navigation"
import { useJobPolling } from "@/hooks/useJobPolling"
import { toast } from "sonner"

// Helper function to check if a question was selected for answer generation
const isQuestionSelectedForAnswerGen = (job: any, category: string, index: number): boolean => {
  if (!job?.input_data?.selectedQuestions) return false
  return job.input_data.selectedQuestions.some((q: any) =>
    q.category === category && q.index === index
  )
}

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
  onEditCancel?: () => void,
  onEditQA?: (type: 'question' | 'answer', category: string, index: number, text: string) => void,
  onRegenerateQA?: (type: 'question' | 'answer', category: string, index: number, text: string) => void,
  job?: any,
  isPolling?: boolean
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
            const questionId = `general_personality_q_${i}`
            const answerId = `general_personality_a_${i}`
            const isQuestionSelected = selectedItems?.has(questionId) || false
            const isAnswerSelected = selectedItems?.has(answerId) || false

            // Check if question has content
            const hasQuestionContent = q && typeof q === 'string' && q.trim().length > 0

            return (
              <div key={i}>
                {/* Question */}
                <div
                  className={`relative text-sm border-b border-gray-200 transition-colors group ${
                    hasQuestionContent ? 'cursor-pointer' : 'cursor-default opacity-50'
                  } ${isQuestionSelected ? 'bg-blue-50' : hasQuestionContent ? 'hover:bg-gray-50' : ''}`}
                  onClick={() => hasQuestionContent && handleItemClick(questionId)}
                >
                  <div className="px-2 py-3">
                    <div className="flex items-start gap-2">
                      <span className="w-6 flex-shrink-0 font-medium leading-6">{i + 1}.</span>
                      {(isPolling &&
                       ((job?.type === 'question_edited' && job?.input_data?.category === 'general_personality' && job?.input_data?.index === i) ||
                        (job?.type === 'question_regenerated' && job?.input_data?.category === 'general_personality' && job?.input_data?.index === i))) ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Loader className="h-4 w-4 animate-spin text-gray-400" />
                          <span className="text-gray-400 leading-6">{job?.type === 'question_edited' ? '수정 중...' : '재생성 중...'}</span>
                        </div>
                      ) : (
                        <span className={`flex-1 font-medium leading-6 ${!hasQuestionContent ? 'text-gray-400 italic' : ''}`}>
                          {hasQuestionContent ? q : '(질문 없음)'}
                        </span>
                      )}
                      {/* Invisible placeholder to maintain layout spacing */}
                      <div className="h-6 w-6 flex-shrink-0" />
                    </div>
                  </div>
                  {showEditDropdown === questionId && (
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

                {/* Answer */}
                {((answers && answers.general_personality[i]) || (isPolling && job?.type === 'answers_generated' && isQuestionSelectedForAnswerGen(job, 'general_personality', i))) ? (
                  <div
                    className={`relative text-sm border-b border-gray-200 transition-colors group cursor-pointer ${
                      isAnswerSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleItemClick(answerId)}
                  >
                    <div className="px-2 py-3">
                      <div className="flex gap-2">
                        {(isPolling &&
                         ((job?.type === 'answer_edited' && job?.input_data?.category === 'general_personality' && job?.input_data?.index === i) ||
                          (job?.type === 'answer_regenerated' && job?.input_data?.category === 'general_personality' && job?.input_data?.index === i))) ? (
                          <div className="flex-1 ml-8 flex items-center gap-2">
                            <Loader className="h-4 w-4 animate-spin text-gray-400" />
                            <span className="text-gray-400 leading-6">{job?.type === 'answer_edited' ? '수정 중...' : '재생성 중...'}</span>
                          </div>
                        ) : (isPolling && job?.type === 'answers_generated' && isQuestionSelectedForAnswerGen(job, 'general_personality', i) && !answers?.general_personality[i]) ? (
                          <div className="flex-1 ml-8 flex items-center gap-2">
                            <Loader className="h-4 w-4 animate-spin text-gray-400" />
                            <span className="text-gray-400 leading-6">답변 생성 중...</span>
                          </div>
                        ) : answers?.general_personality[i] ? (
                          <div className="flex-1 ml-8 text-gray-700 whitespace-pre-wrap leading-6">
                            {answers.general_personality[i]}
                          </div>
                        ) : null}
                        {answers?.general_personality[i] && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 flex-shrink-0 self-start text-gray-300 group-hover:text-black hover:bg-transparent"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEditQA?.('answer', 'general_personality', i, answers.general_personality[i])
                                }}
                              >
                                수정
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onRegenerateQA?.('answer', 'general_personality', i, answers.general_personality[i])
                                }}
                              >
                                재생성
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    {showEditDropdown === answerId && (
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
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-0">
        <h3 className="font-bold text-sm mb-0 px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">자기소개서 기반 인성면접 질문 (10개)</h3>
        <div>
          {cover_letter_personality.map((q, i) => {
            const questionId = `cover_letter_personality_q_${i}`
            const answerId = `cover_letter_personality_a_${i}`
            const isQuestionSelected = selectedItems?.has(questionId) || false
            const isAnswerSelected = selectedItems?.has(answerId) || false

            // Check if question has content
            const hasQuestionContent = q && typeof q === 'string' && q.trim().length > 0

            return (
              <div key={i}>
                {/* Question */}
                <div
                  className={`relative text-sm border-b border-gray-200 transition-colors group ${
                    hasQuestionContent ? 'cursor-pointer' : 'cursor-default opacity-50'
                  } ${isQuestionSelected ? 'bg-blue-50' : hasQuestionContent ? 'hover:bg-gray-50' : ''}`}
                  onClick={() => hasQuestionContent && handleItemClick(questionId)}
                >
                  <div className="px-2 py-3">
                    <div className="flex items-start gap-2">
                      <span className="w-6 flex-shrink-0 font-medium leading-6">{i + 1}.</span>
                      {(isPolling &&
                       ((job?.type === 'question_edited' && job?.input_data?.category === 'cover_letter_personality' && job?.input_data?.index === i) ||
                        (job?.type === 'question_regenerated' && job?.input_data?.category === 'cover_letter_personality' && job?.input_data?.index === i))) ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Loader className="h-4 w-4 animate-spin text-gray-400" />
                          <span className="text-gray-400 leading-6">{job?.type === 'question_edited' ? '수정 중...' : '재생성 중...'}</span>
                        </div>
                      ) : (
                        <span className={`flex-1 font-medium leading-6 ${!hasQuestionContent ? 'text-gray-400 italic' : ''}`}>
                          {hasQuestionContent ? q : '(질문 없음)'}
                        </span>
                      )}
                      {/* Invisible placeholder to maintain layout spacing */}
                      <div className="h-6 w-6 flex-shrink-0" />
                    </div>
                  </div>
                  {showEditDropdown === questionId && (
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

                {/* Answer */}
                {((answers && answers.cover_letter_personality[i]) || (isPolling && job?.type === 'answers_generated' && isQuestionSelectedForAnswerGen(job, 'cover_letter_personality', i))) ? (
                  <div
                    className={`relative text-sm border-b border-gray-200 transition-colors group cursor-pointer ${
                      isAnswerSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleItemClick(answerId)}
                  >
                    <div className="px-2 py-3">
                      <div className="flex gap-2">
                        {(isPolling &&
                         ((job?.type === 'answer_edited' && job?.input_data?.category === 'cover_letter_personality' && job?.input_data?.index === i) ||
                          (job?.type === 'answer_regenerated' && job?.input_data?.category === 'cover_letter_personality' && job?.input_data?.index === i))) ? (
                          <div className="flex-1 ml-8 flex items-center gap-2">
                            <Loader className="h-4 w-4 animate-spin text-gray-400" />
                            <span className="text-gray-400 leading-6">{job?.type === 'answer_edited' ? '수정 중...' : '재생성 중...'}</span>
                          </div>
                        ) : (isPolling && job?.type === 'answers_generated' && isQuestionSelectedForAnswerGen(job, 'cover_letter_personality', i) && !answers?.cover_letter_personality[i]) ? (
                          <div className="flex-1 ml-8 flex items-center gap-2">
                            <Loader className="h-4 w-4 animate-spin text-gray-400" />
                            <span className="text-gray-400 leading-6">답변 생성 중...</span>
                          </div>
                        ) : answers?.cover_letter_personality[i] ? (
                          <div className="flex-1 ml-8 text-gray-700 whitespace-pre-wrap leading-6">
                            {answers.cover_letter_personality[i]}
                          </div>
                        ) : null}
                        {answers?.cover_letter_personality[i] && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 flex-shrink-0 self-start text-gray-300 group-hover:text-black hover:bg-transparent"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEditQA?.('answer', 'cover_letter_personality', i, answers.cover_letter_personality[i])
                                }}
                              >
                                수정
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onRegenerateQA?.('answer', 'cover_letter_personality', i, answers.cover_letter_personality[i])
                                }}
                              >
                                재생성
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    {showEditDropdown === answerId && (
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
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-0">
        <h3 className="font-bold text-sm mb-0 px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">자기소개서 기반 직무 역량 확인 질문 (10개)</h3>
        <div>
          {cover_letter_competency.map((q, i) => {
            const questionId = `cover_letter_competency_q_${i}`
            const answerId = `cover_letter_competency_a_${i}`
            const isQuestionSelected = selectedItems?.has(questionId) || false
            const isAnswerSelected = selectedItems?.has(answerId) || false

            // Check if question has content
            const hasQuestionContent = q && typeof q === 'string' && q.trim().length > 0

            return (
              <div key={i}>
                {/* Question */}
                <div
                  className={`relative text-sm border-b border-gray-200 transition-colors group ${
                    hasQuestionContent ? 'cursor-pointer' : 'cursor-default opacity-50'
                  } ${isQuestionSelected ? 'bg-blue-50' : hasQuestionContent ? 'hover:bg-gray-50' : ''}`}
                  onClick={() => hasQuestionContent && handleItemClick(questionId)}
                >
                  <div className="px-2 py-3">
                    <div className="flex items-start gap-2">
                      <span className="w-6 flex-shrink-0 font-medium leading-6">{i + 1}.</span>
                      {(isPolling &&
                       ((job?.type === 'question_edited' && job?.input_data?.category === 'cover_letter_competency' && job?.input_data?.index === i) ||
                        (job?.type === 'question_regenerated' && job?.input_data?.category === 'cover_letter_competency' && job?.input_data?.index === i))) ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Loader className="h-4 w-4 animate-spin text-gray-400" />
                          <span className="text-gray-400 leading-6">{job?.type === 'question_edited' ? '수정 중...' : '재생성 중...'}</span>
                        </div>
                      ) : (
                        <span className={`flex-1 font-medium leading-6 ${!hasQuestionContent ? 'text-gray-400 italic' : ''}`}>
                          {hasQuestionContent ? q : '(질문 없음)'}
                        </span>
                      )}
                      {/* Invisible placeholder to maintain layout spacing */}
                      <div className="h-6 w-6 flex-shrink-0" />
                    </div>
                  </div>
                  {showEditDropdown === questionId && (
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

                {/* Answer */}
                {((answers && answers.cover_letter_competency[i]) || (isPolling && job?.type === 'answers_generated' && isQuestionSelectedForAnswerGen(job, 'cover_letter_competency', i))) ? (
                  <div
                    className={`relative text-sm border-b border-gray-200 transition-colors group cursor-pointer ${
                      isAnswerSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleItemClick(answerId)}
                  >
                    <div className="px-2 py-3">
                      <div className="flex gap-2">
                        {(isPolling &&
                         ((job?.type === 'answer_edited' && job?.input_data?.category === 'cover_letter_competency' && job?.input_data?.index === i) ||
                          (job?.type === 'answer_regenerated' && job?.input_data?.category === 'cover_letter_competency' && job?.input_data?.index === i))) ? (
                          <div className="flex-1 ml-8 flex items-center gap-2">
                            <Loader className="h-4 w-4 animate-spin text-gray-400" />
                            <span className="text-gray-400 leading-6">{job?.type === 'answer_edited' ? '수정 중...' : '재생성 중...'}</span>
                          </div>
                        ) : (isPolling && job?.type === 'answers_generated' && isQuestionSelectedForAnswerGen(job, 'cover_letter_competency', i) && !answers?.cover_letter_competency[i]) ? (
                          <div className="flex-1 ml-8 flex items-center gap-2">
                            <Loader className="h-4 w-4 animate-spin text-gray-400" />
                            <span className="text-gray-400 leading-6">답변 생성 중...</span>
                          </div>
                        ) : answers?.cover_letter_competency[i] ? (
                          <div className="flex-1 ml-8 text-gray-700 whitespace-pre-wrap leading-6">
                            {answers.cover_letter_competency[i]}
                          </div>
                        ) : null}
                        {answers?.cover_letter_competency[i] && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 flex-shrink-0 self-start text-gray-300 group-hover:text-black hover:bg-transparent"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEditQA?.('answer', 'cover_letter_competency', i, answers.cover_letter_competency[i])
                                }}
                              >
                                수정
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onRegenerateQA?.('answer', 'cover_letter_competency', i, answers.cover_letter_competency[i])
                                }}
                              >
                                재생성
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    {showEditDropdown === answerId && (
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
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const formSchema = z.object({
  companyName: z.string().optional(),
  position: z.string().optional(),
  jobPosting: z.string().optional(),
  coverLetter: z.string().optional(),
  resume: z.string().optional(),
  companyInfo: z.string().optional(),
  expectedQuestions: z.string().optional(),
  companyEvaluation: z.string().optional(),
  otherNotes: z.string().optional(),
})

type InfoFormData = z.infer<typeof formSchema>

function InterviewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Get interviews from Zustand store
  const interviews = useInterviews()
  const isLoadingInterviews = useStore((state) => state.isLoading)
  const setInterviews = useStore((state) => state.setInterviews)
  const setLoadingInterviews = useStore((state) => state.setLoading)
  const setCurrentUserId = useStore((state) => state.setCurrentUserId)
  const currentUserId = useStore((state) => state.currentUserId)
  const reset = useStore((state) => state.reset)

  // Token management
  const refreshTokens = useRefreshTokens()

  const [questionData, setQuestionData] = useState<any>(null)
  const [answerData, setAnswerData] = useState<any>(null)
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<string>("최신")

  const handleVersionChange = (version: string) => {
    if (version === 'create-new-version') {
      // TODO: Implement create new version logic
      console.log('Creating new version...')
      return
    }
    setSelectedVersion(version)
  }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStartingGeneration, setIsStartingGeneration] = useState(false)
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [selectedAnswers, setSelectedAnswers] = useState<Set<string>>(new Set())

  // Combined selectedItems for backward compatibility with formatQuestionDataAsHTML
  const selectedItems = useMemo(() => new Set([...selectedQuestions, ...selectedAnswers]), [selectedQuestions, selectedAnswers])

  const [showEditDropdown, setShowEditDropdown] = useState<string | null>(null)
  const [editText, setEditText] = useState<string>("")
  const [showHistoryDialog, setShowHistoryDialog] = useState<boolean>(false)
  const [showQuestionsDialog, setShowQuestionsDialog] = useState<boolean>(false)
  const [showAnswersDialog, setShowAnswersDialog] = useState<boolean>(false)
  const [generationComment, setGenerationComment] = useState<string>("")
  const [userId, setUserId] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'qa' | 'info'>('qa')
  const [isCompletingJob, setIsCompletingJob] = useState(false) // Tracks if job completed but data not yet fetched

  // Edit/Regenerate dialog states
  const [showEditQADialog, setShowEditQADialog] = useState(false)
  const [showRegenerateQADialog, setShowRegenerateQADialog] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedQAItem, setSelectedQAItem] = useState<{
    type: 'question' | 'answer'
    category: string
    index: number
    text: string
  } | null>(null)
  const [qaOperationComment, setQaOperationComment] = useState("")

  const [qaHistory, setQaHistory] = useState<Array<{
    id: string
    name: string
    type: string
    is_default: boolean
    created_at: string
  }>>([])
  const [viewingQaId, setViewingQaId] = useState<string | null>(null)
  const [currentQaId, setCurrentQaId] = useState<string | null>(null) // Track the current Q&A ID for reports
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProcessingDocument, setIsProcessingDocument] = useState(false)
  const [showCreateInterviewDialog, setShowCreateInterviewDialog] = useState(false)
  const [newInterviewCompanyName, setNewInterviewCompanyName] = useState("")
  const [newInterviewPosition, setNewInterviewPosition] = useState("")
  const [isCreatingInterview, setIsCreatingInterview] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeletingInterview, setIsDeletingInterview] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [renameQaId, setRenameQaId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState("")

  // Form for basic info
  const form = useForm<InfoFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      position: "",
      jobPosting: "",
      coverLetter: "",
      resume: "",
      companyInfo: "",
      expectedQuestions: "",
      companyEvaluation: "",
      otherNotes: "",
    },
  })

  // Poll job status
  const { job, isPolling: hookIsPolling } = useJobPolling(currentJobId)
  // Keep showing loaders during completion until data is fetched
  const isPolling = hookIsPolling || isCompletingJob

  // Reset isStartingGeneration when we have the job data
  useEffect(() => {
    if (hookIsPolling && job?.type === 'questions_generated') {
      setIsStartingGeneration(false)
    }
  }, [hookIsPolling, job])

  const handleItemClick = (itemId: string) => {
    // Determine if it's a question or answer
    const isQuestion = itemId.includes('_q_')
    const isAnswer = itemId.includes('_a_')

    if (isQuestion) {
      setSelectedQuestions(prev => {
        const newSet = new Set(prev)
        if (newSet.has(itemId)) {
          newSet.delete(itemId)
        } else {
          newSet.add(itemId)
        }
        return newSet
      })
    } else if (isAnswer) {
      setSelectedAnswers(prev => {
        const newSet = new Set(prev)
        if (newSet.has(itemId)) {
          newSet.delete(itemId)
        } else {
          newSet.add(itemId)
        }
        return newSet
      })
    }
  }

  // Auto-close history panel when switching to info view
  useEffect(() => {
    if (activeView === 'info') {
      setIsHistoryPanelOpen(false)
    }
  }, [activeView])

  const handleEditClick = () => {
    // Get first selected item (question or answer)
    const firstQuestion = Array.from(selectedQuestions)[0]
    const firstAnswer = Array.from(selectedAnswers)[0]
    const selectedItemId = firstQuestion || firstAnswer
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

  // Update form when selectedInterview changes
  useEffect(() => {
    if (selectedInterview) {
      form.reset({
        companyName: selectedInterview.company_name || "",
        position: selectedInterview.position || "",
        jobPosting: selectedInterview.job_posting || "",
        coverLetter: selectedInterview.cover_letter || "",
        resume: selectedInterview.resume || "",
        companyInfo: selectedInterview.company_info || "",
        expectedQuestions: selectedInterview.expected_questions || "",
        companyEvaluation: selectedInterview.company_evaluation || "",
        otherNotes: selectedInterview.other || "",
      })

      // Check if required fields are filled (excluding optional fields)
      const hasJobPosting = selectedInterview.job_posting && selectedInterview.job_posting.trim() !== ""
      const hasCoverLetter = selectedInterview.cover_letter && selectedInterview.cover_letter.trim() !== ""
      const hasResume = selectedInterview.resume && selectedInterview.resume.trim() !== ""
      const hasCompanyInfo = selectedInterview.company_info && selectedInterview.company_info.trim() !== ""

      // If any required field is missing, show info view
      if (!hasJobPosting || !hasCoverLetter || !hasResume || !hasCompanyInfo) {
        setActiveView('info')
      }
    }
  }, [selectedInterview, form])

  const handleInfoFormSubmit = async (data: InfoFormData) => {
    if (!selectedInterview?.id) {
      toast.error("면접 ID를 찾을 수 없습니다.")
      return
    }

    setIsSubmitting(true)
    try {
      const user = await getCurrentUserClient()

      if (!user?.id) {
        toast.error("사용자 인증이 필요합니다. 다시 로그인해주세요.")
        return
      }

      const updateData = {
        company_name: data.companyName || "",
        position: data.position || "",
        job_posting: data.jobPosting || "",
        cover_letter: data.coverLetter || "",
        resume: data.resume || "",
        company_info: data.companyInfo || "",
        expected_questions: data.expectedQuestions || "",
        company_evaluation: data.companyEvaluation || "",
        other: data.otherNotes || "",
      }

      const updatedInterview = await updateInterviewClient(selectedInterview.id, updateData, user.id)

      // Update selected interview
      setSelectedInterview(updatedInterview)

      toast.success("면접 정보가 성공적으로 저장되었습니다!")
    } catch (error) {
      console.error("Error updating interview:", error)
      toast.error("저장 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessingDocument(true)
    try {
      const extractedText = await extractTextFromDocument(file)
      form.setValue('resume', extractedText)
      const fileType = file.type === 'application/pdf' ? 'PDF' : 'Word 문서'
      toast.success(`${fileType}에서 텍스트를 성공적으로 추출했습니다!`)
    } catch (error) {
      console.error('Document processing error:', error)
      toast.error(error instanceof Error ? error.message : '문서 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessingDocument(false)
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleInterviewChange = (interviewId: string) => {
    if (interviewId === 'create-new') {
      // Open create interview dialog
      setShowCreateInterviewDialog(true)
      return
    }

    const interview = interviews.find(i => i.id === interviewId)
    if (interview) {
      setSelectedInterview(interview)
      // Update URL with interview ID
      const params = new URLSearchParams(searchParams.toString())
      params.set('id', interviewId)
      router.push(`/interview?${params.toString()}`)
    }
  }

  const handleCreateInterview = async () => {
    if (!newInterviewCompanyName.trim() || !newInterviewPosition.trim() || !userId) {
      toast.error("회사명과 직무를 모두 입력해주세요.")
      return
    }

    setIsCreatingInterview(true)
    try {
      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_name: newInterviewCompanyName.trim(),
          position: newInterviewPosition.trim(),
          user_id: userId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create interview')
      }

      const newInterview = await response.json()

      toast.success('새 면접이 생성되었습니다.')

      // Reload interviews
      const { interviews: updatedInterviews } = await getCurrentUserInterviewsClient()
      setInterviews(updatedInterviews)

      // Select new interview
      setSelectedInterview(newInterview)
      router.push(`/interview?id=${newInterview.id}`)

      // Close dialog and reset form
      setShowCreateInterviewDialog(false)
      setNewInterviewCompanyName("")
      setNewInterviewPosition("")
    } catch (error) {
      console.error('Error creating interview:', error)
      toast.error('면접 생성 중 오류가 발생했습니다.')
    } finally {
      setIsCreatingInterview(false)
    }
  }

  const handleDeleteInterview = async () => {
    if (!selectedInterview?.id) return

    // Check if user typed the correct confirmation text
    if (deleteConfirmText !== '삭제') {
      toast.error('삭제를 입력해주세요.')
      return
    }

    setIsDeletingInterview(true)
    try {
      const response = await fetch(`/api/interviews/${selectedInterview.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete interview')
      }

      toast.success('면접이 삭제되었습니다.')

      // Reload interviews
      const { interviews: updatedInterviews } = await getCurrentUserInterviewsClient()
      setInterviews(updatedInterviews)

      // Select first interview or navigate to dashboard
      if (updatedInterviews.length > 0) {
        setSelectedInterview(updatedInterviews[0])
        router.push(`/interview?id=${updatedInterviews[0].id}`)
      } else {
        router.push('/dashboard')
      }

      // Close dialog and reset
      setShowDeleteDialog(false)
      setDeleteConfirmText("")
    } catch (error) {
      console.error('Error deleting interview:', error)
      toast.error('면접 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeletingInterview(false)
    }
  }

  const handleGenerateQuestions = async () => {
    if (!selectedInterview?.id) return

    // Validate required fields
    const hasJobPosting = selectedInterview.job_posting && selectedInterview.job_posting.trim() !== ""
    const hasCoverLetter = selectedInterview.cover_letter && selectedInterview.cover_letter.trim() !== ""
    const hasResume = selectedInterview.resume && selectedInterview.resume.trim() !== ""
    const hasCompanyInfo = selectedInterview.company_info && selectedInterview.company_info.trim() !== ""

    const missingFields = []
    if (!hasJobPosting) missingFields.push('채용 공고')
    if (!hasCoverLetter) missingFields.push('자기소개서')
    if (!hasResume) missingFields.push('이력서')
    if (!hasCompanyInfo) missingFields.push('기업정보')

    if (missingFields.length > 0) {
      toast.error(
        `질문 생성을 위해 다음 필수 정보를 입력해주세요:\n${missingFields.join(', ')}`,
        { duration: 5000 }
      )
      setShowQuestionsDialog(false)
      return
    }

    try {
      setIsStartingGeneration(true)
      const response = await fetch(`/api/interviews/${selectedInterview.id}/qa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'questions_generated',
          data: {}
        })
      })

      if (response.ok) {
        const { jobId } = await response.json()
        // Clear old data to show loader
        setQuestionData(null)
        setAnswerData(null)
        setCurrentJobId(jobId)
        setShowQuestionsDialog(false)
        toast.info('질문 생성 중... (약 60-90초 소요)')
      } else {
        const error = await response.json()
        setIsStartingGeneration(false)

        // Handle insufficient tokens
        if (error.error === 'INSUFFICIENT_TOKENS') {
          toast.error(
            `토큰이 부족합니다!\n필요: ${error.required} 토큰\n보유: ${error.available} 토큰`,
            { duration: 5000 }
          )
        } else {
          toast.error(error.message || error.error || '질문 생성 시작 실패')
        }
      }
    } catch (error) {
      console.error('Error generating questions:', error)
      toast.error('질문 생성 중 오류가 발생했습니다')
      setIsStartingGeneration(false)
    }
  }

  const handleGenerateAnswers = async () => {
    if (!selectedInterview?.id) return

    // Validate selection
    if (selectedQuestions.size === 0) {
      toast.error('질문을 먼저 선택해주세요')
      return
    }

    try {
      // Parse selected items to extract question info
      const selectedQuestionsArray: Array<{category: string, index: number, text: string}> = []

      selectedQuestions.forEach(itemId => {
        // Parse itemId format: "category_q_index"
        const match = itemId.match(/^(.+)_q_(\d+)$/)
        if (match) {
          const category = match[1]
          const index = parseInt(match[2])

          // Get question text from questionData
          if (questionData && questionData[category] && questionData[category][index]) {
            selectedQuestionsArray.push({
              category,
              index,
              text: questionData[category][index]
            })
          }
        }
      })

      if (selectedQuestionsArray.length === 0) {
        toast.error('유효한 질문이 선택되지 않았습니다')
        return
      }

      const response = await fetch(`/api/interviews/${selectedInterview.id}/qa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'answers_generated',
          data: {
            selectedQuestions: selectedQuestionsArray,
            comment: generationComment
          }
        })
      })

      if (response.ok) {
        const { jobId } = await response.json()
        setCurrentJobId(jobId)
        setShowAnswersDialog(false)
        setGenerationComment("")
        toast.info(`답변 생성 중... ${selectedQuestionsArray.length}개 질문 (약 60-90초 소요)`)
      } else {
        const error = await response.json()

        // Handle insufficient tokens
        if (error.error === 'INSUFFICIENT_TOKENS') {
          toast.error(
            `토큰이 부족합니다!\n필요: ${error.required} 토큰\n보유: ${error.available} 토큰`,
            { duration: 5000 }
          )
        } else {
          toast.error(error.message || error.error || '답변 생성 시작 실패')
        }
      }
    } catch (error) {
      console.error('Error generating answers:', error)
      toast.error('답변 생성 중 오류가 발생했습니다')
    }
  }

  // Check if Zustand store is hydrated
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Get current user and reset store if user changed
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const newUserId = user?.id || null

      // If user changed, reset the store
      if (currentUserId && currentUserId !== newUserId) {
        reset()
        setHasInitialized(false)
      }

      setUserId(newUserId)
      setCurrentUserId(newUserId)
    }
    getCurrentUser()
  }, [setCurrentUserId, reset, currentUserId])

  // Fetch interviews from Zustand if not already loaded
  useEffect(() => {
    const fetchInterviews = async () => {
      if (!userId || hasInitialized || !isHydrated) return

      // If we already have interviews data, don't fetch again
      if (interviews.length > 0) {
        setHasInitialized(true)
        setLoadingInterviews(false)
        return
      }

      try {
        setLoadingInterviews(true)
        const result = await getCurrentUserInterviewsClient({ limit: 50 })
        setInterviews(result.interviews)
        setHasInitialized(true)
      } catch (error) {
        console.error('Error fetching interviews:', error)
        setInterviews([])
        setHasInitialized(true)
      } finally {
        setLoadingInterviews(false)
      }
    }

    if (userId && isHydrated) {
      fetchInterviews()
    }
  }, [userId, interviews.length, hasInitialized, isHydrated, setInterviews, setLoadingInterviews])

  // Set selected interview based on URL param or default to latest
  useEffect(() => {
    if (!isHydrated || interviews.length === 0) return

    const interviewIdFromUrl = searchParams.get('id')

    // If URL has ID and it matches current selection, skip
    if (interviewIdFromUrl && selectedInterview?.id === interviewIdFromUrl) return

    let targetInterview: Interview | null = null

    if (interviewIdFromUrl) {
      // Try to find interview from URL
      targetInterview = interviews.find(i => i.id === interviewIdFromUrl) || interviews[0]
    } else {
      // No URL param, use latest interview
      targetInterview = interviews[0]
    }

    // Set selected interview and update URL
    if (targetInterview) {
      setSelectedInterview(targetInterview)

      // Update URL if it doesn't match (use replace to avoid history entry)
      if (!interviewIdFromUrl || interviewIdFromUrl !== targetInterview.id) {
        const params = new URLSearchParams(searchParams.toString())
        params.set('id', targetInterview.id)
        // Use window.history.replaceState for smoother navigation without triggering re-render
        window.history.replaceState(null, '', `/interview?${params.toString()}`)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviews, isHydrated, searchParams])

  // Fetch questions and answers when selected interview changes
  useEffect(() => {
    if (selectedInterview?.id) {
      // Reset history selection state when changing interviews
      setSelectedHistoryId(null)
      setViewingQaId(null)

      fetchInterviewData()
      fetchHistory()
    }
  }, [selectedInterview])

  // Handle job completion
  useEffect(() => {
    if (!job) {
      setIsCompletingJob(false)
      return
    }

    if (job.status === 'completed') {
      // Mark as completing to keep loaders visible
      setIsCompletingJob(true)

      toast.success('생성이 완료되었습니다!')

      // Refresh tokens in navbar
      refreshTokens()

      // DON'T clear job yet - keep loaders showing until data is ready
      // Smoothly update by fetching latest Q&A data
      if (selectedInterview?.id) {
        // Fetch the latest questions and answers (which are the newly generated ones)
        Promise.all([
          fetch(`/api/interviews/${selectedInterview.id}/questions`).then(res => res.json()),
          fetch(`/api/interviews/${selectedInterview.id}/answers`).then(res => res.json()),
          fetchHistory()
        ])
          .then(([questions, answers]) => {
            console.log('Received questions:', questions)
            console.log('Received answers:', answers)

            // Update state smoothly without full page reload
            // API returns array of objects with id and question_data/answer_data fields
            if (questions && questions.length > 0 && questions[0].question_data) {
              setQuestionData(questions[0].question_data)
              setCurrentQaId(questions[0].id) // Store the Q&A ID for reports
              console.log('Updated question data with ID:', questions[0].id)
            }

            // For question generation/regeneration, always update answers (clears old answers)
            // For answer generation, update if new answers exist
            if (job?.type === 'questions_generated' || job?.type === 'question_regenerated' || job?.type === 'question_edited') {
              // Question changed = clear/reset answers with fresh empty structure
              if (answers && answers.length > 0 && answers[0].answer_data) {
                setAnswerData(answers[0].answer_data)
                console.log('Updated answer data (cleared for new questions)')
              } else {
                // Fallback: create empty structure if API doesn't return it
                const emptyAnswers = {
                  general_personality: Array(10).fill(null),
                  cover_letter_personality: Array(10).fill(null),
                  cover_letter_competency: Array(10).fill(null)
                }
                setAnswerData(emptyAnswers)
                console.log('Set empty answer data for new questions')
              }
            } else if (answers && answers.length > 0 && answers[0].answer_data) {
              // For answer operations, just update normally
              setAnswerData(answers[0].answer_data)
              console.log('Updated answer data')

              // Clear selected questions after answer generation completes
              if (job?.type === 'answers_generated') {
                setSelectedQuestions(new Set())
                console.log('Cleared selected questions after answer generation')
              }
            }

            // Only NOW clear the job and completing flag - data is ready, smooth transition!
            setIsCompletingJob(false)
            setCurrentJobId(null)
          })
          .catch(err => {
            console.error('Error updating Q&A data:', err)
            // Fallback to full refresh
            Promise.all([fetchInterviewData(), fetchHistory()]).then(() => {
              setIsCompletingJob(false)
              setCurrentJobId(null)
            })
          })
      } else {
        setIsCompletingJob(false)
        setCurrentJobId(null)
      }
    } else if (job.status === 'failed') {
      toast.error(job.error_message || '생성에 실패했습니다')
      setIsCompletingJob(false)
      setCurrentJobId(null)
    }
  }, [job?.status])

  // Helper function to fetch interview data
  const fetchInterviewData = async () => {
    if (!selectedInterview?.id) return

    try {
      setLoading(true)
      setError(null)

      const [questionsResponse, answersResponse] = await Promise.all([
        fetch(`/api/interviews/${selectedInterview.id}/questions`),
        fetch(`/api/interviews/${selectedInterview.id}/answers`)
      ])

      let hasData = false

      if (questionsResponse.ok) {
        const questions = await questionsResponse.json()
        if (questions.length > 0) {
          setQuestionData(questions[0].question_data)
          setCurrentQaId(questions[0].id) // Store the Q&A ID for reports
          hasData = true
        } else {
          setQuestionData(null)
          setCurrentQaId(null)
        }
      } else {
        setQuestionData(null)
        setCurrentQaId(null)
      }

      if (answersResponse.ok) {
        const answers = await answersResponse.json()
        if (answers.length > 0) {
          setAnswerData(answers[0].answer_data)
        } else {
          setAnswerData(null)
        }
      } else {
        setAnswerData(null)
      }

      if (!hasData) {
        setError('질문 데이터를 찾을 수 없습니다')
      }

    } catch (err) {
      console.error('Error fetching interview data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Handle Q&A item operations
  const handleEditQA = (type: 'question' | 'answer', category: string, index: number, text: string) => {
    setSelectedQAItem({ type, category, index, text })
    setQaOperationComment("")
    setShowEditQADialog(true)
  }

  const handleRegenerateQA = (type: 'question' | 'answer', category: string, index: number, text: string) => {
    setSelectedQAItem({ type, category, index, text })
    setQaOperationComment("")
    setShowRegenerateQADialog(true)
  }

  const submitEditQA = async () => {
    if (!selectedInterview?.id || !selectedQAItem) return

    try {
      const jobType = selectedQAItem.type === 'question' ? 'question_edited' : 'answer_edited'

      const response = await fetch(`/api/interviews/${selectedInterview.id}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: jobType,
          data: {
            category: selectedQAItem.category,
            index: selectedQAItem.index,
            comment: qaOperationComment
          }
        })
      })

      if (response.ok) {
        const { jobId } = await response.json()
        setCurrentJobId(jobId)
        setShowEditQADialog(false)
        setQaOperationComment("")
        toast.info(`${selectedQAItem.type === 'question' ? '질문' : '답변'} 수정 중...`)
      } else {
        const error = await response.json()

        // Handle insufficient tokens
        if (error.error === 'INSUFFICIENT_TOKENS') {
          toast.error(
            `토큰이 부족합니다!\n필요: ${error.required} 토큰\n보유: ${error.available} 토큰`,
            { duration: 5000 }
          )
        } else {
          toast.error(error.message || error.error || '수정 요청 실패')
        }
      }
    } catch (error) {
      console.error('Error submitting edit:', error)
      toast.error('수정 중 오류가 발생했습니다')
    }
  }

  const submitRegenerateQA = async () => {
    if (!selectedInterview?.id || !selectedQAItem) return

    try {
      const jobType = selectedQAItem.type === 'question' ? 'question_regenerated' : 'answer_regenerated'

      const response = await fetch(`/api/interviews/${selectedInterview.id}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: jobType,
          data: {
            category: selectedQAItem.category,
            index: selectedQAItem.index
            // No comment for regenerate - it's a pure regeneration
          }
        })
      })

      if (response.ok) {
        const { jobId } = await response.json()
        setCurrentJobId(jobId)
        setShowRegenerateQADialog(false)
        toast.info(`${selectedQAItem.type === 'question' ? '질문' : '답변'} 재생성 중...`)
      } else {
        const error = await response.json()

        // Handle insufficient tokens
        if (error.error === 'INSUFFICIENT_TOKENS') {
          toast.error(
            `토큰이 부족합니다!\n필요: ${error.required} 토큰\n보유: ${error.available} 토큰`,
            { duration: 5000 }
          )
        } else {
          toast.error(error.message || error.error || '재생성 요청 실패')
        }
      }
    } catch (error) {
      console.error('Error submitting regenerate:', error)
      toast.error('재생성 중 오류가 발생했습니다')
    }
  }

  // Fetch QA history
  const fetchHistory = async () => {
    if (!selectedInterview?.id) {
      console.log('fetchHistory: no selectedInterview')
      return
    }

    console.log('fetchHistory: fetching for interview', selectedInterview.id)
    try {
      const response = await fetch(`/api/interviews/${selectedInterview.id}/history`)
      console.log('fetchHistory response:', response.status)
      if (response.ok) {
        const { history } = await response.json()
        console.log('fetchHistory data:', history)
        setQaHistory(history || [])

        // If no version is currently selected and we're not viewing a specific version,
        // automatically select the default version in the history
        if (!selectedHistoryId && !viewingQaId && history && history.length > 0) {
          const defaultVersion = history.find((qa: any) => qa.is_default)
          if (defaultVersion) {
            setSelectedHistoryId(defaultVersion.id)
          }
        }
      } else {
        console.error('fetchHistory failed:', response.status, await response.text())
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }

  // Load a specific QA version
  const loadQaVersion = async (qaId: string) => {
    if (!selectedInterview?.id) return

    try {
      const response = await fetch(`/api/interviews/${selectedInterview.id}/qas/${qaId}`)
      if (response.ok) {
        const { qa } = await response.json()
        setQuestionData(qa.questions_data)
        setAnswerData(qa.answers_data)
        setViewingQaId(qaId)
        setSelectedHistoryId(qaId)
      }
    } catch (error) {
      console.error('Error loading QA version:', error)
      toast.error('버전 불러오기에 실패했습니다')
    }
  }

  // Set QA version as default
  const setAsDefaultVersion = async (qaId: string) => {
    if (!selectedInterview?.id) return

    try {
      const response = await fetch(`/api/interviews/${selectedInterview.id}/qas/${qaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setAsDefault: true })
      })

      if (response.ok) {
        toast.success('기본 버전으로 설정되었습니다')
        // Only refresh history to update the "기본" label, don't reload Q&A data
        fetchHistory()
      }
    } catch (error) {
      console.error('Error setting default:', error)
      toast.error('기본 버전 설정에 실패했습니다')
    }
  }

  // Rename QA version
  const renameQaVersion = async () => {
    if (!selectedInterview?.id || !renameQaId || !renameText.trim()) return

    try {
      const response = await fetch(`/api/interviews/${selectedInterview.id}/qas/${renameQaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameText.trim() })
      })

      if (response.ok) {
        toast.success('이름이 변경되었습니다')
        setShowRenameDialog(false)
        setRenameQaId(null)
        setRenameText("")
        fetchHistory()
      }
    } catch (error) {
      console.error('Error renaming:', error)
      toast.error('이름 변경에 실패했습니다')
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

  return (
    <div className="h-[calc(100vh-60px)] overflow-hidden">
      {/* Desktop layout */}
      <div className="hidden sm:flex sm:justify-center sm:items-start sm:gap-4 h-full">
        <div className="w-full max-w-4xl flex gap-4 h-full">
          <div className="w-full flex flex-col justify-center items-center gap-4 h-full">
            <div className="w-full px-4 pb-4 h-full flex flex-col">
              <div className="h-full flex flex-col border border-gray-300 rounded-md bg-white">
                {/* Company Header Section - Inside Card */}
                <div className="h-15 px-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {!isHydrated || !hasInitialized || (interviews.length > 0 && !selectedInterview) ? (
                      <Loader className="h-4 w-4 animate-spin text-gray-900" />
                    ) : hasInitialized && interviews.length === 0 ? (
                      <h1 className="text-xl font-bold text-left text-gray-900">새 면접 생성</h1>
                    ) : null}
                    {!(!isHydrated || !hasInitialized || (interviews.length > 0 && !selectedInterview)) && interviews.length > 0 && (
                      <Select
                        value={selectedInterview?.id || ""}
                        onValueChange={handleInterviewChange}
                      >
                        <SelectTrigger className="border-none shadow-none p-0 h-auto gap-2 hover:bg-transparent focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                          <h1 className="text-xl font-bold text-left text-gray-900">
                            {selectedInterview?.company_name || "회사명"}
                          </h1>
                        </SelectTrigger>
                        <SelectContent>
                          {interviews.map((interview) => (
                            <SelectItem key={interview.id} value={interview.id} className="cursor-pointer focus:text-foreground">
                              {interview.company_name} - {interview.position}
                            </SelectItem>
                          ))}
                          <SelectItem value="create-new" className="text-blue-600 font-medium cursor-pointer focus:text-blue-600">
                            새 면접 생성
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {selectedInterview && (
                      <span className="text-sm text-gray-500">
                        {selectedInterview.position}
                      </span>
                    )}
                  </div>
                  {interviews.length > 0 && (
                    <div className="flex items-center gap-3">
                      {/* Tabs for View Switching */}
                      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'info' | 'qa')} className="h-8">
                        <TabsList className="h-8 bg-gray-100">
                          <TabsTrigger value="qa" className="h-7 text-sm px-3 cursor-pointer">
                            질문/답변
                          </TabsTrigger>
                          <TabsTrigger value="info" className="h-7 text-sm px-3 cursor-pointer">
                            기본정보
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>

                      {/* More Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem
                            onClick={() => setShowDeleteDialog(true)}
                            className="text-red-600 cursor-pointer focus:text-red-600"
                          >
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                {/* Tab Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  {interviews.length === 0 ? (
                    /* Empty State - No Interviews */
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <p className="text-gray-500 text-center text-sm">
                        아직 생성된 면접이 없습니다.<br />
                        새 면접을 생성하여 준비를 시작해보세요.
                      </p>
                      <Button
                        variant="outline"
                        className="h-8 text-sm"
                        onClick={() => setShowCreateInterviewDialog(true)}
                      >
                        새 면접 생성
                      </Button>
                    </div>
                  ) : activeView === 'info' ? (
                    /* Info View Content */
                    <div className="h-full overflow-y-scroll">
                      <div className="p-6">
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(handleInfoFormSubmit)}>
                            {/* Required Fields */}
                            <div className="space-y-4">
                              <FormField control={form.control} name="companyName" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>기업명 *</FormLabel>
                                  <FormControl><Input placeholder="기업명을 입력하세요" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="position" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>직무 *</FormLabel>
                                  <FormControl><Input placeholder="직무를 입력하세요" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="jobPosting" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>채용공고 *</FormLabel>
                                  <FormControl><Textarea placeholder="채용공고 내용을 입력하세요" className="min-h-[100px]" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="coverLetter" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>자기소개서 *</FormLabel>
                                  <FormControl><Textarea placeholder="자기소개서 내용을 입력하세요" className="min-h-[100px]" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="resume" render={({ field }) => (
                                <FormItem>
                                  <div className="flex justify-between items-center" style={{height: '14px'}}>
                                    <FormLabel>이력서 *</FormLabel>
                                    <label
                                      className={`text-sm underline cursor-pointer ${
                                        isProcessingDocument ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'
                                      }`}
                                    >
                                      <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        onChange={handleDocumentUpload}
                                        className="hidden"
                                        disabled={isProcessingDocument}
                                      />
                                      {isProcessingDocument ? '처리 중...' : '파일 첨부 (PDF/Word)'}
                                    </label>
                                  </div>
                                  <FormControl><Textarea placeholder="이력서 내용을 입력하세요" className="min-h-[100px]" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="companyInfo" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>기업 정보 *</FormLabel>
                                  <FormControl><Textarea placeholder="기업에 대한 정보를 입력하세요" className="min-h-[100px]" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                            </div>

                            {/* Optional Fields */}
                            <div className="space-y-4 mt-4">
                              <FormField control={form.control} name="expectedQuestions" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>예상 질문 (선택)</FormLabel>
                                  <FormControl><Textarea placeholder="면접에서 예상되는 질문들을 입력하세요" className="min-h-[100px]" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="companyEvaluation" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>기업 평가 항목 (선택)</FormLabel>
                                  <FormControl><Textarea placeholder="기업이 공개한 평가 항목 및 비중을 입력하세요" className="min-h-[100px]" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="otherNotes" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>기타 (선택)</FormLabel>
                                  <FormControl><Textarea placeholder="기타 추가 정보를 입력하세요" className="min-h-[100px]" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                            </div>
                          </form>
                        </Form>
                      </div>
                    </div>
                  ) : (
                    /* Q&A View Content */
                    <ResizablePanelGroup direction="horizontal" className="flex-1">
                      {/* Left Panel - Main Content */}
                      <ResizablePanel defaultSize={isHistoryPanelOpen ? 67 : 100} minSize={30}>
                        <div className="h-full overflow-y-scroll">
                      <>
                        {!selectedInterview ? (
                          /* No interview selected yet - show skeleton */
                          <div className="flex items-center justify-center h-full">
                            <Loader className="h-4 w-4 animate-spin text-black" />
                          </div>
                        ) : loading ? (
                          /* Loading Q&A data */
                          <div className="flex items-center justify-center h-full">
                            <Loader className="h-4 w-4 animate-spin text-black" />
                          </div>
                        ) : (isPolling && job?.type === 'questions_generated' && !questionData) || isStartingGeneration ? (
                          // Generating 30 questions - show skeleton loaders
                          <div>
                            <div className="mb-0">
                              <h3 className="font-bold text-sm mb-0 px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">일반 인성면접 질문 (10개)</h3>
                              <div>
                                {Array.from({ length: 10 }, (_, i) => (
                                  <div key={i} className="px-2 py-3 border-b border-gray-200 flex items-center gap-2 text-sm">
                                    <span className="w-6 flex-shrink-0 font-medium text-gray-400">{i + 1}.</span>
                                    <Loader className="h-4 w-4 flex-shrink-0 animate-spin text-gray-400" />
                                    <span className="text-gray-400 font-medium leading-6">질문 생성 중...</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="mb-0">
                              <h3 className="font-bold text-sm mb-0 px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">자기소개서 기반 인성면접 질문 (10개)</h3>
                              <div>
                                {Array.from({ length: 10 }, (_, i) => (
                                  <div key={i} className="px-2 py-3 border-b border-gray-200 flex items-center gap-2 text-sm">
                                    <span className="w-6 flex-shrink-0 font-medium text-gray-400">{i + 1}.</span>
                                    <Loader className="h-4 w-4 flex-shrink-0 animate-spin text-gray-400" />
                                    <span className="text-gray-400 font-medium leading-6">질문 생성 중...</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="mb-0">
                              <h3 className="font-bold text-sm mb-0 px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">자기소개서 기반 직무 역량 확인 질문 (10개)</h3>
                              <div>
                                {Array.from({ length: 10 }, (_, i) => (
                                  <div key={i} className="px-2 py-3 border-b border-gray-200 flex items-center gap-2 text-sm">
                                    <span className="w-6 flex-shrink-0 font-medium text-gray-400">{i + 1}.</span>
                                    <Loader className="h-4 w-4 flex-shrink-0 animate-spin text-gray-400" />
                                    <span className="text-gray-400 font-medium leading-6">질문 생성 중...</span>
                                  </div>
                                ))}
                              </div>
                            </div>
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
                                handleEditCancel,
                                handleEditQA,
                                handleRegenerateQA,
                                job,
                                isPolling
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-3">
                            <p className="text-gray-500 text-center text-sm">
                              아직 생성된 질문지가 없습니다.<br />
                              질문지를 생성하여 면접을 준비해보세요.
                            </p>
                            <Button
                              variant="outline"
                              className="h-8 text-sm"
                              onClick={() => setShowQuestionsDialog(true)}
                            >
                              질문지 생성
                            </Button>
                          </div>
                        )}
                      </>
                        </div>
                      </ResizablePanel>

                      {/* Right Panel - History */}
                      {isHistoryPanelOpen && (
                        <>
                          <ResizableHandle withHandle />
                          <ResizablePanel defaultSize={33} minSize={20} maxSize={50}>
                            <div className="h-full flex flex-col">
                        {/* History Header */}
                        <div className="h-[45px] px-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            <h2 className="text-sm font-bold">히스토리</h2>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-gray-100"
                            onClick={() => setIsHistoryPanelOpen(false)}
                          >
                            ✕
                          </Button>
                        </div>

                        {/* History Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
                          <Table className="flex-1">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-sm font-medium leading-6 h-auto p-0">
                                  <div className="px-2 py-3">이름</div>
                                </TableHead>
                                <TableHead className="text-sm font-medium leading-6 h-auto p-0">
                                  <div className="px-2 py-3">변경사항</div>
                                </TableHead>
                                <TableHead className="text-sm font-medium leading-6 h-auto p-0">
                                  <div className="px-2 py-3">날짜</div>
                                </TableHead>
                                <TableHead className="text-sm font-medium leading-6 h-auto p-0 w-12">
                                  <div className="px-2 py-3"></div>
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {qaHistory.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-sm text-gray-500 py-8">
                                    히스토리가 없습니다
                                  </TableCell>
                                </TableRow>
                              ) : (
                                qaHistory.map((qa, index) => {
                                  const typeLabel = qa.type === 'questions_generated' ? '질문지 생성' :
                                                   qa.type === 'answers_generated' ? '답변지 생성' :
                                                   qa.type === 'question_regenerated' ? '질문 재생성' :
                                                   qa.type === 'answer_regenerated' ? '답변 재생성' :
                                                   qa.type === 'question_edited' ? '질문 수정' :
                                                   qa.type === 'answer_edited' ? '답변 수정' :
                                                   qa.type === 'admin_edited' ? '관리자 수정' : qa.type

                                  const date = new Date(qa.created_at)
                                  const formattedDate = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
                                  const isLastItem = index === qaHistory.length - 1

                                  return (
                                    <TableRow
                                      key={qa.id}
                                      className={`cursor-pointer transition-colors ${
                                        selectedHistoryId === qa.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                                      } ${isLastItem ? '[&>td]:border-b' : ''}`}
                                      onClick={() => loadQaVersion(qa.id)}
                                    >
                                      <TableCell className="text-sm font-medium leading-6 px-2 py-3 h-auto p-0 align-top">
                                        <div className="px-2 py-3">
                                          <div className="flex items-center gap-2 leading-6">
                                            <span className="font-medium leading-6">{qa.name}</span>
                                            {qa.is_default && (
                                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">기본</span>
                                            )}
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-sm font-medium leading-6 px-2 py-3 h-auto p-0 align-top">
                                        <div className="px-2 py-3">
                                          <span className="font-medium leading-6">{typeLabel}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-sm font-medium leading-6 px-2 py-3 h-auto p-0 align-top">
                                        <div className="px-2 py-3">
                                          <span className="font-medium leading-6">{formattedDate}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-sm font-medium leading-6 px-2 py-3 h-auto p-0 align-top">
                                        <div className="px-2 py-3 flex items-start">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 flex-shrink-0 text-gray-300 hover:text-black hover:bg-transparent"
                                            >
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              className="cursor-pointer"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setRenameQaId(qa.id)
                                                setRenameText(qa.name)
                                                setShowRenameDialog(true)
                                              }}
                                            >
                                              이름 변경
                                            </DropdownMenuItem>
                                            {!qa.is_default && (
                                              <DropdownMenuItem
                                                className="cursor-pointer"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setAsDefaultVersion(qa.id)
                                                }}
                                              >
                                                기본으로 설정
                                              </DropdownMenuItem>
                                            )}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })
                              )}
                            </TableBody>
                          </Table>
                        </div>
                            </div>
                          </ResizablePanel>
                        </>
                      )}
                    </ResizablePanelGroup>
                  )}
                </div>

                {/* Sticky Bottom Action Bar */}
                <div className="h-[60px] border-t border-gray-200 px-4 bg-white/40 backdrop-blur-sm flex items-center justify-end gap-2">
                  {activeView === 'info' ? (
                    /* Info View Actions */
                    <Button
                      type="submit"
                      className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isSubmitting}
                      onClick={() => form.handleSubmit(handleInfoFormSubmit)()}
                    >
                      {isSubmitting ? '저장 중...' : '저장'}
                    </Button>
                  ) : (
                    /* Q&A View Actions */
                    <>
                      {interviews.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                          <DropdownMenuItem
                            onClick={() => {
                              if (!questionData) return

                              // Check if all questions are selected (30 total: 10 per category × 3 categories)
                              const allQuestionsSelected = selectedQuestions.size === 30

                              if (allQuestionsSelected) {
                                // Deselect all questions
                                setSelectedQuestions(new Set())
                              } else {
                                // Select all questions
                                const allQuestions = new Set<string>()
                                for (let i = 0; i < 10; i++) {
                                  allQuestions.add(`general_personality_q_${i}`)
                                  allQuestions.add(`cover_letter_personality_q_${i}`)
                                  allQuestions.add(`cover_letter_competency_q_${i}`)
                                }
                                setSelectedQuestions(allQuestions)
                              }
                            }}
                            className={`cursor-pointer ${selectedQuestions.size === 30 ? 'bg-blue-50 text-blue-600 focus:bg-blue-100 focus:text-blue-600' : ''}`}
                          >
                            {selectedQuestions.size === 30 ? '전체 질문 해제' : '전체 질문 선택'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (!answerData) return

                              // Count total available answers
                              const categories = ['general_personality', 'cover_letter_personality', 'cover_letter_competency']
                              let totalAnswers = 0
                              const allAnswers = new Set<string>()

                              categories.forEach(category => {
                                const answers = answerData[category] || []
                                for (let i = 0; i < answers.length; i++) {
                                  if (answers[i]) {
                                    totalAnswers++
                                    allAnswers.add(`${category}_a_${i}`)
                                  }
                                }
                              })

                              // Check if all answers are selected
                              const allAnswersSelected = selectedAnswers.size === totalAnswers

                              if (allAnswersSelected) {
                                // Deselect all answers
                                setSelectedAnswers(new Set())
                              } else {
                                // Select all answers
                                setSelectedAnswers(allAnswers)
                              }
                            }}
                            className={(() => {
                              if (!answerData) return 'cursor-pointer'

                              // Count total available answers for styling
                              const categories = ['general_personality', 'cover_letter_personality', 'cover_letter_competency']
                              let totalAnswers = 0
                              categories.forEach(category => {
                                const answers = answerData[category] || []
                                for (let i = 0; i < answers.length; i++) {
                                  if (answers[i]) totalAnswers++
                                }
                              })

                              const allSelected = selectedAnswers.size === totalAnswers && totalAnswers > 0
                              return `cursor-pointer ${allSelected ? 'bg-blue-50 text-blue-600 focus:bg-blue-100 focus:text-blue-600' : ''}`
                            })()}
                            disabled={!answerData}
                          >
                            {(() => {
                              if (!answerData) return '전체 답변 선택'

                              // Count total available answers for display
                              const categories = ['general_personality', 'cover_letter_personality', 'cover_letter_competency']
                              let totalAnswers = 0
                              categories.forEach(category => {
                                const answers = answerData[category] || []
                                for (let i = 0; i < answers.length; i++) {
                                  if (answers[i]) totalAnswers++
                                }
                              })

                              return selectedAnswers.size === totalAnswers && totalAnswers > 0 ? '전체 답변 해제' : '전체 답변 선택'
                            })()}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (selectedItems.size > 0) {
                                setShowReportModal(true)
                              }
                            }}
                            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            disabled={selectedItems.size === 0}
                          >
                            선택 이의신청
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                      {interviews.length > 0 && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setShowQuestionsDialog(true)}
                        disabled={isPolling || interviews.length === 0}
                      >
                        {isPolling && job?.type === 'questions_generated' ? (
                          <>
                            <Loader className="h-3 w-3 animate-spin mr-1" />
                            생성 중...
                          </>
                        ) : (
                          '질문지 생성'
                        )}
                      </Button>
                      <Button
                        className="h-8 bg-blue-600 hover:bg-blue-700 text-white relative"
                        onClick={() => setShowAnswersDialog(true)}
                        disabled={isPolling || selectedQuestions.size === 0 || interviews.length === 0}
                      >
                        {isPolling && job?.type === 'answers_generated' ? (
                          <>
                            <Loader className="h-3 w-3 animate-spin mr-1" />
                            생성 중...
                          </>
                        ) : (
                          <>
                            답변지 생성
                            {selectedQuestions.size > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {selectedQuestions.size}
                              </span>
                            )}
                          </>
                        )}
                      </Button>
                    </>
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
                  {!isHydrated || isLoadingInterviews ? (
                    <div className="flex items-center gap-2">
                      <Loader className="h-4 w-4 animate-spin text-gray-900" />
                      <h1 className="text-xl font-bold text-left text-gray-900">로딩중...</h1>
                    </div>
                  ) : interviews.length === 0 ? (
                    <h1 className="text-xl font-bold text-left text-gray-900">새 면접 생성</h1>
                  ) : (
                    <Select
                      value={selectedInterview?.id || ""}
                      onValueChange={handleInterviewChange}
                    >
                      <SelectTrigger className="border-none shadow-none p-0 h-auto gap-2 hover:bg-transparent focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                        <h1 className="text-xl font-bold text-left text-gray-900">
                          {selectedInterview?.company_name || "회사명"}
                        </h1>
                      </SelectTrigger>
                      <SelectContent>
                        {interviews.map((interview) => (
                          <SelectItem key={interview.id} value={interview.id} className="cursor-pointer">
                            {interview.company_name} - {interview.position}
                          </SelectItem>
                        ))}
                        <SelectItem value="create-new" className="text-blue-600 font-medium cursor-pointer">
                          + 새 면접 생성
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Content that fills exact remaining space Mobile */}
                <div className="flex-1 overflow-y-scroll p-4">
                  {interviews.length === 0 ? (
                    /* Empty State - No Interviews Mobile */
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <p className="text-gray-500 text-center text-sm">
                        아직 생성된 면접이 없습니다.<br />
                        새 면접을 생성하여 준비를 시작해보세요.
                      </p>
                      <Button
                        variant="outline"
                        className="h-8 text-sm"
                        onClick={() => setShowCreateInterviewDialog(true)}
                      >
                        새 면접 생성
                      </Button>
                    </div>
                  ) : loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader className="h-4 w-4 animate-spin text-black" />
                    </div>
                  ) : (isPolling && job?.type === 'questions_generated' && !questionData) || isStartingGeneration ? (
                    // Generating 30 questions - show skeleton loaders
                    <div>
                      <div className="mb-0">
                        <h3 className="font-bold text-sm mb-0 px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">일반 인성면접 질문 (10개)</h3>
                        <div>
                          {Array.from({ length: 10 }, (_, i) => (
                            <div key={i} className="px-2 py-3 border-b border-gray-200 flex items-center gap-2 text-sm">
                              <span className="w-6 flex-shrink-0 font-medium text-gray-400">{i + 1}.</span>
                              <Loader className="h-4 w-4 flex-shrink-0 animate-spin text-gray-400" />
                              <span className="text-gray-400 font-medium leading-6">질문 생성 중...</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mb-0">
                        <h3 className="font-bold text-sm mb-0 px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">자소서 기반 인성면접 질문 (10개)</h3>
                        <div>
                          {Array.from({ length: 10 }, (_, i) => (
                            <div key={i} className="px-2 py-3 border-b border-gray-200 flex items-center gap-2 text-sm">
                              <span className="w-6 flex-shrink-0 font-medium text-gray-400">{i + 11}.</span>
                              <Loader className="h-4 w-4 flex-shrink-0 animate-spin text-gray-400" />
                              <span className="text-gray-400 font-medium leading-6">질문 생성 중...</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mb-0">
                        <h3 className="font-bold text-sm mb-0 px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">자소서 기반 역량면접 질문 (10개)</h3>
                        <div>
                          {Array.from({ length: 10 }, (_, i) => (
                            <div key={i} className="px-2 py-3 border-b border-gray-200 flex items-center gap-2 text-sm">
                              <span className="w-6 flex-shrink-0 font-medium text-gray-400">{i + 21}.</span>
                              <Loader className="h-4 w-4 flex-shrink-0 animate-spin text-gray-400" />
                              <span className="text-gray-400 font-medium leading-6">질문 생성 중...</span>
                            </div>
                          ))}
                        </div>
                      </div>
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
                          handleEditCancel,
                          handleEditQA,
                          handleRegenerateQA,
                          job,
                          isPolling
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <p className="text-gray-500 text-center text-sm">
                        아직 생성된 질문지가 없습니다.<br />
                        질문지를 생성하여 면접을 준비해보세요.
                      </p>
                      <Button
                        variant="outline"
                        className="h-8 text-sm"
                        onClick={() => setShowQuestionsDialog(true)}
                      >
                        질문지 생성
                      </Button>
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
          <AlertDialogFooter>
            <AlertDialogCancel>
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
              {selectedQuestions.size}개 질문 선택됨 - {(selectedQuestions.size / 30 * 6).toFixed(1)} 토큰이 차감됩니다. 답변을 생성하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              취소
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateAnswers}>
              생성
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Q/A Dialog */}
      <AlertDialog open={showEditQADialog} onOpenChange={setShowEditQADialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedQAItem?.type === 'question' ? '질문' : '답변'} 수정
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">현재 내용:</div>
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">
                {selectedQAItem?.text}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">수정 요청사항 (선택):</div>
              <Textarea
                value={qaOperationComment}
                onChange={(e) => setQaOperationComment(e.target.value)}
                placeholder="예: 더 구체적으로 작성해주세요, 경험 중심으로 변경해주세요 등"
                rows={3}
                className="text-sm"
              />
            </div>
            <div className="text-xs text-gray-500">
              0.2 토큰이 차감됩니다.
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setQaOperationComment("")}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction onClick={submitEditQA}>
              수정
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Q/A Dialog */}
      <AlertDialog open={showRegenerateQADialog} onOpenChange={setShowRegenerateQADialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedQAItem?.type === 'question' ? '질문' : '답변'} 재생성
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">현재 내용:</div>
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">
                {selectedQAItem?.text}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              0.2 토큰이 차감됩니다.
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>
              취소
            </AlertDialogCancel>
            <AlertDialogAction onClick={submitRegenerateQA}>
              재생성
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Interview Dialog */}
      <Dialog open={showCreateInterviewDialog} onOpenChange={setShowCreateInterviewDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>새 면접 생성</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="company-name" className="text-sm font-medium">회사명</label>
              <Input
                id="company-name"
                value={newInterviewCompanyName}
                onChange={(e) => setNewInterviewCompanyName(e.target.value)}
                placeholder="회사명을 입력하세요"
                disabled={isCreatingInterview}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="position" className="text-sm font-medium">직무</label>
              <Input
                id="position"
                value={newInterviewPosition}
                onChange={(e) => setNewInterviewPosition(e.target.value)}
                placeholder="직무를 입력하세요"
                disabled={isCreatingInterview}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateInterviewDialog(false)
                setNewInterviewCompanyName("")
                setNewInterviewPosition("")
              }}
              disabled={isCreatingInterview}
            >
              취소
            </Button>
            <Button onClick={handleCreateInterview} disabled={isCreatingInterview}>
              {isCreatingInterview ? "생성 중..." : "생성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Interview Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open)
        if (!open) {
          setDeleteConfirmText("")
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>면접 삭제</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm text-gray-700">
              <p>
                {selectedInterview?.company_name} - {selectedInterview?.position} 면접을 삭제하시겠습니까? 모든 질문과 답변이 영구적으로 삭제되며 복구할 수 없습니다. 계속하려면 아래에 <strong className="text-red-600">삭제</strong>를 입력하세요.
              </p>
            </div>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="삭제"
              disabled={isDeletingInterview}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteConfirmText("")
              }}
              disabled={isDeletingInterview}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteInterview}
              disabled={isDeletingInterview || deleteConfirmText !== '삭제'}
            >
              {isDeletingInterview ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename QA Version Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={(open) => {
        setShowRenameDialog(open)
        if (!open) {
          setRenameQaId(null)
          setRenameText("")
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>이름 변경</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              placeholder="새 이름을 입력하세요"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRenameDialog(false)
                setRenameQaId(null)
                setRenameText("")
              }}
            >
              취소
            </Button>
            <Button
              onClick={renameQaVersion}
              disabled={!renameText.trim()}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <ReportModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        selectedQuestions={selectedQuestions}
        selectedAnswers={selectedAnswers}
        interviewQasId={viewingQaId || currentQaId}
        questionData={questionData}
        answerData={answerData}
        onSuccess={() => {
          // Clear selections after successful report
          setSelectedQuestions(new Set())
          setSelectedAnswers(new Set())
        }}
      />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader className="h-4 w-4 animate-spin" /></div>}>
      <InterviewPage />
    </Suspense>
  )
}