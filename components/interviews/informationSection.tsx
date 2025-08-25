"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Interview } from "@/lib/types"
import { fetchInterviewByIdClient, getCurrentUserClient, updateInterviewClient } from "@/lib/supabase/services/clientServices"
import { useCurrentInterview, useStore } from "@/lib/zustand"

const formSchema = z.object({
  companyName: z.string().min(1, "기업명을 입력해주세요"),
  position: z.string().min(1, "직무를 입력해주세요"),
  jobPosting: z.string().min(1, "채용공고를 입력해주세요"),
  coverLetter: z.string().min(1, "자기소개서를 입력해주세요"),
  resume: z.string().min(1, "이력서 내용을 입력해주세요"),
  companyInfo: z.string().min(1, "기업 정보를 입력해주세요"),
  expectedQuestions: z.string().optional(),
  companyEvaluation: z.string().optional(),
  otherNotes: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface InformationSectionProps {
  showNavigation?: boolean
  interview?: Interview
}

// Default interview data
const defaultInterview: Interview = {
  id: "",
  candidate_name: "",
  company_name: "",
  position: "",
  job_posting: "",
  cover_letter: "",
  resume: "",
  company_info: "",
  expected_questions: "",
  company_evaluation: "",
  other: "",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: "",
}

export default function InformationSection({ showNavigation = true, interview: propInterview }: InformationSectionProps) {
  const params = useParams()
  const interviewId = params.interviewId as string
  
  // Get state from Zustand store
  const currentInterview = useCurrentInterview()
  const setCurrentInterview = useStore((state) => state.setCurrentInterview)
  const setLoading = useStore((state) => state.setLoading)
  
  // Use prop interview if provided, otherwise use store interview
  const interview = propInterview || currentInterview
  const loading = useStore((state) => state.isLoading)
  
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch interview data if not provided as prop
  useEffect(() => {
    const fetchInterview = async () => {
      if (propInterview) {
        setCurrentInterview(propInterview)
        setLoading(false)
        return
      }

      if (!interviewId) return

      try {
        setLoading(true)
        setError(null)
        
        // Get current user
        const user = await getCurrentUserClient()
        const currentUserId = user?.id || undefined
        
        // Fetch interview data
        const interviewData = await fetchInterviewByIdClient(interviewId, currentUserId)
        
        if (!interviewData) {
          setError("Interview not found")
          setCurrentInterview(defaultInterview)
          return
        }
        
        setCurrentInterview(interviewData)
      } catch (err) {
        console.error("Error fetching interview:", err)
        setError("Failed to load interview")
        setCurrentInterview(defaultInterview)
      } finally {
        setLoading(false)
      }
    }

    fetchInterview()
  }, [interviewId, propInterview, setCurrentInterview, setLoading])

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
          defaultValues: interview ? {
        companyName: interview.company_name || "",
        position: interview.position || "",
        jobPosting: interview.job_posting || "",
        coverLetter: interview.cover_letter || "",
        resume: interview.resume || "",
        companyInfo: interview.company_info || "",
        expectedQuestions: interview.expected_questions || "",
        companyEvaluation: interview.company_evaluation || "",
        otherNotes: interview.other || "",
      } : {
      companyName: "",
      position: "",
      jobPosting: "",
      coverLetter: "",
      resume: "",
      companyInfo: "",
      expectedQuestions: "",
      companyEvaluation: "",
      otherNotes: "",
    },
  })

  // Update form when interview data is loaded
  useEffect(() => {
    if (interview) {
      form.reset({
        companyName: interview.company_name || "",
        position: interview.position || "",
        jobPosting: interview.job_posting || "",
        coverLetter: interview.cover_letter || "",
        resume: interview.resume || "",
        companyInfo: interview.company_info || "",
        expectedQuestions: interview.expected_questions || "",
        companyEvaluation: interview.company_evaluation || "",
        otherNotes: interview.other || "",
      })
    }
  }, [interview, form])

  const onSubmit = async (data: FormData) => {
    if (!interviewId) {
      alert("면접 ID를 찾을 수 없습니다.")
      return
    }

    setIsSubmitting(true)
    try {
      console.log("Starting form submission with data:", data)
      
      // Get current user
      const user = await getCurrentUserClient()
      console.log("Current user:", user)
      
      if (!user?.id) {
        alert("사용자 인증이 필요합니다. 다시 로그인해주세요.")
        return
      }

      // Prepare update data
      const updateData = {
        company_name: data.companyName,
        position: data.position,
        job_posting: data.jobPosting,
        cover_letter: data.coverLetter,
        resume: data.resume,
        company_info: data.companyInfo,
        expected_questions: data.expectedQuestions || "",
        company_evaluation: data.companyEvaluation || "",
        other: data.otherNotes || "",
      }

      console.log("Update data prepared:", updateData)
      console.log("Calling updateInterviewClient with interviewId:", interviewId, "user_id:", user.id)

      // Update interview in database
      const updatedInterview = await updateInterviewClient(interviewId, updateData, user.id)
      
      // Update store state
      setCurrentInterview(updatedInterview)
      
      console.log("Interview updated successfully:", updatedInterview)
      alert("면접 정보가 성공적으로 저장되었습니다!")
    } catch (error) {
      console.error("Error updating interview:", error)
      alert("저장 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }




  return (
    <div id="information" className="w-full max-w-4xl p-8">
      <h1 className="text-2xl font-bold mb-4">기본 정보</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Required Fields */}
          <div className="space-y-4">
            <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem>
                  <FormLabel>기업명 *</FormLabel>
                  <FormControl><Input placeholder="기업명을 입력하세요" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            <FormField control={form.control} name="position" render={({ field }) => (
                <FormItem>
                  <FormLabel>직무 *</FormLabel>
                  <FormControl><Input placeholder="직무를 입력하세요" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} /> 
            <FormField control={form.control} name="jobPosting" render={({ field }) => (
                <FormItem>
                  <FormLabel>채용공고 *</FormLabel>
                  <FormControl><Textarea placeholder="채용공고 내용을 입력하세요" className="min-h-[100px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            <FormField control={form.control} name="coverLetter" render={({ field }) => (
                <FormItem>
                  <FormLabel>자기소개서 *</FormLabel>
                  <FormControl><Textarea placeholder="자기소개서 내용을 입력하세요" className="min-h-[100px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            <FormField control={form.control} name="resume" render={({ field }) => (
                <FormItem>
                  <FormLabel>이력서 *</FormLabel>
                  <FormControl><Textarea placeholder="이력서 내용을 입력하세요" className="min-h-[100px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            <FormField control={form.control} name="companyInfo" render={({ field }) => (
                <FormItem>
                  <FormLabel>기업 정보 *</FormLabel>
                  <FormControl><Textarea placeholder="기업에 대한 정보를 입력하세요" className="min-h-[100px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
          </div>

          {/* Optional Fields */}
          <div className="space-y-4 mt-4">
            <FormField control={form.control} name="expectedQuestions" render={({ field }) => (
                <FormItem>
                  <FormLabel>예상 질문 (선택)</FormLabel>
                  <FormControl><Textarea placeholder="면접에서 예상되는 질문들을 입력하세요" className="min-h-[100px]" {...field} /></FormControl>                    
                  <FormMessage />
                </FormItem>
              )} />
            <FormField control={form.control} name="companyEvaluation" render={({ field }) => (
                <FormItem>
                  <FormLabel>기업 평가 항목 (선택)</FormLabel>
                  <FormControl><Textarea placeholder="기업이 공개한 평가 항목 및 비중을 입력하세요" className="min-h-[100px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            <FormField control={form.control} name="otherNotes" render={({ field }) => (
                <FormItem>
                  <FormLabel>기타 (선택)</FormLabel>
                  <FormControl><Textarea placeholder="기타 추가 정보를 입력하세요" className="min-h-[100px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
          </div>

          <div className="sticky bottom-0 bg-white/40 backdrop-blur-sm px-8 py-3 mt-6 -mx-8">
            <div className="flex justify-between items-center">
              <div></div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting} className="px-8 py-2">{isSubmitting ? "저장 중..." : "저장"}</Button>
                {showNavigation && (<Button type="button" variant="outline" className="px-8 py-2" onClick={() => document.getElementById('questions')?.scrollIntoView({ behavior: 'smooth' })}>질문으로 이동</Button>)}
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
} 