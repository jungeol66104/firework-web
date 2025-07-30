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

const formSchema = z.object({
  comment: z.string().optional(),
})
 
type FormData = z.infer<typeof formSchema>

interface QuestionsSectionProps {
  showNavigation?: boolean
}

export default function QuestionsSection({ showNavigation = true }: QuestionsSectionProps) {
  const { interviewId } = useParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [question, setQuestion] = useState("")
  const [loadingQuestion, setLoadingQuestion] = useState(true)
  
  // Chances counter (dummy - resets on page refresh)
  const [chancesLeft, setChancesLeft] = useState(4) // Start with 4 chances
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const form = useForm<{ comment?: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: "",
    },
  })

  // Fetch AI-generated question on mount
  React.useEffect(() => {
    async function fetchQuestion() {
      setLoadingQuestion(true)
      try {
        // TODO: Replace with your actual API call
        // Example: const res = await fetch(`/api/ai-question?userId=${userId}`)
        // const data = await res.json()
        // setQuestion(data.question)
        await new Promise((r) => setTimeout(r, 500)) // mock delay
        setQuestion("이곳에 AI가 생성한 질문이 표시됩니다")
      } catch (e) {
        setQuestion("질문을 불러오지 못했습니다")
      } finally {
        setLoadingQuestion(false)
      }
    }
    fetchQuestion()
  }, [interviewId])

  const handleGenerate = () => {
    if (chancesLeft <= 0) {
      setShowPaymentDialog(true)
      return
    }

    setPendingAction(() => () => {
      setIsSubmitting(true)
      // Simulate API call
      setTimeout(() => {
        setChancesLeft(prev => prev - 1)
        setIsSubmitting(false)
        alert("질문이 성공적으로 생성되었습니다!")
      }, 1000)
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
        <h1 className="text-2xl font-bold mb-4">면접 질문</h1>
        <div className="mb-4">
          <label className="block font-medium mb-1">질문</label>
          <Textarea
            value={loadingQuestion ? "질문을 불러오는 중..." : question}
            disabled
            className="min-h-[100px] bg-zinc-100 text-zinc-700"
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
                        placeholder="코멘트를 입력하세요"
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
                  <span className="text-sm text-zinc-600 font-medium">
                    남은 횟수: {chancesLeft}회
                  </span>
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