"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FileText, Eye, Trash2 } from "lucide-react"
import { Interview } from "@/lib/types"

const formSchema = z.object({
  candidateName: z.string().min(1, "이름을 입력해주세요"),
  companyName: z.string().min(1, "기업명을 입력해주세요"),
  position: z.string().min(1, "직무를 입력해주세요"),
  jobPosting: z.string().min(1, "채용공고를 입력해주세요"),
  coverLetter: z.string().min(1, "자기소개서를 입력해주세요"),
  resume: z.union([
    z.object({
      type: z.literal("pdf"),
      file: z.instanceof(File).refine((file) => file.size > 0, "이력서 파일을 업로드해주세요")
        .refine((file) => file.type === "application/pdf", "PDF 파일만 업로드 가능합니다")
    }),
    z.object({
      type: z.literal("word"),
      file: z.instanceof(File).refine((file) => file.size > 0, "이력서 파일을 업로드해주세요")
        .refine((file) => file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Word 파일만 업로드 가능합니다")
    }),
    z.object({
      type: z.literal("text"),
      content: z.string().min(1, "이력서 내용을 입력해주세요")
    })
  ]),
  companyInfo: z.string().min(1, "기업 정보를 입력해주세요"),
  expectedQuestions: z.string().optional(),
  companyEvaluation: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface InformationSectionProps {
  showNavigation?: boolean
  interview?: Interview
}

export default function InformationSection({ showNavigation = true, interview }: InformationSectionProps) {
  const { interviewId } = useParams()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resumeTab, setResumeTab] = useState("text")

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: interview ? {
      candidateName: interview.candidate_name || "",
      companyName: interview.company_name || "",
      position: interview.position || "",
      jobPosting: interview.job_posting || "",
      coverLetter: interview.cover_letter || "",
      resume: { type: "text", content: "" }, // No file in DB, fallback to text
      companyInfo: interview.company_info || "",
      expectedQuestions: interview.expected_questions || "",
      companyEvaluation: interview.company_evaluation || "",
    } : {
      candidateName: "",
      companyName: "",
      position: "",
      jobPosting: "",
      coverLetter: "",
      resume: { type: "text", content: "" },
      companyInfo: "",
      expectedQuestions: "",
      companyEvaluation: "",
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      console.log("Form data:", data)
      alert("면접이 성공적으로 생성되었습니다!")
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResumeFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (resumeTab === "pdf") form.setValue("resume", { type: "pdf", file })
      else if (resumeTab === "word") form.setValue("resume", { type: "word", file })
    }
  }

  const handleResumeFileDelete = () => {
    if (resumeTab === "pdf") form.setValue("resume", { type: "pdf", file: undefined as any })
    else if (resumeTab === "word") form.setValue("resume", { type: "word", file: undefined as any })
  }

  const handleResumeFileView = (file: File) => {
    const url = URL.createObjectURL(file)
    window.open(url, '_blank')
  }

  const handleResumeTabChange = (value: string) => {
    setResumeTab(value)
    if (value === "pdf") form.setValue("resume", { type: "pdf", file: undefined as any })
    else if (value === "word") form.setValue("resume", { type: "word", file: undefined as any })
    else if (value === "text") form.setValue("resume", { type: "text", content: "" })
  }

  const ResumeFileUploadField = ({ accept = ".pdf", fileType = "PDF" }: { accept?: string, fileType?: string }) => {
    const resumeValue = form.watch("resume")
    const file = (resumeValue.type === "pdf" || resumeValue.type === "word") && resumeValue.type === resumeTab 
      ? (resumeValue as { type: "pdf" | "word"; file: File }).file 
      : undefined
    
    return (
      <div className="flex items-center gap-2">
        {!file ? (
          <div className="relative flex-1">
            <Input type="file" accept={accept} onChange={handleResumeFileChange} className="cursor-pointer opacity-0 absolute inset-0 w-full h-full"/>
            <div className="flex items-center px-3 py-2 border rounded-md bg-background hover:bg-muted/50 transition-colors cursor-pointer h-9">
              <span className="text-sm text-muted-foreground">{fileType} 파일 업로드</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50 h-9">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate">{file.name}</span>
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 group" onClick={() => handleResumeFileView(file)}><Eye className="h-4 w-4 group-hover:text-blue-600 transition-colors" /></Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 group" onClick={handleResumeFileDelete}><Trash2 className="h-4 w-4 group-hover:text-red-600 transition-colors" /></Button>
          </>
        )}
      </div>
    )
  }

  return (
    <div id="information" className="w-full max-w-4xl p-8">
      <h1 className="text-2xl font-bold mb-4">기본 정보</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Required Fields */}
          <div className="space-y-4">
            <FormField control={form.control} name="candidateName" render={({ field }) => (
                <FormItem>
                  <FormLabel>지원자명 *</FormLabel>
                  <FormControl><Input placeholder="지원자명을 입력하세요" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
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
            <FormItem>
              <FormLabel>이력서 *</FormLabel>
              <FormControl>
                <Tabs value={resumeTab} onValueChange={handleResumeTabChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="text" className="cursor-pointer">텍스트</TabsTrigger>
                    <TabsTrigger value="pdf" className="cursor-pointer">PDF</TabsTrigger>
                    <TabsTrigger value="word" className="cursor-pointer">Word</TabsTrigger>
                  </TabsList>
                  <TabsContent value="text"><FormField control={form.control} name="resume.content" render={({ field }) => (<Textarea placeholder="이력서 내용을 입력하세요" className="min-h-[100px]" {...field} />)} /></TabsContent>
                  <TabsContent value="pdf"><ResumeFileUploadField accept=".pdf" fileType="PDF" /></TabsContent>
                  <TabsContent value="word"><ResumeFileUploadField accept=".docx" fileType="Word" /></TabsContent>
                </Tabs>
              </FormControl>
              <FormMessage />
            </FormItem>
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
          </div>

          <div className="sticky bottom-0 bg-white/40 backdrop-blur-sm px-8 py-3 mt-6 -mx-8">
            <div className="flex justify-between items-center">
              <div></div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting} className="px-8 py-2">{isSubmitting ? "저장 중..." : "저장"}</Button>
                {showNavigation && (<Button type="button" variant="outline" className="px-8 py-2" onClick={() => window.location.href = `/${interviewId}/questions`}>질문으로 이동</Button>)}
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
} 