"use client"

import { useState } from "react"
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
import { QuestionDataTable } from "./questionsDataTable"
import { useCurrentQuestion, useQuestionsLoading, useStore, useDecrementTokens, useRefreshTokens, useHasActiveJob, useAddActiveJob, useStartPolling, useActiveJobs, useTokens, useSetCompletionCallback, useRemoveCompletionCallback, useCurrentInterview } from "@/lib/zustand"
import { generateQuestionClient, fetchInterviewQuestionsClient, deleteInterviewQuestionClient, getUserTokensClient, cancelJobClient, getUserActiveJobsClient } from "@/lib/supabase/services/clientServices"
import { usePaymentPopup } from "@/hooks/usePaymentPopup"

const formSchema = z.object({
  comment: z.string().optional(),
})
 
type FormData = z.infer<typeof formSchema>

interface QuestionsSectionProps {
  showNavigation?: boolean
}

// Define the Question type for the history table
interface QuestionHistory {
  id: string
  question: string
  created_at: string
  status?: string // For active jobs
  isJob?: boolean // To distinguish jobs from actual questions
}

// Helper function to format question_data into HTML
const formatQuestionDataAsHTML = (questionData: any): React.ReactNode => {
  if (!questionData || typeof questionData !== 'object') {
    return <div className="text-gray-500">유효하지 않은 질문 데이터입니다</div>
  }

  const { general_personality, cover_letter_personality, cover_letter_competency } = questionData
  
  if (!Array.isArray(general_personality) || !Array.isArray(cover_letter_personality) || !Array.isArray(cover_letter_competency)) {
    return <div className="text-gray-500">질문 데이터 형식이 올바르지 않습니다</div>
  }

  return (
    <div className="text-black">
      <div className="mb-10">
        <h3 className="font-bold text-sm mb-3">일반 인성면접 질문 (10개)</h3>
        <div className="space-y-2 pl-4">
          {general_personality.map((q, i) => (
            <div key={i} className="flex text-sm">
              <span className="w-6 flex-shrink-0">{i + 1}.</span>
              <span className="flex-1">{q}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-10">
        <h3 className="font-bold text-sm mb-3">자기소개서 기반 인성면접 질문 (10개)</h3>
        <div className="space-y-2 pl-4">
          {cover_letter_personality.map((q, i) => (
            <div key={i} className="flex text-sm">
              <span className="w-6 flex-shrink-0">{i + 1}.</span>
              <span className="flex-1">{q}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-0">
        <h3 className="font-bold text-sm mb-3">자기소개서 기반 직무 역량 확인 질문 (10개)</h3>
        <div className="space-y-2 pl-4">
          {cover_letter_competency.map((q, i) => (
            <div key={i} className="flex text-sm">
              <span className="w-6 flex-shrink-0">{i + 1}.</span>
              <span className="flex-1">{q}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Helper function to get 2nd + 3rd questions for history table display
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

export default function QuestionsSection({ showNavigation = true }: QuestionsSectionProps) {
  const { interviewId } = useParams()
  
  // Get state from Zustand store
  const currentQuestion = useCurrentQuestion()
  const currentQuestionId = useStore((state) => state.currentQuestionId)
  const loadingQuestion = useQuestionsLoading()
  const setCurrentQuestion = useStore((state) => state.setCurrentQuestion)
  const setCurrentQuestionId = useStore((state) => state.setCurrentQuestionId)
  const setQuestionsLoading = useStore((state) => state.setQuestionsLoading)
  const currentInterview = useCurrentInterview()
  const loading = useStore((state) => state.isLoading)
  
  // Helper function to check if required basic info fields are filled
  const areRequiredFieldsFilled = () => {
    if (!currentInterview) return false
    const requiredFields = [
      'company_name',
      'position', 
      'job_posting',
      'cover_letter',
      'resume',
      'company_info'
    ]
    return requiredFields.every(field => 
      currentInterview[field as keyof typeof currentInterview] && 
      String(currentInterview[field as keyof typeof currentInterview]).trim() !== ''
    )
  }
  
  // Local state for current question data (JSON format)
  const [currentQuestionData, setCurrentQuestionData] = useState<any>(null)
  
  const [historyData, setHistoryData] = useState<QuestionHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
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

  // Initialize with empty state - don't auto-load first question
  React.useEffect(() => {
    setCurrentQuestion("질문을 선택하면 여기에 표시됩니다")
    setCurrentQuestionId("")
    setCurrentQuestionData(null)
    setQuestionsLoading(false)
  }, [interviewId, setCurrentQuestion, setCurrentQuestionId, setQuestionsLoading])

  // Fetch history data on mount only
  React.useEffect(() => {
    fetchHistoryData()
  }, [])
  
  // Set up completion callback for question jobs
  React.useEffect(() => {
    const callbackKey = `questions-${interviewId}`
    
    console.log(`[Questions] Setting up completion callback with key: ${callbackKey}`)
    setCompletionCallback(callbackKey, (job) => {
      console.log(`[Questions] Completion callback triggered for job:`, job)
      if (job.type === 'question' && job.interview_id === interviewId) {
        if (job.status === 'completed') {
          console.log(`[Questions] Job completed! Showing toast and refreshing tokens`)
          toast.success("질문 생성이 완료되었습니다!")
          // Refresh tokens to show updated count (1 token spent)
          refreshTokens()
          // Note: Smart polling will handle UI updates without full refresh
        } else if (job.status === 'failed') {
          console.log(`[Questions] Job failed! Showing error toast`)
          toast.error("질문 생성에 실패했습니다. 다시 시도해주세요.")
          // Note: Smart polling will handle removing failed jobs from UI
        }
      } else {
        console.log(`[Questions] Job doesn't match criteria - type: ${job.type}, interview_id: ${job.interview_id}, expected: ${interviewId}`)
      }
    })
    
    // Cleanup callback on unmount
    return () => {
      console.log(`[Questions] Removing completion callback with key: ${callbackKey}`)
      removeCompletionCallback(callbackKey)
    }
  }, [interviewId, setCompletionCallback, removeCompletionCallback])

  // Remove local token fetching - now handled by global state

  // Smart polling for specific jobs without UI flash
  const startJobPolling = (jobId: string) => {
    console.log(`[Questions] Starting smart polling for job ${jobId}`)
    
    const pollJob = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`)
        if (response.ok) {
          const data = await response.json()
          const job = data.job
          
          console.log(`[Questions] Job ${jobId} status: ${job.status}`)
          
          if (job.status === 'completed') {
            // Replace the job row with actual questions without flash
            console.log('[Questions] Job completed! Updating UI without refresh')
            
            // Fetch only the new questions for this completed job
            const questionsResponse = await fetchInterviewQuestionsClient(interviewId as string)
            const newQuestion = questionsResponse.find(q => q.id === job.result?.question_id)
            
            if (newQuestion) {
              // Replace the job item with the actual question
              setHistoryData(prev => prev.map(item => 
                item.id === jobId 
                  ? {
                      id: newQuestion.id,
                      question: newQuestion.question_data ? getSecondAndThirdQuestions(newQuestion.question_data) : "새 질문이 생성되었습니다",
                      created_at: newQuestion.created_at
                    }
                  : item
              ))
              
              // Refresh tokens to show updated count (1 token spent)
              refreshTokens()
              // Note: Toast success is handled by completion callback to avoid duplicates
            }
            return true // Stop polling
          } else if (job.status === 'failed') {
            // Remove the failed job from UI
            setHistoryData(prev => prev.filter(item => item.id !== jobId))
            toast.error("질문 생성에 실패했습니다. 다시 시도해주세요.")
            return true // Stop polling
          } else {
            // Update status without changing the row
            setHistoryData(prev => prev.map(item => 
              item.id === jobId 
                ? { ...item, status: job.status, question: `🔄 ${job.status === 'processing' || job.status === 'progress' ? '생성 중...' : '대기 중...'} ${item.question.includes('(') ? item.question.match(/\(([^)]+)\)/)?.[0] || '' : ''}` }
                : item
            ))
            return false // Continue polling
          }
        }
      } catch (error) {
        console.error(`[Questions] Error polling job ${jobId}:`, error)
        return false // Continue polling on error
      }
      return false
    }
    
    // Poll immediately, then every 3 seconds
    const intervalId = setInterval(async () => {
      const shouldStop = await pollJob()
      if (shouldStop) {
        clearInterval(intervalId)
        console.log(`[Questions] Stopped polling for job ${jobId}`)
      }
    }, 3000)
    
    // Initial poll
    pollJob().then(shouldStop => {
      if (shouldStop) {
        clearInterval(intervalId)
        console.log(`[Questions] Job ${jobId} completed immediately`)
      }
    })
  }

  const fetchHistoryData = async () => {
    setLoadingHistory(true)
    try {
      // Fetch both active jobs and completed questions
      const [activeJobs, questions] = await Promise.all([
        getUserActiveJobsClient(),
        fetchInterviewQuestionsClient(interviewId as string)
      ])

      // Filter for question type jobs
      const questionJobs = activeJobs.filter(job => job.type === 'question')
      
      // Convert jobs to display format
      const jobsData: QuestionHistory[] = questionJobs.map(job => {
        console.log(`[Questions] Active Job ${job.id} created_at from API:`, job.created_at)
        return {
          id: job.id,
          question: `🔄 ${job.status === 'processing' || job.status === 'progress' ? '생성 중...' : '대기 중...'} ${job.comment ? `(${job.comment})` : ''}`,
          created_at: job.created_at,
          status: job.status,
          isJob: true
        }
      })

      // Convert questions to display format
      const questionsData: QuestionHistory[] = questions.map(q => {
        console.log(`[Questions] Question ${q.id} created_at from API:`, q.created_at)
        return {
          id: q.id,
          question: q.question_data ? getSecondAndThirdQuestions(q.question_data) : (q.question_text || "질문 없음"),
          created_at: q.created_at
        }
      })

      // Combine with jobs at the top
      setHistoryData([...jobsData, ...questionsData])

      // Start smart polling for any existing active jobs
      if (questionJobs.length > 0) {
        console.log(`[Questions] Found ${questionJobs.length} active question jobs`)
        questionJobs.forEach(job => {
          if (job.status === 'queued' || job.status === 'processing') {
            console.log(`[Questions] Starting polling for existing job ${job.id}`)
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

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteInterviewQuestionClient(id)
      console.log("Question deleted:", id)
      
      // Check if the deleted question was the currently selected one
      if (currentQuestionId === id) {
        // If selected question is deleted, clear selection
        setCurrentQuestion("기본 정보의 필수 항목을 저장한 후 질문을 생성해주세요")
        setCurrentQuestionId("")
        setCurrentQuestionData(null)
      }
      // If unselected question is deleted, keep current selection unchanged
      
      // Note: No need to call fetchHistoryData() here as the data table
      // already handles removing the row optimistically
    } catch (error) {
      console.error("Failed to delete question:", error)
      throw error
    }
  }

  const handleSetCurrentQuestion = (question: string, questionId: string) => {
    // If clicking on the already selected question, unselect it
    if (currentQuestionId === questionId) {
      setCurrentQuestion("")
      setCurrentQuestionId("")
      setCurrentQuestionData(null)
      return
    }

    // Find the full question data for the selected question
    const fullQuestion = historyData.find(q => q.id === questionId)
    if (fullQuestion) {
      // Fetch the full question data from the database to get proper formatting
      fetchInterviewQuestionsClient(interviewId as string).then(questions => {
        const selectedQuestion = questions.find(q => q.id === questionId)
        if (selectedQuestion?.question_data) {
          setCurrentQuestionData(selectedQuestion.question_data)
          setCurrentQuestion("")
        } else if (selectedQuestion?.question_text) {
          console.warn('Using deprecated question_text field')
          setCurrentQuestion(selectedQuestion.question_text)
          setCurrentQuestionData(null)
        } else {
          setCurrentQuestion(question) // Fallback to passed question
          setCurrentQuestionData(null)
        }
      }).catch(() => {
        setCurrentQuestion(question) // Fallback on error
        setCurrentQuestionData(null)
      })
    } else {
      setCurrentQuestion(question)
      setCurrentQuestionData(null)
    }
    setCurrentQuestionId(questionId)
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
    // Check if required basic info fields are filled FIRST
    if (!areRequiredFieldsFilled()) {
      toast.error("기본 정보의 필수 항목을 모두 입력해주세요!")
      return
    }
    
    setIsGenerateLoading(true)
    
    try {
      // Get current token state from Zustand
      const currentTokens = useStore.getState().tokens

      // Check if user has enough tokens BEFORE showing confirmation dialog
      if (currentTokens < 1) {
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
        const activeQuestionJobs = data.jobs?.filter((job: any) => job.type === 'question') || []
        
        if (activeQuestionJobs.length > 0) {
          const activeJob = activeQuestionJobs[0]
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
        console.log("Starting background question generation with comment:", comment, "questionId:", currentQuestionId)
        
        // Call the new job-based API
        const response = await generateQuestionClient(
          interviewId as string, 
          comment,
          currentQuestionId || undefined  // Pass questionId for regeneration mode
        )
        
        console.log("Job queued successfully:", response)
        console.log("API returned createdAt:", response.createdAt)
        console.log("Current date for comparison:", new Date().toISOString())
        
        // Add job to active jobs and start polling
        addActiveJob({
          id: response.jobId,
          user_id: '', // Will be set by polling
          interview_id: interviewId as string,
          type: 'question',
          status: 'queued',
          comment: comment || undefined,
          created_at: response.createdAt
        })
        
        // Start polling for job updates
        startPolling()
        
        // Clear the comment form
        form.reset({ comment: "" })
        
        // Show success message
        toast.success("질문 생성을 시작했습니다! 완료되면 표시됩니다.")
        
        // Add the job to the UI immediately without full refresh
        const newJobItem = {
          id: response.jobId,
          question: `🔄 생성 중... ${comment ? `(${comment})` : ''}`,
          created_at: response.createdAt,
          status: 'queued' as any,
          isJob: true
        }
        setHistoryData(prev => [newJobItem, ...prev])
        
        // Start smart polling for this specific job
        startJobPolling(response.jobId)
        
      } catch (error: any) {
        console.error("Failed to start question generation:", error)
        
        // Check if it's a token insufficient error
        if (error.message && error.message.includes('Insufficient tokens')) {
          toast.error("토큰이 부족합니다. 토큰을 구매해주세요.")
        } else if (error.message && error.message.includes('already in progress')) {
          // Try to parse the response to get active job info
          try {
            // The error might contain response data, let's try to fetch it
            const response = await fetch('/api/ai/question', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                interviewId: interviewId as string,
                comment: form.getValues("comment"),
                questionId: currentQuestionId || undefined
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
          toast.error("이미 질문 생성이 진행 중입니다.")
        } else {
          toast.error("질문 생성 시작에 실패했습니다. 다시 시도해주세요.")
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
        toast.error("질문 생성 시작에 실패했습니다. 다시 시도해주세요.")
      } finally {
        setPendingAction(null)
      }
    }
  }


  // Don't render content if loading or if interview doesn't match URL param
  if (loading || (currentInterview && interviewId && currentInterview.id !== interviewId)) {
    return (
      <div id="questions" className="w-full max-w-4xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">면접 질문</h1>
        </div>
        <div className="flex justify-center items-center h-32">
          <Loader className="h-4 w-4 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div id="questions" className="w-full max-w-4xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">면접 질문</h1>
        </div>

        {/* History Table */}
        <div className="mb-4 flex flex-col gap-2">
          <QuestionDataTable
            data={historyData}
            setData={setHistoryData}
            isLoading={loadingHistory}
            onDelete={handleDeleteQuestion}
            onSetCurrent={handleSetCurrentQuestion}
            currentQuestionId={currentQuestionId}
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {currentQuestionId && (
              <>
                <div className="mb-4 flex flex-col gap-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">질문</label>
                  <div 
                    className="h-[500px] overflow-y-auto p-3 border border-gray-300 rounded-md bg-white"
                  >
                    {(loadingQuestion || !currentQuestionData) ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader className="h-4 w-4 animate-spin text-black" />
                      </div>
                    ) : (
                      formatQuestionDataAsHTML(currentQuestionData)
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
                            placeholder={currentQuestionId ? "선택한 질문에 코멘트를 반영하여 재생성합니다 (선택사항)" : "질문 생성 시 참고할 코멘트를 입력하세요 (선택사항)"}
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
            {/* Alert when required basic info fields are not filled */}
            {!areRequiredFieldsFilled() && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-blue-700 text-sm">
                  기본 정보의 필수 항목(기업명, 직무, 채용공고, 자기소개서, 이력서, 기업 정보)을 모두 입력해야 질문을 생성할 수 있습니다.
                </div>
              </div>
            )}
            <div className="sticky bottom-0 bg-white/40 backdrop-blur-sm px-8 py-3 mt-6 -mx-8">
              <div className="flex justify-between items-center">
                <div>
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
                <div className="flex gap-3 items-center">
                  <div className="flex items-center gap-2">
                  <div className="relative">
              <Hexagon className="w-6 h-6 text-blue-600" />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-600">
                J
              </span>
            </div>
                    <span className="text-sm text-gray-600">
                      1 사용
                    </span>
                  </div>
                  <Button
                    type="button"
                    disabled={hasActiveJob() || isGenerateLoading || !areRequiredFieldsFilled()}
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
                      currentQuestionId ? "재생성" : "생성"
                    )}
                  </Button>
                  {showNavigation && (
                    <Button
                      type="button"
                      variant="outline"
                      className="px-8 py-2"
                      onClick={() => {
                        window.location.href = `/${interviewId}/answers`
                      }}
                    >
                      답변으로 이동
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
                1 토큰이 차감됩니다. {currentQuestionId ? "선택한 질문을 재생성" : "새로운 질문을 생성"}하시겠습니까?
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
              <AlertDialogTitle>질문 생성이 진행 중입니다</AlertDialogTitle>
              <AlertDialogDescription>
                현재 질문 생성 작업이 {activeJobInfo?.status === 'processing' ? '진행' : '대기'} 중입니다.
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
                질문 생성에는 1 토큰이 필요합니다. 토큰을 충전하시겠습니까?
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