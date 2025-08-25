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
import { useCurrentQuestion, useQuestionsLoading, useStore, useDecrementTokens, useRefreshTokens } from "@/lib/zustand"
import { generateQuestionClient, fetchInterviewQuestionsClient, deleteInterviewQuestionClient, getUserTokensClient } from "@/lib/supabase/services/clientServices"

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Get state from Zustand store
  const currentQuestion = useCurrentQuestion()
  const currentQuestionId = useStore((state) => state.currentQuestionId)
  const loadingQuestion = useQuestionsLoading()
  const setCurrentQuestion = useStore((state) => state.setCurrentQuestion)
  const setCurrentQuestionId = useStore((state) => state.setCurrentQuestionId)
  const setQuestionsLoading = useStore((state) => state.setQuestionsLoading)
  
  // Local state for current question data (JSON format)
  const [currentQuestionData, setCurrentQuestionData] = useState<any>(null)
  
  const [historyData, setHistoryData] = useState<QuestionHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // Global token state
  const decrementTokens = useDecrementTokens()
  const refreshTokens = useRefreshTokens()
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showLoadingDialog, setShowLoadingDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

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

  // Fetch history data and tokens on mount
  React.useEffect(() => {
    fetchHistoryData()
  }, [])

  // Remove local token fetching - now handled by global state

  const fetchHistoryData = async () => {
    setLoadingHistory(true)
    try {
      const questions = await fetchInterviewQuestionsClient(interviewId as string)
      setHistoryData(questions.map((q, index) => ({
        id: q.id,
        question: q.question_data ? getSecondAndThirdQuestions(q.question_data) : (q.question_text || "질문 없음"),
        created_at: q.created_at
      })))
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
      
      // Check if the deleted question was the current one
      const questions = await fetchInterviewQuestionsClient(interviewId as string)
      if (questions && questions.length > 0) {
        // Update with the first available question
        const firstQuestion = questions[0]
        if (firstQuestion.question_data) {
          setCurrentQuestionData(firstQuestion.question_data)
          setCurrentQuestion("")
        } else if (firstQuestion.question_text) {
          console.warn('Using deprecated question_text field')
          setCurrentQuestion(firstQuestion.question_text)
          setCurrentQuestionData(null)
        } else {
          setCurrentQuestion("질문 데이터를 찾을 수 없습니다")
          setCurrentQuestionData(null)
        }
        setCurrentQuestionId(firstQuestion.id)
      } else {
        // No questions left, show placeholder
        setCurrentQuestion("기본 정보의 필수 항목을 저장한 후 질문을 생성해주세요")
        setCurrentQuestionId("")
      }
      
      // Refresh the history data
      fetchHistoryData()
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

  const handleGenerate = () => {
    // Get current token state from Zustand
    const currentTokens = useStore.getState().tokens

    // Check if user has enough tokens BEFORE showing confirmation dialog
    if (currentTokens < 1) {
      setShowPaymentDialog(true)
      return
    }

    setPendingAction(() => async () => {
      setIsSubmitting(true)
      try {
        const comment = form.getValues("comment")
        console.log("Generating question with comment:", comment, "questionId:", currentQuestionId)
        const generatedQuestion = await generateQuestionClient(
          interviewId as string, 
          comment,
          currentQuestionId || undefined  // Pass questionId for regeneration mode
        )
        
        console.log("Generated question object:", generatedQuestion)
        console.log("Question data:", generatedQuestion.question_data)
        
        // Update the current question with the generated one
        if (generatedQuestion.question_data) {
          setCurrentQuestionData(generatedQuestion.question_data)
          setCurrentQuestion("")
        } else {
          console.error('No question_data in generated question!')
          throw new Error('Generated question missing JSON data')
        }
        setCurrentQuestionId(generatedQuestion.id)
        
        // Clear the comment form
        form.reset({ comment: "" })
        
        // Update global token state and refresh history
        decrementTokens(1)
        fetchHistoryData()
        
        toast.success("질문이 성공적으로 생성되었습니다!")
      } catch (error: any) {
        console.error("Failed to generate question:", error)
        
        // Check if it's a token insufficient error
        if (error.message && error.message.includes('Insufficient tokens')) {
          toast.error("토큰이 부족합니다. 토큰을 구매해주세요.")
          setShowPaymentDialog(true)
        } else {
          toast.error("질문 생성에 실패했습니다. 다시 시도해주세요.")
        }
      } finally {
        setIsSubmitting(false)
      }
    })
    setShowConfirmationDialog(true)
  }

  const onSubmit = async (data: { comment?: string }) => {
    console.log("코멘트 폼 데이터:", data)
    toast.success("코멘트가 성공적으로 제출되었습니다!")
  }

  const handleConfirmGenerate = async () => {
    setShowConfirmationDialog(false)
    setShowLoadingDialog(true)
    
    if (pendingAction) {
      try {
        await pendingAction()
      } catch (error) {
        console.error('Error during generation:', error)
      } finally {
        setShowLoadingDialog(false)
        setPendingAction(null)
      }
    }
  }

  const handlePaymentConfirm = () => {
    setShowPaymentDialog(false)
    
    const paymentWindow = window.open(
      '/payments/checkout',
      'payment',
      'width=700,height=700,centerscreen=yes,resizable=no,scrollbars=no'
    )
    
    if (!paymentWindow) {
      alert('팝업이 차단되었습니다. 팝업을 허용하고 다시 시도해주세요.')
      return
    }
    
    // Monitor window closure and refresh tokens
    const checkInterval = setInterval(() => {
      if (paymentWindow.closed) {
        clearInterval(checkInterval)
        refreshTokens() // Refresh global token state
      }
    }, 1000)
  }

  return (
    <div id="questions" className="w-full max-w-4xl p-8">
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
                    className={`h-[400px] overflow-y-auto p-3 border border-gray-300 rounded-md ${
                      (currentQuestionData || (currentQuestion && currentQuestion !== "기본 정보의 필수 항목을 저장한 후 질문을 생성해주세요" && currentQuestion !== "질문을 불러오지 못했습니다"))
                        ? "bg-white"
                        : "bg-zinc-100"
                    }`}
                  >
                    {loadingQuestion ? (
                      <div className="text-gray-500">질문을 불러오는 중...</div>
                    ) : currentQuestionData ? (
                      formatQuestionDataAsHTML(currentQuestionData)
                    ) : currentQuestion ? (
                      <div className="text-black whitespace-pre-wrap">{currentQuestion}</div>
                    ) : (
                      <div className="text-gray-500">기본 정보의 필수 항목을 저장한 후 질문을 생성해주세요</div>
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
                    disabled={isSubmitting}
                    className="px-8 py-2 bg-black text-white hover:bg-zinc-800"
                    onClick={handleGenerate}
                  >
                    {isSubmitting ? "생성 중..." : currentQuestionId ? "재생성" : "생성"}
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

        {/* Payment Dialog */}
        <AlertDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>사용 횟수 소진</AlertDialogTitle>
              <AlertDialogDescription>
                모든 사용 횟수를 소진했습니다. 토큰을 충전하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handlePaymentConfirm} className="bg-blue-600 hover:bg-blue-700">
                충전하기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Loading Dialog */}
        <AlertDialog open={showLoadingDialog} onOpenChange={() => {}}>
          <AlertDialogContent className="w-20 h-20 p-0 border-none shadow-lg bg-white flex items-center justify-center">
            <AlertDialogTitle className="sr-only">질문 생성 중</AlertDialogTitle>
            <Loader className="w-4 h-4 animate-spin text-gray-600" />
          </AlertDialogContent>
        </AlertDialog>
      </div>
  )
} 