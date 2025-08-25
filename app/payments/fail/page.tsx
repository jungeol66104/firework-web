'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader } from 'lucide-react'

function PaymentFailContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="text-center flex flex-col max-w-sm">
        <h2 className="text-lg font-semibold">결제에 실패했습니다</h2>
        <p className="text-sm text-gray-600 mt-4">
          {message ? decodeURIComponent(message) : '결제가 취소되거나 실패했습니다.'}
        </p>
        <Button 
          onClick={() => window.close()} 
          className="w-full mt-6"
        >
          확인
        </Button>
      </div>
    </div>
  )
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader className="h-4 w-4 animate-spin" /></div>}>
      <PaymentFailContent />
    </Suspense>
  )
}