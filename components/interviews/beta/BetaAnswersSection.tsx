"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useParams } from "next/navigation"
import React from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Hexagon, Loader } from "lucide-react"
import { toast } from "sonner"
import { AnswerDataTable } from "../answers/answersDataTable"
import { useCurrentAnswer, useAnswersLoading, useStore, useDecrementTokens, useRefreshTokens, useHasActiveJob, useAddActiveJob, useStartPolling, useActiveJobs, useTokens, useSetCompletionCallback, useRemoveCompletionCallback } from "@/lib/zustand"
import { generateAnswerClient, fetchInterviewAnswersClient, deleteInterviewAnswerClient, fetchInterviewQuestionsClient, getUserTokensClient, cancelJobClient, getUserActiveJobsClient } from "@/lib/supabase/services/clientServices"
import { usePaymentPopup } from "@/hooks/usePaymentPopup"

const formSchema = z.object({
  comment: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface BetaAnswersSectionProps {
  showNavigation?: boolean
}

// Define the Answer type for the history table
interface AnswerHistory {
  id: string
  answer: string
  answer_data?: any
  created_at: string
  question_id: string
  status?: string // For active jobs
  isJob?: boolean // To distinguish jobs from actual answers
}

// Define the Question type for selection
interface Question {
  id: string
  question_text: string
  created_at: string
}

// Helper function to format answer_data into HTML (matching questions format)
const formatAnswerDataAsHTML = (answerData: any): React.ReactNode => {
  if (!answerData || typeof answerData !== 'object') {
    return <div className="text-gray-500">유효하지 않은 답변 데이터입니다</div>
  }

  const { general_personality, cover_letter_personality, cover_letter_competency } = answerData

  if (!Array.isArray(general_personality) || !Array.isArray(cover_letter_personality) || !Array.isArray(cover_letter_competency)) {
    return <div className="text-gray-500">답변 데이터 형식이 올바르지 않습니다</div>
  }

  return (
    <div className="text-black">
      <div className="mb-10">
        <h3 className="font-bold text-sm mb-3">일반 인성면접 답변 (10개)</h3>
        <div className="space-y-4 pl-4">
          {general_personality.map((a, i) => (
            <div key={i} className="text-sm">
              <div className="font-medium mb-1">{i + 1}. 답변:</div>
              <div className="pl-4 text-gray-700 whitespace-pre-wrap">{a}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <h3 className="font-bold text-sm mb-3">자기소개서 기반 인성면접 답변 (10개)</h3>
        <div className="space-y-4 pl-4">
          {cover_letter_personality.map((a, i) => (
            <div key={i} className="text-sm">
              <div className="font-medium mb-1">{i + 1}. 답변:</div>
              <div className="pl-4 text-gray-700 whitespace-pre-wrap">{a}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-0">
        <h3 className="font-bold text-sm mb-3">자기소개서 기반 직무 역량 확인 답변 (10개)</h3>
        <div className="space-y-4 pl-4">
          {cover_letter_competency.map((a, i) => (
            <div key={i} className="text-sm">
              <div className="font-medium mb-1">{i + 1}. 답변:</div>
              <div className="pl-4 text-gray-700 whitespace-pre-wrap">{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Helper function to get first answer for history table display
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

export default function BetaAnswersSection({ showNavigation = true }: BetaAnswersSectionProps) {
  const { interviewId } = useParams()

  // Get state from Zustand store
  const currentAnswer = useCurrentAnswer()
  const currentAnswerId = useStore((state) => state.currentAnswerId)
  const loadingAnswer = useAnswersLoading()
  const setCurrentAnswer = useStore((state) => state.setCurrentAnswer)
  const setCurrentAnswerId = useStore((state) => state.setCurrentAnswerId)
  const setAnswersLoading = useStore((state) => state.setAnswersLoading)
  const loading = useStore((state) => state.isLoading)

  // Local state for current answer data (JSON format)
  const [currentAnswerData, setCurrentAnswerData] = useState<any>(null)

  const [historyData, setHistoryData] = useState<AnswerHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("")

  // Global token state
  const tokens = useTokens()
  const decrementTokens = useDecrementTokens()
  const refreshTokens = useRefreshTokens()

  // Job management state
  const hasActiveJob = useHasActiveJob()
  const addActiveJob = useAddActiveJob()
  const startPolling = useStartPolling()
  const activeJobs = useActiveJobs()

  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [showCancelJobDialog, setShowCancelJobDialog] = useState(false)
  const [showInsufficientTokenDialog, setShowInsufficientTokenDialog] = useState(false)
  const [activeJobInfo, setActiveJobInfo] = useState<{id: string, status: string, created_at: string} | null>(null)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [isGenerateLoading, setIsGenerateLoading] = useState(false)

  // Payment popup hook
  const { openPaymentPopup } = usePaymentPopup()

  // Completion callback hooks
  const setCompletionCallback = useSetCompletionCallback()
  const removeCompletionCallback = useRemoveCompletionCallback()

  const form = useForm<{ comment?: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: "",
    },
  })

  // Initialize with empty state - don't auto-load first answer
  React.useEffect(() => {
    setCurrentAnswer("답변을 선택하면 여기에 표시됩니다")
    setCurrentAnswerId("")
    setCurrentAnswerData(null)
    setAnswersLoading(false)
  }, [interviewId, setCurrentAnswer, setCurrentAnswerId, setAnswersLoading])

  // Fetch history data and questions on mount
  React.useEffect(() => {
    fetchHistoryData()
    fetchQuestions()
  }, [])

  // Set up completion callback for answer jobs
  React.useEffect(() => {
    const callbackKey = `answers-${interviewId}`

    console.log(`[Answers] Setting up completion callback with key: ${callbackKey}`)
    setCompletionCallback(callbackKey, (job) => {
      console.log(`[Answers] Completion callback triggered for job:`, job)
      if (job.type === 'answer' && job.interview_id === interviewId) {
        if (job.status === 'completed') {
          console.log(`[Answers] Job completed! Showing toast and refreshing tokens`)
          toast.success("답변 생성이 완료되었습니다!")
          // Refresh tokens to show updated count (2 tokens spent)
          refreshTokens()
          // Note: Smart polling will handle UI updates without full refresh
        } else if (job.status === 'failed') {
          console.log(`[Answers] Job failed! Showing error toast`)
          toast.error("답변 생성에 실패했습니다. 다시 시도해주세요.")
          // Note: Smart polling will handle removing failed jobs from UI
        }
      } else {
        console.log(`[Answers] Job doesn't match criteria - type: ${job.type}, interview_id: ${job.interview_id}, expected: ${interviewId}`)
      }
    })

    // Cleanup callback on unmount
    return () => {
      console.log(`[Answers] Removing completion callback with key: ${callbackKey}`)
      removeCompletionCallback(callbackKey)
    }
  }, [interviewId, setCompletionCallback, removeCompletionCallback])

  // Smart polling for specific jobs without UI flash
  const startJobPolling = (jobId: string) => {
    console.log(`[Answers] Starting smart polling for job ${jobId}`)

    const pollJob = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`)
        if (response.ok) {
          const data = await response.json()
          const job = data.job

          console.log(`[Answers] Job ${jobId} status: ${job.status}`)

          if (job.status === 'completed') {
            // Replace the job row with actual answers without flash
            console.log('[Answers] Job completed! Updating UI without refresh')

            // Fetch only the new answers for this completed job
            const answersResponse = await fetchInterviewAnswersClient(interviewId as string)
            const newAnswer = answersResponse.find(a => a.id === job.result?.answer_id)

            if (newAnswer) {
              // Replace the job item with the actual answer
              setHistoryData(prev => prev.map(item =>
                item.id === jobId
                  ? {
                      id: newAnswer.id,
                      answer: newAnswer.answer_data ? getFirstAnswer(newAnswer.answer_data) : "새 답변이 생성되었습니다",
                      answer_data: newAnswer.answer_data,
                      created_at: newAnswer.created_at,
                      question_id: newAnswer.question_id
                    }
                  : item
              ))

              // Refresh tokens to show updated count (2 tokens spent)
              refreshTokens()
              // Note: Toast success is handled by completion callback to avoid duplicates
            }
            return true // Stop polling
          } else if (job.status === 'failed') {
            // Remove the failed job from UI
            setHistoryData(prev => prev.filter(item => item.id !== jobId))
            toast.error("답변 생성에 실패했습니다. 다시 시도해주세요.")
            return true // Stop polling
          } else {
            // Update status without changing the row
            setHistoryData(prev => prev.map(item =>
              item.id === jobId
                ? { ...item, status: job.status, answer: `🔄 ${job.status === 'processing' || job.status === 'progress' ? '생성 중...' : '대기 중...'} ${item.answer.includes('(') ? item.answer.match(/\(([^)]+)\)/)?.[0] || '' : ''}` }
                : item
            ))
            return false // Continue polling
          }
        }
      } catch (error) {
        console.error(`[Answers] Error polling job ${jobId}:`, error)
        return false // Continue polling on error
      }
      return false
    }

    // Poll immediately, then every 3 seconds
    const intervalId = setInterval(async () => {
      const shouldStop = await pollJob()
      if (shouldStop) {
        clearInterval(intervalId)
        console.log(`[Answers] Stopped polling for job ${jobId}`)
      }
    }, 3000)

    // Initial poll
    pollJob().then(shouldStop => {
      if (shouldStop) {
        clearInterval(intervalId)
        console.log(`[Answers] Job ${jobId} completed immediately`)
      }
    })
  }

  const fetchHistoryData = async () => {
    setLoadingHistory(true)
    try {
      // Fetch both active jobs and completed answers
      const [activeJobs, answers] = await Promise.all([
        getUserActiveJobsClient(),
        fetchInterviewAnswersClient(interviewId as string)
      ])

      // Filter for answer type jobs
      const answerJobs = activeJobs.filter(job => job.type === 'answer')

      // Convert jobs to display format
      const jobsData: AnswerHistory[] = answerJobs.map(job => {
        console.log(`[Answers] Active Job ${job.id} created_at from API:`, job.created_at)
        return {
          id: job.id,
          answer: `🔄 ${job.status === 'processing' || job.status === 'progress' ? '생성 중...' : '대기 중...'} ${job.comment ? `(${job.comment})` : ''}`,
          created_at: job.created_at,
          question_id: job.question_id || '',
          status: job.status,
          isJob: true
        }
      })

      // Convert answers to display format
      const answersData: AnswerHistory[] = answers.map(a => {
        console.log(`[Answers] Answer ${a.id} created_at from API:`, a.created_at)
        return {
          id: a.id,
          answer: a.answer_data ? getFirstAnswer(a.answer_data) : (a.answer_text || "답변 없음"),
          answer_data: a.answer_data,
          created_at: a.created_at,
          question_id: a.question_id
        }
      })

      // Combine with jobs at the top
      setHistoryData([...jobsData, ...answersData])

      // Start smart polling for any existing active jobs
      if (answerJobs.length > 0) {
        console.log(`[Answers] Found ${answerJobs.length} active answer jobs`)
        answerJobs.forEach(job => {
          if (job.status === 'queued' || job.status === 'processing') {
            console.log(`[Answers] Starting polling for existing job ${job.id}`)
            startJobPolling(job.id)
          }
        })
      }
    } catch (e) {
      console.error("Failed to fetch history:", e)
      setHistoryData([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const fetchQuestions = async () => {
    try {
      const questionsResponse = await fetchInterviewQuestionsClient(interviewId as string)
      setQuestions(questionsResponse.map(q => ({
        id: q.id,
        question_text: q.question_data ? "면접 질문 세트" : (q.question_text || "질문 없음"),
        created_at: q.created_at
      })))
    } catch (e) {
      console.error("Failed to fetch questions:", e)
      setQuestions([])
    }
  }

  const handleDeleteAnswer = async (id: string) => {
    try {
      await deleteInterviewAnswerClient(id)
      console.log("Answer deleted:", id)

      // Check if the deleted answer was the currently selected one
      if (currentAnswerId === id) {
        // If selected answer is deleted, clear selection
        setCurrentAnswer("질문을 선택하고 답변을 생성해주세요")
        setCurrentAnswerId("")
        setCurrentAnswerData(null)
      }
      // If unselected answer is deleted, keep current selection unchanged

      // Note: No need to call fetchHistoryData() here as the data table
      // already handles removing the row optimistically
    } catch (error) {
      console.error("Failed to delete answer:", error)
      throw error
    }
  }

  const handleSetCurrentAnswer = (answer: string, answerId: string) => {
    // If clicking on the already selected answer, unselect it
    if (currentAnswerId === answerId) {
      setCurrentAnswer("")
      setCurrentAnswerId("")
      setCurrentAnswerData(null)
      return
    }

    // Find the full answer data for the selected answer
    const fullAnswer = historyData.find(a => a.id === answerId)
    if (fullAnswer && fullAnswer.answer_data) {
      setCurrentAnswerData(fullAnswer.answer_data)
      setCurrentAnswer("")
    } else {
      // Fallback to text display if no answer_data
      setCurrentAnswer(answer)
      setCurrentAnswerData(null)
    }
    setCurrentAnswerId(answerId)
  }

  const handleCancelJobAndGenerateNew = async () => {
    if (!activeJobInfo) return

    try {
      // Cancel the existing job
      await cancelJobClient(activeJobInfo.id)
      toast.success("기존 작업을 취소했습니다.")

      // Close the cancel dialog
      setShowCancelJobDialog(false)
      setActiveJobInfo(null)

      // Start the new generation
      handleGenerate()

    } catch (error: any) {
      console.error("Failed to cancel job:", error)
      toast.error("작업 취소에 실패했습니다. 다시 시도해주세요.")
    }
  }

  const handleGenerate = async () => {
    // Check if a question is selected
    if (!selectedQuestionId) {
      toast.error("답변을 생성할 질문을 선택해주세요!")
      return
    }

    setIsGenerateLoading(true)

    try {
      // Get current token state from Zustand
      const currentTokens = useStore.getState().tokens

      // Check if user has enough tokens BEFORE showing confirmation dialog
      if (currentTokens < 2) {
        setShowInsufficientTokenDialog(true)
        setIsGenerateLoading(false)
        return
      }

    // Check for active jobs FIRST, then show confirmation dialog
    try {
      // Just check if there are active jobs, don't create yet
      const checkResponse = await fetch('/api/jobs/active')
      if (checkResponse.ok) {
        const data = await checkResponse.json()
        const activeAnswerJobs = data.jobs?.filter((job: any) => job.type === 'answer') || []

        if (activeAnswerJobs.length > 0) {
          const activeJob = activeAnswerJobs[0]
          setActiveJobInfo(activeJob)
          setShowCancelJobDialog(true)
          setIsGenerateLoading(false)
          return
        }
      }
    } catch (error) {
      console.error("Error checking for active jobs:", error)
    }

    // No active job, show confirmation dialog
    setPendingAction(() => async () => {
      try {
        const comment = form.getValues("comment")
        console.log("Starting background answer generation with comment:", comment, "questionId:", selectedQuestionId, "answerId:", currentAnswerId)

        // Call the new job-based API
        const response = await generateAnswerClient(
          interviewId as string,
          selectedQuestionId,
          comment,
          currentAnswerId || undefined  // Pass answerId for regeneration mode
        )

        console.log("Job queued successfully:", response)
        console.log("API returned createdAt:", response.createdAt)
        console.log("Current date for comparison:", new Date().toISOString())

        // Add job to active jobs and start polling
        addActiveJob({
          id: response.jobId,
          user_id: '', // Will be set by polling
          interview_id: interviewId as string,
          type: 'answer',
          status: 'queued',
          question_id: selectedQuestionId,
          comment: comment || undefined,
          created_at: response.createdAt
        })

        // Start polling for job updates
        startPolling()

        // Clear the comment form
        form.reset({ comment: "" })

        // Show success message
        toast.success("답변 생성을 시작했습니다! 완료되면 표시됩니다.")

        // Add the job to the UI immediately without full refresh
        const newJobItem = {
          id: response.jobId,
          answer: `🔄 생성 중... ${comment ? `(${comment})` : ''}`,
          created_at: response.createdAt,
          question_id: selectedQuestionId,
          status: 'queued' as any,
          isJob: true
        }
        setHistoryData(prev => [newJobItem, ...prev])

        // Start smart polling for this specific job
        startJobPolling(response.jobId)

      } catch (error: any) {
        console.error("Failed to start answer generation:", error)

        // Check if it's a token insufficient error
        if (error.message && error.message.includes('Insufficient tokens')) {
          toast.error("토큰이 부족합니다. 토큰을 구매해주세요.")
        } else if (error.message && error.message.includes('already in progress')) {
          // Try to parse the response to get active job info
          try {
            // The error might contain response data, let's try to fetch it
            const response = await fetch('/api/ai/answer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                interviewId: interviewId as string,
                questionId: selectedQuestionId,
                comment: form.getValues("comment"),
                answerId: currentAnswerId || undefined
              })
            })
            if (response.status === 409) {
              const data = await response.json()
              if (data.activeJob) {
                setActiveJobInfo(data.activeJob)
                setShowCancelJobDialog(true)
                setIsGenerateLoading(false)
                return
              }
            }
          } catch (parseError) {
            console.error("Could not parse active job info:", parseError)
          }
          toast.error("이미 답변 생성이 진행 중입니다.")
        } else {
          toast.error("답변 생성 시작에 실패했습니다. 다시 시도해주세요.")
        }
      }
    }) // End of setPendingAction call

    setShowConfirmationDialog(true)
    setIsGenerateLoading(false)
    } catch (error) {
      console.error("Error in handleGenerate:", error)
      setIsGenerateLoading(false)
      toast.error("생성 준비 중 오류가 발생했습니다. 다시 시도해주세요.")
    }
  }

  const onSubmit = async (data: { comment?: string }) => {
    console.log("코멘트 폼 데이터:", data)
    toast.success("코멘트가 성공적으로 제출되었습니다!")
  }

  const handleConfirmGenerate = async () => {
    setShowConfirmationDialog(false)

    if (pendingAction) {
      try {
        await pendingAction()
        // Note: pendingAction now handles the new job-based approach
      } catch (error) {
        console.error('Error during generation:', error)
        toast.error("답변 생성 시작에 실패했습니다. 다시 시도해주세요.")
      } finally {
        setPendingAction(null)
      }
    }
  }

  // Don't render content if loading
  if (loading) {
    return (
      <div id="answers" className="w-full max-w-4xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">면접 답변</h1>
        </div>
        <div className="flex justify-center items-center h-32">
          <Loader className="h-4 w-4 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div id="answers" className="w-full max-w-4xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">면접 답변</h1>
        </div>

        {/* History Table */}
        <div className="mb-4 flex flex-col gap-2">
          <AnswerDataTable
            data={historyData}
            setData={setHistoryData}
            isLoading={loadingHistory}
            onDelete={handleDeleteAnswer}
            onSetCurrent={handleSetCurrentAnswer}
            currentAnswerId={currentAnswerId}
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Question Selection */}
            <div className="mb-4 flex flex-col gap-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">질문 선택</label>
              <select
                value={selectedQuestionId}
                onChange={(e) => setSelectedQuestionId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">질문을 선택하세요</option>
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.question_text} (생성일: {new Date(q.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            {currentAnswerId && (
              <>
                <div className="mb-4 flex flex-col gap-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">답변</label>
                  <div
                    className="h-[500px] overflow-y-auto p-3 border border-gray-300 rounded-md bg-white"
                  >
                    {(loadingAnswer || !currentAnswerData) ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader className="h-4 w-4 animate-spin text-black" />
                      </div>
                    ) : (
                      formatAnswerDataAsHTML(currentAnswerData)
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>코멘트</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={currentAnswerId ? "선택한 답변에 코멘트를 반영하여 재생성합니다 (선택사항)" : "답변 생성 시 참고할 코멘트를 입력하세요 (선택사항)"}
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Alert when no question is selected */}
            {!selectedQuestionId && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-blue-700 text-sm">
                  답변을 생성하려면 먼저 질문을 선택해주세요.
                </div>
              </div>
            )}

            <div className="sticky bottom-0 bg-white/40 backdrop-blur-sm px-4 sm:px-8 py-3 mt-6 -mx-4 sm:-mx-8">
              <div className="flex justify-between items-center">
                <div>
                  {showNavigation && (
                    <Button
                      type="button"
                      variant="outline"
                      className="px-8 py-2"
                      onClick={() => {
                        window.location.href = `/${interviewId}/questions`
                      }}
                    >
                      질문으로 이동
                    </Button>
                  )}
                </div>
                <div className="flex gap-3 items-center">
                  <div className="flex items-center gap-2">
                  <div className="relative">
              <Hexagon className="w-6 h-6 text-blue-600" />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-600">
                J
              </span>
            </div>
                    <span className="text-sm text-gray-600">
                      2 사용
                    </span>
                  </div>
                  <Button
                    type="button"
                    disabled={hasActiveJob() || isGenerateLoading || !selectedQuestionId}
                    className="px-8 py-2 bg-black text-white hover:bg-zinc-800 disabled:bg-gray-400"
                    onClick={handleGenerate}
                  >
                    {isGenerateLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>준비 중...</span>
                      </div>
                    ) : hasActiveJob() ? (
                      "생성 중..."
                    ) : (
                      currentAnswerId ? "재생성" : "생성"
                    )}
                  </Button>
                  {showNavigation && (
                    <Button
                      type="button"
                      variant="outline"
                      className="px-8 py-2"
                      onClick={() => {
                        window.location.href = `/${interviewId}/information`
                      }}
                    >
                      정보로 이동
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </Form>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>확인</AlertDialogTitle>
              <AlertDialogDescription>
                2 토큰이 차감됩니다. {currentAnswerId ? "선택한 답변을 재생성" : "새로운 답변을 생성"}하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmGenerate}>
                진행
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cancel Job Dialog */}
        <AlertDialog open={showCancelJobDialog} onOpenChange={setShowCancelJobDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>답변 생성이 진행 중입니다</AlertDialogTitle>
              <AlertDialogDescription>
                현재 답변 생성 작업이 {activeJobInfo?.status === 'processing' ? '진행' : '대기'} 중입니다.
                <br />
                기존 작업을 취소하고 새로운 작업을 시작하시겠습니까?
                <br />
                <small className="text-gray-500 mt-2 block">
                  작업 시작: {activeJobInfo?.created_at ? new Date(activeJobInfo.created_at).toLocaleString('ko-KR') : '알 수 없음'}
                </small>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelJobAndGenerateNew} className="bg-red-600 hover:bg-red-700">
                기존 작업 취소하고 새로 시작
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Insufficient Token Dialog */}
        <AlertDialog open={showInsufficientTokenDialog} onOpenChange={setShowInsufficientTokenDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>토큰 부족</AlertDialogTitle>
              <AlertDialogDescription>
                답변 생성에는 2 토큰이 필요합니다. 토큰을 충전하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowInsufficientTokenDialog(false)
                  const previousTokens = useStore.getState().tokens
                  openPaymentPopup({
                    onClose: async () => {
                      await refreshTokens()
                      const currentTokens = useStore.getState().tokens
                      if (currentTokens > previousTokens) {
                        toast.success("토큰이 충전되었습니다!")
                      }
                    }
                  })
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                충전하기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
  )
}