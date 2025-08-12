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
import { Hexagon } from "lucide-react"
import { QuestionDataTable } from "./questionsDataTable"
import { useCurrentQuestion, useQuestionsLoading, useStore } from "@/utils/zustand"
import { generateQuestionClient, fetchInterviewQuestionsClient, deleteInterviewQuestionClient } from "@/utils/supabase/services/clientServices"

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

export default function QuestionsSection({ showNavigation = true }: QuestionsSectionProps) {
  const { interviewId } = useParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Get state from Zustand store
  const currentQuestion = useCurrentQuestion()
  const loadingQuestion = useQuestionsLoading()
  const setCurrentQuestion = useStore((state) => state.setCurrentQuestion)
  const setQuestionsLoading = useStore((state) => state.setQuestionsLoading)
  
  const [historyData, setHistoryData] = useState<QuestionHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // Chances counter (dummy - resets on page refresh)
  const [chancesLeft, setChancesLeft] = useState(1) // Start with 1 chance for questions
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const form = useForm<{ comment?: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: "",
    },
  })

  // Fetch the first question from database on mount
  React.useEffect(() => {
    async function fetchFirstQuestion() {
      setQuestionsLoading(true)
      try {
        const questions = await fetchInterviewQuestionsClient(interviewId as string)
        
        if (questions && questions.length > 0) {
          // Get the first question (most recent due to DESC order)
          const firstQuestion = questions[0]
          setCurrentQuestion(firstQuestion.question_text)
        } else {
          setCurrentQuestion("기본 정보의 필수 항목을 저장한 후 질문을 생성해주세요")
        }
      } catch (e) {
        console.error("Failed to fetch first question:", e)
        setCurrentQuestion("질문을 불러오지 못했습니다")
      } finally {
        setQuestionsLoading(false)
      }
    }
    fetchFirstQuestion()
  }, [interviewId, setCurrentQuestion, setQuestionsLoading])

  // Fetch history data on mount
  React.useEffect(() => {
    fetchHistoryData()
  }, [])

  const fetchHistoryData = async () => {
    setLoadingHistory(true)
    try {
      const questions = await fetchInterviewQuestionsClient(interviewId as string)
      setHistoryData(questions.map(q => ({
        id: q.id,
        question: q.question_text,
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
        setCurrentQuestion(questions[0].question_text)
      } else {
        // No questions left, show placeholder
        setCurrentQuestion("기본 정보의 필수 항목을 저장한 후 질문을 생성해주세요")
      }
      
      // Refresh the history data
      fetchHistoryData()
    } catch (error) {
      console.error("Failed to delete question:", error)
      throw error
    }
  }

  const handleSetCurrentQuestion = (question: string) => {
    setCurrentQuestion(question)
    // Show a toast notification
    alert("질문이 현재 질문으로 설정되었습니다!")
  }

  const handleGenerate = () => {
    if (chancesLeft <= 0) {
      setShowPaymentDialog(true)
      return
    }

    setPendingAction(() => async () => {
      setIsSubmitting(true)
      try {
        const comment = form.getValues("comment")
        console.log("Generating question with comment:", comment)
        const generatedQuestion = await generateQuestionClient(interviewId as string, comment)
        
        console.log("Generated question object:", generatedQuestion)
        console.log("Question text:", generatedQuestion.question_text)
        
        // Update the current question with the generated one
        setCurrentQuestion(generatedQuestion.question_text)
        
        // Clear the comment form
        form.reset({ comment: "" })
        
        // Decrease chances
        setChancesLeft(prev => prev - 1)
        
        // Refresh history
        fetchHistoryData()
        
        alert("질문이 성공적으로 생성되었습니다!")
      } catch (error) {
        console.error("Failed to generate question:", error)
        alert("질문 생성에 실패했습니다. 다시 시도해주세요.")
      } finally {
        setIsSubmitting(false)
      }
    })
    setShowConfirmationDialog(true)
  }

  const onSubmit = async (data: { comment?: string }) => {
    console.log("코멘트 폼 데이터:", data)
    alert("코멘트가 성공적으로 제출되었습니다!")
  }

  const handleConfirmGenerate = () => {
    setShowConfirmationDialog(false)
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
  }

  const handlePaymentConfirm = () => {
    setShowPaymentDialog(false)
    alert("결제 페이지로 이동합니다...")
    // TODO: Redirect to payment page
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
          />
        </div>

        <div className="mb-4 flex flex-col gap-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">질문</label>
          <Textarea
            value={loadingQuestion ? "질문을 불러오는 중..." : currentQuestion}
            disabled
            className="min-h-[200px] bg-zinc-100 text-zinc-700 whitespace-pre-wrap"
            placeholder="기본 정보의 필수 항목을 저장한 후 질문을 생성해주세요"
          />
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>코멘트</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="질문 생성 시 참고할 코멘트를 입력하세요 (선택사항)"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                      {chancesLeft}
                    </span>
                  </div>
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    className="px-8 py-2 bg-black text-white hover:bg-zinc-800"
                    onClick={handleGenerate}
                  >
                    {isSubmitting ? "생성 중..." : "생성"}
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
                1회가 차감됩니다. 진행하시겠습니까?
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
                모든 사용 횟수를 소진했습니다. 다른 요금제로 결제하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handlePaymentConfirm}>
                결제하기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  )
} 