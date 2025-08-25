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
import { AnswerDataTable } from "./answersDataTable"
import { useCurrentAnswer, useAnswersLoading, useStore, useDecrementTokens, useRefreshTokens } from "@/lib/zustand"
import { generateAnswerClient, fetchInterviewAnswersClient, deleteInterviewAnswerClient, fetchInterviewQuestionsClient, getUserTokensClient } from "@/lib/supabase/services/clientServices"

const formSchema = z.object({
  comment: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface AnswersSectionProps {
  showNavigation?: boolean
}

// Define the Answer type for the history table
interface AnswerHistory {
  id: string
  answer: string
  answer_data?: any
  created_at: string
  question_id: string
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
        <div className="space-y-2 pl-4">
          {general_personality.map((a, i) => (
            <div key={i} className="flex text-sm leading-relaxed">
              <span className="w-6 flex-shrink-0">{i + 1}.</span>
              <span className="flex-1 whitespace-pre-wrap">{a}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-10">
        <h3 className="font-bold text-sm mb-3">자기소개서 기반 인성면접 답변 (10개)</h3>
        <div className="space-y-2 pl-4">
          {cover_letter_personality.map((a, i) => (
            <div key={i} className="flex text-sm leading-relaxed">
              <span className="w-6 flex-shrink-0">{i + 1}.</span>
              <span className="flex-1 whitespace-pre-wrap">{a}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-0">
        <h3 className="font-bold text-sm mb-3">자기소개서 기반 직무 역량 확인 답변 (10개)</h3>
        <div className="space-y-2 pl-4">
          {cover_letter_competency.map((a, i) => (
            <div key={i} className="flex text-sm leading-relaxed">
              <span className="w-6 flex-shrink-0">{i + 1}.</span>
              <span className="flex-1 whitespace-pre-wrap">{a}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


// Helper function to get 2nd + 3rd answers for history table display
const getSecondAndThirdAnswers = (answerData: any): string => {
  if (!answerData || typeof answerData !== 'object') {
    return "답변 데이터 없음"
  }
  
  const { general_personality } = answerData
  
  if (!Array.isArray(general_personality) || general_personality.length < 3) {
    return "답변 데이터 부족"
  }
  
  // Get 2nd answer (index 1) + space + 3rd answer (index 2)
  const secondAnswer = general_personality[1] || ""
  const thirdAnswer = general_personality[2] || ""
  
  return `${secondAnswer} ${thirdAnswer}`
}

export default function AnswersSection({ showNavigation = true }: AnswersSectionProps) {
  const { interviewId } = useParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Get state from Zustand store
  const currentAnswer = useCurrentAnswer()
  const loadingAnswer = useAnswersLoading()
  const currentQuestionId = useStore((state) => state.currentQuestionId)
  const currentAnswerId = useStore((state) => state.currentAnswerId)
  const setCurrentAnswer = useStore((state) => state.setCurrentAnswer)
  const setCurrentAnswerId = useStore((state) => state.setCurrentAnswerId)
  const setAnswersLoading = useStore((state) => state.setAnswersLoading)
  
  // Local state for current answer data (JSON format)
  const [currentAnswerData, setCurrentAnswerData] = useState<any>(null)
  
  // State for the currently selected question data
  const [currentQuestionData, setCurrentQuestionData] = useState<any>(null)
  
  const [historyData, setHistoryData] = useState<AnswerHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  
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

  // Helper function to format selected question and answer pair together
  const formatSelectedQuestionAndAnswer = (questionData: any, answerData: any): React.ReactNode => {
    if (!questionData && !answerData) {
      return <div className="text-gray-500">질문과 답변을 선택해주세요</div>
    }

    if (!questionData) {
      return <div className="text-gray-500">질문 데이터가 없습니다</div>
    }

    const renderQuestionAnswerPairs = (questions: string[], answers: string[], title: string) => {
      
      return (
        <div>
          <h3 className="font-bold text-sm mb-3">{title}</h3>
          <div className="space-y-4 pl-4">
            {questions?.map((q: string, i: number) => (
              <div key={i} className="space-y-1">
                <div className="flex text-sm">
                  <span className="w-6 flex-shrink-0">{i + 1}.</span>
                  <span className="flex-1">{q}</span>
                </div>
                {answers && answers[i] ? (
                  <div className="flex text-sm leading-relaxed text-black ml-10 pl-2">
                    <span className="flex-1 whitespace-pre-wrap">{answers[i]}</span>
                  </div>
                ) : (
                  <div className="flex text-sm leading-relaxed text-gray-500 ml-10 pl-2">
                    <span className="flex-1">답변이 없습니다</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="text-black">
        <div className="mb-10">
          {renderQuestionAnswerPairs(
            questionData.general_personality,
            answerData?.general_personality,
            "일반 인성면접 질문 (10개)"
          )}
        </div>
        
        <div className="mb-10">
          {renderQuestionAnswerPairs(
            questionData.cover_letter_personality,
            answerData?.cover_letter_personality,
            "자기소개서 기반 인성면접 질문 (10개)"
          )}
        </div>
        
        <div className="mb-0">
          {renderQuestionAnswerPairs(
            questionData.cover_letter_competency,
            answerData?.cover_letter_competency,
            "자기소개서 기반 직무 역량 확인 질문 (10개)"
          )}
        </div>
      </div>
    )
  }

  // Initialize with empty state - nothing selected
  React.useEffect(() => {
    setCurrentAnswer("")
    setCurrentAnswerId("")
    setCurrentAnswerData(null)
    setAnswersLoading(false)
  }, [interviewId, setCurrentAnswer, setCurrentAnswerId, setAnswersLoading])

  // Remove local token fetching - now handled by global state

  // Refresh history when current question changes and clear current answer
  React.useEffect(() => {
    if (currentQuestionId) {
      // Clear current answer selection when switching questions
      setCurrentAnswerId("")
      setCurrentAnswer("")
      setCurrentAnswerData(null)
      
      fetchHistoryData()
    }
  }, [currentQuestionId])

  // Handle initial load when there's already a current question ID
  React.useEffect(() => {
    if (currentQuestionId && historyData.length === 0) {
      fetchHistoryData()
    }
  }, [currentQuestionId, historyData.length])


  const fetchHistoryData = async () => {
    setLoadingHistory(true)
    try {
      const answers = await fetchInterviewAnswersClient(interviewId as string)
      
      // Filter answers to only show those related to the current question
      const filteredAnswers = answers.filter(a => a.question_id === currentQuestionId)
      
      setHistoryData(filteredAnswers.map(a => ({
        id: a.id,
        answer: a.answer_data ? getSecondAndThirdAnswers(a.answer_data) : (a.answer_text || "답변 없음"),
        answer_data: a.answer_data,
        created_at: a.created_at,
        question_id: a.question_id
      })))
      
      // Don't auto-select any answer - user must click to select

      // Also fetch the current question data if we have a currentQuestionId
      if (currentQuestionId) {
        try {
          const questions = await fetchInterviewQuestionsClient(interviewId as string)
          const currentQuestion = questions.find(q => q.id === currentQuestionId)
          if (currentQuestion?.question_data) {
            setCurrentQuestionData(currentQuestion.question_data)
          } else {
            setCurrentQuestionData(null)
          }
        } catch (qError) {
          console.error("Failed to fetch current question:", qError)
          setCurrentQuestionData(null)
        }
      }
    } catch (e) {
      console.error("Failed to fetch history:", e)
      setHistoryData([])
      setCurrentAnswerData(null)
      setCurrentAnswer("답변을 불러오지 못했습니다")
    } finally {
      setLoadingHistory(false)
    }
  }


  const handleDeleteAnswer = async (id: string) => {
    try {
      await deleteInterviewAnswerClient(id)
      console.log("Answer deleted:", id)
      
      // Check if the deleted answer was the current one
      if (currentAnswerId === id) {
        const answers = await fetchInterviewAnswersClient(interviewId as string)
        const filteredAnswers = answers.filter(a => a.question_id === currentQuestionId)
        
        if (filteredAnswers.length > 0) {
          // Update with the first available answer
          const firstAnswer = filteredAnswers[0]
          if (firstAnswer.answer_data) {
            setCurrentAnswerData(firstAnswer.answer_data)
            setCurrentAnswer("") // Will be rendered as HTML
          } else {
            setCurrentAnswerData(null)
            setCurrentAnswer(firstAnswer.answer_text || "답변 데이터를 찾을 수 없습니다")
          }
          setCurrentAnswerId(firstAnswer.id)
        } else {
          // No answers left, show placeholder
          setCurrentAnswerData(null)
          setCurrentAnswer("질문을 선택한 후 답변을 생성할 수 있습니다")
          setCurrentAnswerId("")
        }
      }
      
      // Refresh the history data
      fetchHistoryData()
    } catch (error) {
      console.error("Failed to delete answer:", error)
      throw error
    }
  }

  const handleSetCurrentAnswer = (answer: string, answerId: string, answerData?: any) => {
    // If clicking on the already selected answer, unselect it
    if (currentAnswerId === answerId) {
      setCurrentAnswer("")
      setCurrentAnswerId("")
      setCurrentAnswerData(null)
      return
    }

    // Use answer_data (JSON) if available, otherwise fall back to answer text
    if (answerData) {
      setCurrentAnswerData(answerData)
      setCurrentAnswer("") // Will be rendered as HTML
    } else {
      setCurrentAnswerData(null)
      setCurrentAnswer(answer || "답변 데이터를 찾을 수 없습니다")
    }
    setCurrentAnswerId(answerId)
  }

  const handleGenerate = () => {
    if (!currentQuestionId) {
      toast.error("질문을 먼저 선택해주세요!")
      return
    }

    // Get current token state from Zustand
    const currentTokens = useStore.getState().tokens

    // Check if user has enough tokens BEFORE showing confirmation dialog
    if (currentTokens < 2) {
      setShowPaymentDialog(true)
      return
    }

    setPendingAction(() => async () => {
      setIsSubmitting(true)
      try {
        const comment = form.getValues("comment")
        console.log("Generating answer with comment:", comment, "answerId:", currentAnswerId)
        const generatedAnswer = await generateAnswerClient(
          interviewId as string, 
          currentQuestionId, 
          comment,
          currentAnswerId || undefined  // Pass answerId for regeneration mode
        )
        
        console.log("Generated answer object:", generatedAnswer)
        console.log("Answer data:", generatedAnswer.answer_data)
        
        // Update the current answer with the generated one
        if (generatedAnswer.answer_data) {
          setCurrentAnswerData(generatedAnswer.answer_data)
          setCurrentAnswer("") // Will be rendered as HTML
        } else {
          setCurrentAnswerData(null)
          setCurrentAnswer(generatedAnswer.answer_text || "답변을 불러올 수 없습니다")
        }
        setCurrentAnswerId(generatedAnswer.id)
        
        // Clear the comment form
        form.reset({ comment: "" })
        
        // Update global token state and refresh history
        decrementTokens(2)
        fetchHistoryData()
        
        toast.success("답변이 성공적으로 생성되었습니다!")
      } catch (error: any) {
        console.error("Failed to generate answer:", error)
        
        // Check if it's a token insufficient error
        if (error.message && error.message.includes('Insufficient tokens')) {
          toast.error("토큰이 부족합니다. 토큰을 구매해주세요.")
          setShowPaymentDialog(true)
        } else {
          toast.error("답변 생성에 실패했습니다. 다시 시도해주세요.")
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
    <div id="answers" className="w-full max-w-4xl p-8">
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
            {currentAnswerId && (
              <>
                <div className="mb-4 flex flex-col gap-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">질문과 답변</label>
                  <div 
                    className={`h-[600px] overflow-y-auto p-3 border border-gray-300 rounded-md ${
                      (currentAnswerData || (currentAnswer && currentAnswer !== "답변을 선택하면 여기에 표시됩니다" && currentAnswer !== "답변을 불러오지 못했습니다"))
                        ? "bg-white"
                        : "bg-zinc-100"
                    }`}
                  >
                    {loadingAnswer ? (
                      <div className="text-gray-500">답변을 불러오는 중...</div>
                    ) : (
                      formatSelectedQuestionAndAnswer(currentQuestionData, currentAnswerData)
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

            {/* Alert when no question is selected and no answer is selected */}
            {!currentQuestionId && !currentAnswerId && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-blue-700 text-sm">
                  질문을 선택하면 해당 질문에 대한 답변을 생성할 수 있습니다.
                </div>
              </div>
            )}

            {/* Show generate button always, but disable when no question is selected */}
            <div className="sticky bottom-0 bg-white/40 backdrop-blur-sm px-8 py-3 mt-6 -mx-8">
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
                    disabled={isSubmitting || !currentQuestionId}
                    className="px-8 py-2 bg-black text-white hover:bg-zinc-800 disabled:bg-gray-400"
                    onClick={handleGenerate}
                  >
                    {isSubmitting ? "생성 중..." : currentAnswerId ? "재생성" : "생성"}
                  </Button>
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
          <AlertDialogTitle className="sr-only">답변 생성 중</AlertDialogTitle>
          <Loader className="w-4 h-4 animate-spin text-gray-600" />
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 