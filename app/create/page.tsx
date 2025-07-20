"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { FileText, Eye, Trash2 } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  companyName: z.string().min(1, "기업명을 입력해주세요"),
  position: z.string().min(1, "직무를 입력해주세요"),
  jobPosting: z
    .instanceof(File)
    .refine((file) => file.size > 0, "채용공고 파일을 업로드해주세요")
    .refine(
      (file) => file.type === "application/pdf",
      "PDF 파일만 업로드 가능합니다"
    ),
  coverLetter: z
    .instanceof(File)
    .refine((file) => file.size > 0, "자기소개서 파일을 업로드해주세요")
    .refine(
      (file) => file.type === "application/pdf",
      "PDF 파일만 업로드 가능합니다"
    ),
  resume: z
    .instanceof(File)
    .refine((file) => file.size > 0, "이력서 파일을 업로드해주세요")
    .refine(
      (file) => file.type === "application/pdf",
      "PDF 파일만 업로드 가능합니다"
    ),
  companyInfo: z.string().min(1, "기업 정보를 입력해주세요"),
  expectedQuestions: z.string().optional(),
  companyEvaluation: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export default function Page() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      companyName: "",
      position: "",
      companyInfo: "",
      expectedQuestions: "",
      companyEvaluation: "",
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      console.log("Form data:", data)
      // Here you would typically send the data to your API
      alert("면접이 성공적으로 생성되었습니다!")
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (
    field: "jobPosting" | "coverLetter" | "resume",
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      form.setValue(field, file)
    }
  }

  const handleFileDelete = (field: "jobPosting" | "coverLetter" | "resume") => {
    form.setValue(field, undefined as any)
  }

  const handleFileView = (file: File) => {
    const url = URL.createObjectURL(file)
    window.open(url, '_blank')
  }

  const FileUploadField = ({ 
    field, 
    label, 
    accept = ".pdf" 
  }: { 
    field: "jobPosting" | "coverLetter" | "resume"
    label: string
    accept?: string
  }) => {
    const file = form.watch(field) as File | undefined
    
    return (
      <FormItem>
        <FormLabel>
          {label} *
        </FormLabel>
        <FormControl>
          <div className="flex items-center gap-2">
            {!file ? (
              <div className="relative flex-1">
                <Input
                  type="file"
                  accept={accept}
                  onChange={(e) => handleFileChange(field, e)}
                  className="cursor-pointer opacity-0 absolute inset-0 w-full h-full"
                />
                <div className="flex items-center px-3 py-2 border rounded-md bg-background hover:bg-muted/50 transition-colors cursor-pointer h-9">
                  <span className="text-sm text-muted-foreground">PDF 파일 업로드</span>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50 h-9">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">{file.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 group"
                  onClick={() => handleFileView(file)}
                >
                  <Eye className="h-4 w-4 group-hover:text-blue-600 transition-colors" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 group"
                  onClick={() => handleFileDelete(field)}
                >
                  <Trash2 className="h-4 w-4 group-hover:text-red-600 transition-colors" />
                </Button>
              </>
            )}
          </div>
        </FormControl>
        <FormMessage />
      </FormItem>
    )
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl p-8">
        <h1 className="text-2xl font-bold mb-4">새 면접 생성</h1>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Required Fields */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      이름 *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="이름을 입력하세요" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      기업명 *
                    </FormLabel>
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
                    <FormLabel>
                      직무 *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="직무를 입력하세요" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FileUploadField field="jobPosting" label="채용공고" />

              <FileUploadField field="coverLetter" label="자기소개서" />

              <FileUploadField field="resume" label="이력서" />

              <FormField
                control={form.control}
                name="companyInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      기업 정보 *
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="기업에 대한 정보를 입력하세요"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Optional Fields in Accordion */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="optional-fields" className="border-t border-b">
                <AccordionTrigger className="text-lg font-semibold cursor-pointer">
                  선택 항목
                </AccordionTrigger>
                <AccordionContent className="!overflow-visible !overflow-y-hidden">
                  <div className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="expectedQuestions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>예상 질문</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="면접에서 예상되는 질문들을 입력하세요"
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyEvaluation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>기업 평가 항목</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="기업이 공개한 평가 항목 및 비중을 입력하세요"
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex justify-end pt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2"
              >
                {isSubmitting ? "생성 중..." : "면접 생성"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
