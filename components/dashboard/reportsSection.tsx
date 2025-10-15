"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"
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

export default function ReportsSection() {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div id="reports" className="w-full max-w-4xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">신고 내역</h1>
      </div>

      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          신고한 질문/답변은 관리자가 검토 후 유효한 경우 토큰을 환불해드립니다. (질문당 0.1 토큰, 답변당 0.2 토큰)
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">신고 내역을 불러오는 중...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-red-500">{error}</p>
          </CardContent>
        </Card>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">신고 내역이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const questionCount = report.items.questions.length
            const answerCount = report.items.answers.length
            const totalRefunded = [
              ...report.items.questions.filter(q => q.refunded),
              ...report.items.answers.filter(a => a.refunded)
            ].reduce((sum, item) => sum + (item.refund_amount || 0), 0)

            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={STATUS_VARIANTS[report.status]}>
                          {STATUS_LABELS[report.status]}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(report.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{report.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex gap-4 text-gray-600">
                      <span>질문 {questionCount}개</span>
                      <span>답변 {answerCount}개</span>
                    </div>
                    {totalRefunded > 0 && (
                      <span className="text-green-600 font-medium">
                        {totalRefunded.toFixed(1)} 토큰 환불됨
                      </span>
                    )}
                  </div>
                  {report.admin_response && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                      <p className="font-medium text-blue-900 mb-1">관리자 답변:</p>
                      <p className="text-blue-700">{report.admin_response}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
