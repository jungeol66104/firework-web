'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader } from 'lucide-react'
import { toast } from 'sonner'

function PaymentSuccessContent() {
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [tokens, setTokens] = useState(0)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const confirmPayment = async () => {
      const paymentKey = searchParams.get('paymentKey')
      const orderId = searchParams.get('orderId')
      const amount = searchParams.get('amount')

      if (!paymentKey || !orderId || !amount) {
        toast.error('결제 정보가 올바르지 않습니다.')
        router.push('/')
        return
      }

      try {
        const response = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: parseInt(amount)
          })
        })

        const result = await response.json()

        if (response.ok && result.success) {
          setSuccess(true)
          setTokens(result.tokens)
          toast.success(`${result.tokens}개의 토큰이 충전되었습니다!`)
        } else {
          throw new Error(result.error || 'Payment confirmation failed')
        }
      } catch (error) {
        console.error('Payment confirmation error:', error)
        toast.error('결제 확인 중 오류가 발생했습니다.')
        router.push('/payments/fail')
      } finally {
        setLoading(false)
      }
    }

    confirmPayment()
  }, [searchParams, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <Loader className="h-4 w-4 animate-spin" />
        <p className="text-sm text-gray-600">결제를 확인하고 있습니다...</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="text-center flex flex-col max-w-sm">
          <h2 className="text-lg font-semibold">결제가 완료되었습니다</h2>
          <p className="text-sm text-gray-600 mt-4">
            {tokens}개의 토큰이 충전되었습니다.
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

  return null
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader className="h-4 w-4 animate-spin" /></div>}>
      <PaymentSuccessContent />
    </Suspense>
  )
}