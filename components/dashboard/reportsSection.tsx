"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, Loader } from "lucide-react"
import { Report } from "@/lib/types"

const STATUS_LABELS: Record<Report['status'], string> = {
  pending: '검토 대기 중',
  in_review: '검토 중',
  resolved: '해결됨',
  rejected: '반려됨'
}

const STATUS_VARIANTS: Record<Report['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  in_review: 'default',
  resolved: 'outline',
  rejected: 'destructive'
}

const CATEGORY_LABELS: Record<string, string> = {
  general_personality: '일반 인성면접',
  cover_letter_personality: '자소서 기반 인성면접',
  cover_letter_competency: '자소서 기반 역량면접'
}

interface QAData {
  questions_data: any
  answers_data: any
}

export default function ReportsSection() {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set())
  const [qaDataCache, setQaDataCache] = useState<Record<string, QAData>>({})

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/reports')

      if (!response.ok) {
        throw new Error('Failed to fetch reports')
      }

      const data = await response.json()
      setReports(data)
    } catch (error) {
      console.error('Error fetching reports:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch reports')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchQAData = async (interviewId: string, interviewQasId: string) => {
    if (qaDataCache[interviewQasId]) {
      return qaDataCache[interviewQasId]
    }

    try {
      const response = await fetch(`/api/interviews/${interviewId}/qas/${interviewQasId}`)
      if (!response.ok) throw new Error('Failed to fetch Q&A data')

      const data = await response.json()
      // API returns { qa: { questions_data, answers_data, ... } }
      const qaData: QAData = {
        questions_data: data.qa.questions_data,
        answers_data: data.qa.answers_data
      }

      setQaDataCache(prev => ({ ...prev, [interviewQasId]: qaData }))
      return qaData
    } catch (error) {
      console.error('Error fetching Q&A data:', error)
      return null
    }
  }

  const toggleExpand = async (reportId: string, interviewId: string, interviewQasId: string) => {
    const newExpanded = new Set(expandedReports)

    if (newExpanded.has(reportId)) {
      newExpanded.delete(reportId)
    } else {
      newExpanded.add(reportId)
      // Fetch Q&A data when expanding
      await fetchQAData(interviewId, interviewQasId)
    }

    setExpandedReports(newExpanded)
  }

  const renderReportedItems = (report: Report) => {
    const qaData = qaDataCache[report.interview_qas_id]
    if (!qaData) return null

    // Group items by category
    const groupedItems: Record<string, Array<{ type: 'question' | 'answer', index: number, text: string, refunded: boolean, refundAmount?: number }>> = {}

    report.items.questions.forEach(q => {
      const category = q.category
      const text = qaData.questions_data?.[category]?.[q.index]
      if (text) {
        if (!groupedItems[category]) groupedItems[category] = []
        groupedItems[category].push({
          type: 'question',
          index: q.index,
          text,
          refunded: q.refunded || false,
          refundAmount: q.refund_amount
        })
      }
    })

    report.items.answers.forEach(a => {
      const category = a.category
      const text = qaData.answers_data?.[category]?.[a.index]
      if (text) {
        if (!groupedItems[category]) groupedItems[category] = []
        groupedItems[category].push({
          type: 'answer',
          index: a.index,
          text,
          refunded: a.refunded || false,
          refundAmount: a.refund_amount
        })
      }
    })

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">이의신청된 항목</h4>
        <div className="border rounded-md p-3 space-y-3 max-h-64 overflow-y-auto">
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
                  {item.refunded && (
                    <span className="ml-2 text-blue-600 font-medium">
                      ({item.refundAmount?.toFixed(1)}토큰 환불됨)
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Hide the entire section by default - only show when there are actual reports
  if (isLoading || error || reports.length === 0) {
    return null
  }

  return (
    <div id="reports" className="w-full max-w-4xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">이의신청 내역</h1>
      </div>

      {(
        <div className="space-y-3">
          {reports.map((report) => {
            const questionCount = report.items.questions.length
            const answerCount = report.items.answers.length
            const totalRefunded = [
              ...report.items.questions.filter(q => q.refunded),
              ...report.items.answers.filter(a => a.refunded)
            ].reduce((sum, item) => sum + (item.refund_amount || 0), 0)
            const isExpanded = expandedReports.has(report.id)

            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow overflow-hidden py-0 gap-0">
                {/* Collapsed: Single row with minimal info */}
                <div
                  className="flex items-center gap-2.5 p-4 cursor-pointer min-h-[40px]"
                  onClick={() => toggleExpand(report.id, report.interview_id, report.interview_qas_id)}
                >
                  <Badge variant={STATUS_VARIANTS[report.status]} className="shrink-0 text-xs py-0 h-5">
                    {STATUS_LABELS[report.status]}
                  </Badge>

                  <span className="text-xs text-gray-500 shrink-0">
                    {new Date(report.created_at).toLocaleDateString('ko-KR')}
                  </span>

                  <p className="text-sm text-gray-700 flex-1 truncate">
                    {report.description}
                  </p>

                  {totalRefunded > 0 && (
                    <span className="text-xs text-blue-600 font-medium shrink-0">
                      {totalRefunded.toFixed(1)}토큰 환불
                    </span>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 shrink-0 hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpand(report.id, report.interview_id, report.interview_qas_id)
                    }}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>

                {/* Expanded: Full details */}
                {isExpanded && (
                  <CardContent className="pt-0 px-4 pb-4 border-t">
                    {/* Full description */}
                    <div className="mb-4 pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">이의신청 내용</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{report.description}</p>
                    </div>

                    {/* Summary stats */}
                    <div className="flex mb-4 text-sm gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">이의신청 질문:</span>
                        <span className="font-medium text-gray-900">{questionCount}개</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">이의신청 답변:</span>
                        <span className="font-medium text-gray-900">{answerCount}개</span>
                      </div>
                      {totalRefunded > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">환불 토큰:</span>
                          <span className="font-semibold text-blue-600">{totalRefunded.toFixed(1)}토큰</span>
                        </div>
                      )}
                    </div>

                    {/* Reported items */}
                    {renderReportedItems(report)}

                    {/* Admin response */}
                    {report.admin_response && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <p className="text-sm font-semibold text-blue-900 mb-2">관리자 답변</p>
                        <p className="text-sm text-blue-800 leading-relaxed">{report.admin_response}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
