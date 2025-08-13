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
import { Hexagon, History } from "lucide-react"
import { AnswerDataTable } from "./answersDataTable"
import { useCurrentAnswer, useAnswersLoading, useStore } from "@/utils/zustand"
import { generateAnswerClient, fetchInterviewAnswersClient, deleteInterviewAnswerClient, fetchInterviewQuestionsClient } from "@/utils/supabase/services/clientServices"

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
  created_at: string
  question_id: string
}

// Define the Question type for selection
interface Question {
  id: string
  question_text: string
  created_at: string
}

export default function AnswersSection({ showNavigation = true }: AnswersSectionProps) {
  const { interviewId } = useParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Get state from Zustand store
  const currentAnswer = useCurrentAnswer()
  const loadingAnswer = useAnswersLoading()
  const currentQuestionId = useStore((state) => state.currentQuestionId)
  const setCurrentAnswer = useStore((state) => state.setCurrentAnswer)
  const setAnswersLoading = useStore((state) => state.setAnswersLoading)
  
  const [historyData, setHistoryData] = useState<AnswerHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  
  // Chances counter (dummy - resets on page refresh)
  const [chancesLeft, setChancesLeft] = useState(2) // Start with 2 chances for answers
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const form = useForm<{ comment?: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: "",
    },
  })

  // Fetch questions and first answer on mount
  React.useEffect(() => {
    async function fetchQuestionsAndAnswer() {
      setAnswersLoading(true)
      try {
        // Fetch questions first
        const questionsData = await fetchInterviewQuestionsClient(interviewId as string)
        setQuestions(questionsData.map(q => ({
          id: q.id,
          question_text: q.question_text,
          created_at: q.created_at
        })))
        
        // Don't set a default answer here - it will be set when a question is selected
        setCurrentAnswer("질문을 선택한 후 답변을 생성할 수 있습니다")
      } catch (e) {
        console.error("Failed to fetch questions and answers:", e)
        setCurrentAnswer("답변을 불러오지 못했습니다")
      } finally {
        setAnswersLoading(false)
      }
    }
    fetchQuestionsAndAnswer()
  }, [interviewId, setCurrentAnswer, setAnswersLoading])

  // Refresh history when current question changes
  React.useEffect(() => {
    if (currentQuestionId) {
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
        answer: a.answer_text,
        created_at: a.created_at,
        question_id: a.question_id
      })))
      
      // Set the current answer based on the first answer for this question
      if (filteredAnswers.length > 0) {
        setCurrentAnswer(filteredAnswers[0].answer_text)
      } else {
        setCurrentAnswer("질문을 선택한 후 답변을 생성할 수 있습니다")
      }
    } catch (e) {
      console.error("Failed to fetch history:", e)
      setHistoryData([])
      setCurrentAnswer("답변을 불러오지 못했습니다")
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleDeleteAnswer = async (id: string) => {
    try {
      await deleteInterviewAnswerClient(id)
      console.log("Answer deleted:", id)
      
      // Refresh the history data which will also update the current answer
      fetchHistoryData()
    } catch (error) {
      console.error("Failed to delete answer:", error)
      throw error
    }
  }

  const handleSetCurrentAnswer = (answer: string) => {
    setCurrentAnswer(answer)
  }

  const handleGenerate = () => {
    if (!currentQuestionId) {
      alert("질문을 먼저 선택해주세요!")
      return
    }

    if (chancesLeft <= 0) {
      setShowPaymentDialog(true)
      return
    }

    setPendingAction(() => async () => {
      setIsSubmitting(true)
      try {
        const comment = form.getValues("comment")
        console.log("Generating answer with comment:", comment)
        const generatedAnswer = await generateAnswerClient(interviewId as string, currentQuestionId, comment)
        
        console.log("Generated answer object:", generatedAnswer)
        console.log("Answer text:", generatedAnswer.answer_text)
        
        // Update the current answer with the generated one
        setCurrentAnswer(generatedAnswer.answer_text)
        
        // Clear the comment form
        form.reset({ comment: "" })
        
        // Decrease chances
        setChancesLeft(prev => prev - 1)
        
        // Refresh history
        fetchHistoryData()
        
        alert("답변이 성공적으로 생성되었습니다!")
      } catch (error) {
        console.error("Failed to generate answer:", error)
        alert("답변 생성에 실패했습니다. 다시 시도해주세요.")
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
          />
        </div>

      

      <div className="mb-4 flex flex-col gap-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">답변</label>
        <Textarea
          value={loadingAnswer ? "답변을 불러오는 중..." : currentAnswer}
          disabled
          className={`min-h-[200px] whitespace-pre-wrap ${
            currentAnswer && currentAnswer !== "질문을 선택한 후 답변을 생성할 수 있습니다" && currentAnswer !== "답변을 불러오지 못했습니다"
              ? "bg-white !text-black"
              : "bg-zinc-100 text-zinc-700"
          }`}
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
                        placeholder="답변 생성 시 참고할 코멘트를 입력하세요 (선택사항)"
                        className="min-h-[100px]"
                        disabled={!currentQuestionId}
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
                    {chancesLeft}
                  </span>
                </div>
                <Button
                  type="button"
                  disabled={isSubmitting || !currentQuestionId}
                  className="px-8 py-2 bg-black text-white hover:bg-zinc-800 disabled:bg-gray-400"
                  onClick={handleGenerate}
                >
                  {isSubmitting ? "생성 중..." : "생성"}
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