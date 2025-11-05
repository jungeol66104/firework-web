'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Auth error boundary caught:', error)
  }, [error])

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <CardTitle>인증 오류</CardTitle>
            </div>
            <CardDescription>
              로그인 또는 회원가입 중 문제가 발생했습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              계정 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={reset} className="w-full">
                다시 시도
              </Button>
              <Button
                variant="outline"
                asChild
                className="w-full"
              >
                <Link href="/">홈으로 돌아가기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
