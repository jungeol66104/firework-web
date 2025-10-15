'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface ReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedQuestions: Set<string>
  selectedAnswers: Set<string>
  interviewQasId: string | null
  questionData: any
  answerData: any
  onSuccess?: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  general_personality: '일반 인성면접',
  cover_letter_personality: '자소서 기반 인성면접',
  cover_letter_competency: '자소서 기반 역량면접'
}

export default function ReportModal({
  open,
  onOpenChange,
  selectedQuestions,
  selectedAnswers,
  interviewQasId,
  questionData,
  answerData,
  onSuccess
}: ReportModalProps) {
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!interviewQasId) {
      toast.error('면접 질문지를 선택해주세요')
      return
    }

    if (!description.trim()) {
      toast.error('문제 설명을 입력해주세요')
      return
    }

    if (selectedQuestions.size === 0 && selectedAnswers.size === 0) {
      toast.error('신고할 질문 또는 답변을 선택해주세요')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          interview_qas_id: interviewQasId,
          selectedQuestions: Array.from(selectedQuestions),
          selectedAnswers: Array.from(selectedAnswers),
          description: description.trim()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '신고 접수에 실패했습니다')
      }

      toast.success('신고가 접수되었습니다')
      setDescription('')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Report submission error:', error)
      toast.error(error instanceof Error ? error.message : '신고 접수에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Parse selected items to show in the modal
  const parseSelectedItems = () => {
    const items: Array<{ type: 'question' | 'answer', category: string, index: number, text: string }> = []

    // Parse questions
    selectedQuestions.forEach(itemId => {
      const match = itemId.match(/^(.+)_q_(\d+)$/)
      if (match) {
        const category = match[1]
        const index = parseInt(match[2])
        const text = questionData?.[category]?.[index]
        if (text) {
          items.push({ type: 'question', category, index, text })
        }
      }
    })

    // Parse answers
    selectedAnswers.forEach(itemId => {
      const match = itemId.match(/^(.+)_a_(\d+)$/)
      if (match) {
        const category = match[1]
        const index = parseInt(match[2])
        const text = answerData?.[category]?.[index]
        if (text) {
          items.push({ type: 'answer', category, index, text })
        }
      }
    })

    // Group by category
    const groupedItems: Record<string, Array<{ type: 'question' | 'answer', index: number, text: string }>> = {}
    items.forEach(item => {
      if (!groupedItems[item.category]) {
        groupedItems[item.category] = []
      }
      groupedItems[item.category].push({ type: item.type, index: item.index, text: item.text })
    })

    return groupedItems
  }

  const groupedItems = parseSelectedItems()
  const totalItems = selectedQuestions.size + selectedAnswers.size

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>문제 신고</DialogTitle>
          <DialogDescription>
            선택한 질문 또는 답변에 문제가 있다면 신고해주세요. 검토 후 유효한 경우 토큰을 환불해드립니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected items summary */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              총 <span className="font-semibold">{totalItems}개</span> 항목 선택됨
              ({selectedQuestions.size}개 질문, {selectedAnswers.size}개 답변)
            </p>
          </div>

          {/* Show selected items grouped by category */}
          {Object.keys(groupedItems).length > 0 && (
            <div className="space-y-3">
              <Label>선택된 항목</Label>
              <div className="border rounded-md p-3 space-y-3 max-h-48 overflow-y-auto">
                {Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700">
                      {CATEGORY_LABELS[category] || category}
                    </h4>
                    {items.map((item, idx) => (
                      <div key={idx} className="text-xs text-gray-600 pl-3 border-l-2 border-gray-200">
                        <span className="font-medium">
                          {item.type === 'question' ? 'Q' : 'A'}{item.index + 1}:
                        </span>{' '}
                        <span className="line-clamp-2">{item.text}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description textarea */}
          <div className="space-y-2">
            <Label htmlFor="description">문제 설명 *</Label>
            <Textarea
              id="description"
              placeholder="어떤 문제가 있는지 자세히 설명해주세요. (예: 질문이 직무와 관련없음, 답변이 부적절함, 중복된 질문 등)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              문제를 자세히 설명해주시면 빠른 검토와 환불에 도움이 됩니다.
            </p>
          </div>

          {/* Info alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              신고 검토 후 유효한 경우, 질문당 0.1 토큰, 답변당 0.2 토큰이 환불됩니다.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !description.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                접수 중...
              </>
            ) : (
              '신고 접수'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
