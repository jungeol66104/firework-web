"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { createClient } from "@/lib/supabase/clients/client"
import { toast } from "sonner"

const formSchema = z.object({
  comment: z.string().optional()
})

type FormData = z.infer<typeof formSchema>

interface AnswerEditFormProps {
  answer: any
}

export function AnswerEditForm({ answer }: AnswerEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // Extract answer text from answer_data JSONB field
  let answerText = "답변 데이터 없음"
  if (answer.answer_data) {
    if (answer.answer_data.general_personality && Array.isArray(answer.answer_data.general_personality)) {
      answerText = answer.answer_data.general_personality.join(", ")
    } else if (answer.answer_data.cover_letter_personality && Array.isArray(answer.answer_data.cover_letter_personality)) {
      answerText = answer.answer_data.cover_letter_personality.join(", ")
    } else if (answer.answer_data.cover_letter_competency && Array.isArray(answer.answer_data.cover_letter_competency)) {
      answerText = answer.answer_data.cover_letter_competency.join(", ")
    } else if (typeof answer.answer_data === 'string') {
      answerText = answer.answer_data
    } else if (answer.answer_data.text) {
      answerText = answer.answer_data.text
    }
  }

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: answer.comment || ""
    }
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('interview_answers')
        .update({ comment: data.comment || null })
        .eq('id', answer.id)

      if (error) {
        throw error
      }

      toast.success("답변 정보가 성공적으로 업데이트되었습니다!")
      router.refresh()
    } catch (error) {
      console.error("Error updating answer:", error)
      toast.error("업데이트 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">답변 상세</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label className="font-medium text-gray-700 text-sm">답변 내용</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <p className="text-gray-900 text-sm whitespace-pre-wrap">
                  {answerText}
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>코멘트</FormLabel>
                  <FormControl>
                    <Textarea placeholder="코멘트를 입력하세요" className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <label className="font-medium text-gray-700 text-sm">답변 데이터 (JSON)</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md max-h-40 overflow-y-auto">
                <pre className="text-gray-900 text-xs">
                  {JSON.stringify(answer.answer_data, null, 2)}
                </pre>
              </div>
            </div>

            <div>
              <label className="font-medium text-gray-700 text-sm">답변 ID</label>
              <p className="text-gray-900 font-mono text-sm mt-1">{answer.id}</p>
            </div>

            <div>
              <label className="font-medium text-gray-700 text-sm">질문 ID</label>
              <p className="text-gray-900 font-mono text-sm mt-1">{answer.question_id}</p>
            </div>

            <div>
              <label className="font-medium text-gray-700 text-sm">면접 ID</label>
              <p className="text-gray-900 font-mono text-sm mt-1">{answer.interview_id}</p>
            </div>

            <div>
              <label className="font-medium text-gray-700 text-sm">생성일</label>
              <p className="text-gray-900 text-sm mt-1">{new Date(answer.created_at).toLocaleDateString('ko-KR')}</p>
            </div>

            <div>
              <label className="font-medium text-gray-700 text-sm">수정일</label>
              <p className="text-gray-900 text-sm mt-1">{new Date(answer.updated_at).toLocaleDateString('ko-KR')}</p>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white/40 backdrop-blur-sm px-4 sm:px-8 py-3 mt-6">
            <div className="flex justify-between items-center">
              <div></div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2"
                >
                  {isSubmitting ? "저장 중..." : "저장"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="px-8 py-2"
                  onClick={() => router.back()}
                >
                  취소
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}