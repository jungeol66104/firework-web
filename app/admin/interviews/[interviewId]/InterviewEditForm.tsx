"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Interview, Profile } from "@/lib/types"
import { createClient } from "@/lib/supabase/clients/client"
import { toast } from "sonner"

const formSchema = z.object({
  company_name: z.string().optional(),
  position: z.string().optional(),
  job_posting: z.string().optional(),
  cover_letter: z.string().optional(),
  resume: z.string().optional(),
  company_info: z.string().optional(),
  expected_questions: z.string().optional(),
  company_evaluation: z.string().optional(),
  other: z.string().optional()
})

type FormData = z.infer<typeof formSchema>

interface InterviewEditFormProps {
  interview: Interview
  user: Profile | null
}

export function InterviewEditForm({ interview, user }: InterviewEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: interview.company_name || "",
      position: interview.position || "",
      job_posting: interview.job_posting || "",
      cover_letter: interview.cover_letter || "",
      resume: interview.resume || "",
      company_info: interview.company_info || "",
      expected_questions: interview.expected_questions || "",
      company_evaluation: interview.company_evaluation || "",
      other: interview.other || ""
    }
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('interviews')
        .update(data)
        .eq('id', interview.id)

      if (error) {
        throw error
      }

      toast.success("면접 정보가 성공적으로 업데이트되었습니다!")
      router.refresh()
    } catch (error) {
      console.error("Error updating interview:", error)
      toast.error("업데이트 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">면접 상세</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label className="font-medium text-gray-700 text-sm">사용자</label>
              <p className="text-gray-900 text-sm mt-1">{user?.name || "사용자 정보 없음"}</p>
            </div>

            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>기업명</FormLabel>
                  <FormControl>
                    <Input placeholder="기업명을 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>직무</FormLabel>
                  <FormControl>
                    <Input placeholder="직무를 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="job_posting"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>채용공고</FormLabel>
                  <FormControl>
                    <Textarea placeholder="채용공고 내용을 입력하세요" className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cover_letter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>자기소개서</FormLabel>
                  <FormControl>
                    <Textarea placeholder="자기소개서 내용을 입력하세요" className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이력서</FormLabel>
                  <FormControl>
                    <Textarea placeholder="이력서 내용을 입력하세요" className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company_info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>기업 정보</FormLabel>
                  <FormControl>
                    <Textarea placeholder="기업에 대한 정보를 입력하세요" className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Optional Fields */}
          <div className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="expected_questions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>예상 질문 (선택)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="면접에서 예상되는 질문들을 입력하세요" className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company_evaluation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>기업 평가 항목 (선택)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="기업이 공개한 평가 항목 및 비중을 입력하세요" className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="other"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>기타 (선택)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="기타 추가 정보를 입력하세요" className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <label className="font-medium text-gray-700 text-sm">면접 ID</label>
            <p className="text-gray-900 font-mono text-sm mt-1">{interview.id}</p>
          </div>

          <div>
            <label className="font-medium text-gray-700 text-sm">생성일</label>
            <p className="text-gray-900 text-sm mt-1">{new Date(interview.created_at).toLocaleDateString('ko-KR')}</p>
          </div>

          <div className="sticky bottom-0 bg-white/40 backdrop-blur-sm px-4 sm:px-8 py-3 mt-6 -mx-4 sm:-mx-8">
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