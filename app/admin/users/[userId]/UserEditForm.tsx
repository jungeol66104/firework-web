"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Profile } from "@/lib/types"
import { createClient } from "@/lib/supabase/clients/client"
import { toast } from "sonner"

const formSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다"),
  email: z.string().email("올바른 이메일 형식이 아닙니다").optional().or(z.literal("")),
  is_admin: z.boolean()
})

type FormData = z.infer<typeof formSchema>

interface UserEditFormProps {
  user: Profile
}

export function UserEditForm({ user }: UserEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name || "",
      email: user.email || "",
      is_admin: user.is_admin || false
    }
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const supabase = createClient()

      const updateData = {
        name: data.name,
        email: data.email || null,
        is_admin: data.is_admin
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (error) {
        throw error
      }

      toast.success("사용자 정보가 성공적으로 업데이트되었습니다!")
      router.refresh()
    } catch (error) {
      console.error("Error updating user:", error)
      toast.error("업데이트 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">사용자 상세</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름 *</FormLabel>
                  <FormControl>
                    <Input placeholder="이름을 입력하세요" className="rounded-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input placeholder="이메일을 입력하세요" type="email" className="rounded-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_admin"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>관리자 권한</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div>
              <label className="font-medium text-gray-700 text-sm">사용자 ID</label>
              <p className="text-gray-900 font-mono text-sm mt-1">{user.id}</p>
            </div>

            <div>
              <label className="font-medium text-gray-700 text-sm">가입일</label>
              <p className="text-gray-900 text-sm mt-1">{new Date(user.created_at).toLocaleDateString('ko-KR')}</p>
            </div>
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