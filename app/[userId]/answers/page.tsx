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

const formSchema = z.object({
  comment: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export default function Page() {
  const { userId } = useParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [answer, setAnswer] = useState("")
  const [loadingAnswer, setLoadingAnswer] = useState(true)

  const form = useForm<{ comment?: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: "",
    },
  })

  // Fetch AI-generated answer on mount
  React.useEffect(() => {
    async function fetchAnswer() {
      setLoadingAnswer(true)
      try {
        // TODO: Replace with your actual API call
        // Example: const res = await fetch(`/api/ai-answer?userId=${userId}`)
        // const data = await res.json()
        // setAnswer(data.answer)
        await new Promise((r) => setTimeout(r, 500)) // mock delay
        setAnswer("이곳에 AI가 생성한 답변이 표시됩니다")
      } catch (e) {
        setAnswer("답변을 불러오지 못했습니다")
      } finally {
        setLoadingAnswer(false)
      }
    }
    fetchAnswer()
  }, [userId])

  const onSubmit = async (data: { comment?: string }) => {
    setIsSubmitting(true)
    try {
      console.log("코멘트 폼 데이터:", data)
      alert("코멘트가 성공적으로 제출되었습니다!")
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl p-8">
        <h1 className="text-2xl font-bold mb-4">면접 답변 생성</h1>
        <div className="mb-4">
          <label className="block font-medium mb-1">답변</label>
          <Textarea
            value={loadingAnswer ? "답변을 불러오는 중..." : answer}
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
            <div className="flex justify-between items-center pt-6">
              <Button
                type="button"
                variant="outline"
                className="px-8 py-2"
                onClick={() => {
                  window.location.href = `/${userId}/questions`
                }}
              >
                질문으로 이동
              </Button>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-2 bg-black text-white hover:bg-zinc-800"
                >
                  {isSubmitting ? "생성 중..." : "생성"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
