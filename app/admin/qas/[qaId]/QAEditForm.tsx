"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Interview } from "@/lib/types"
import { createClient } from "@/lib/supabase/clients/client"
import { toast } from "sonner"

const formSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다"),
  type: z.string().optional(),
  questions_data: z.string().optional(),
  answers_data: z.string().optional(),
  is_default: z.boolean()
})

type FormData = z.infer<typeof formSchema>

interface QAEditFormProps {
  qa: any
  interview: Interview | null
}

export function QAEditForm({ qa, interview }: QAEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: qa.name || "",
      type: qa.type || "",
      questions_data: qa.questions_data ? JSON.stringify(qa.questions_data, null, 2) : "",
      answers_data: qa.answers_data ? JSON.stringify(qa.answers_data, null, 2) : "",
      is_default: qa.is_default || false
    }
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const supabase = createClient()

      // Parse JSON fields
      let questionsData = null
      let answersData = null

      if (data.questions_data) {
        try {
          questionsData = JSON.parse(data.questions_data)
        } catch (e) {
          toast.error("질문 데이터 JSON 형식이 올바르지 않습니다")
          setIsSubmitting(false)
          return
        }
      }

      if (data.answers_data) {
        try {
          answersData = JSON.parse(data.answers_data)
        } catch (e) {
          toast.error("답변 데이터 JSON 형식이 올바르지 않습니다")
          setIsSubmitting(false)
          return
        }
      }

      const { error } = await supabase
        .from('interview_qas')
        .update({
          name: data.name,
          type: data.type,
          questions_data: questionsData,
          answers_data: answersData,
          is_default: data.is_default
        })
        .eq('id', qa.id)

      if (error) {
        throw error
      }

      toast.success("질의응답이 성공적으로 업데이트되었습니다!")
      router.refresh()
    } catch (error) {
      console.error("Error updating QA:", error)
      toast.error("업데이트 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">질의응답 상세</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label className="font-medium text-gray-700 text-sm">면접</label>
              <p className="text-gray-900 text-sm mt-1">
                {interview ? `${interview.company_name} - ${interview.position}` : "면접 정보 없음"}
              </p>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름</FormLabel>
                  <FormControl>
                    <Input placeholder="질의응답 이름을 입력하세요" className="rounded-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>타입</FormLabel>
                  <FormControl>
                    <Input placeholder="타입을 입력하세요" className="rounded-none" {...field} />
                  </FormControl>
                  <FormDescription>
                    예: questions_generated, answers_generated, question_regenerated 등
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-none border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      기본값으로 설정
                    </FormLabel>
                    <FormDescription>
                      이 질의응답을 기본값으로 설정합니다
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="questions_data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>질문 데이터 (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='{"general_personality": [...], "cover_letter_personality": [...]}'
                      className="min-h-[200px] font-mono text-xs rounded-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    JSON 형식으로 입력하세요. 카테고리별 질문 배열을 포함해야 합니다.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="answers_data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>답변 데이터 (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='{"general_personality": [...], "cover_letter_personality": [...]}'
                      className="min-h-[200px] font-mono text-xs rounded-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    JSON 형식으로 입력하세요. 카테고리별 답변 배열을 포함해야 합니다.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-4">
            <label className="font-medium text-gray-700 text-sm">질의응답 ID</label>
            <p className="text-gray-900 font-mono text-sm mt-1">{qa.id}</p>
          </div>

          <div>
            <label className="font-medium text-gray-700 text-sm">생성일</label>
            <p className="text-gray-900 text-sm mt-1">{new Date(qa.created_at).toLocaleDateString('ko-KR')}</p>
          </div>

          <div className="sticky bottom-0 bg-white/40 backdrop-blur-sm px-4 sm:px-8 py-3 mt-6">
            <div className="flex justify-between items-center">
              <div></div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2 rounded-none"
                >
                  {isSubmitting ? "저장 중..." : "저장"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="px-8 py-2 rounded-none"
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
