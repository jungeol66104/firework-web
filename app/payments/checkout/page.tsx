'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/clients/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader, Hexagon } from 'lucide-react'
import { toast } from 'sonner'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'

interface Package {
  id: string
  tokens: number
  price: number
  name: string
  discount?: number
}

const TOKEN_PACKAGES: Package[] = [
  {
    id: 'starter',
    tokens: 1,
    price: 1000,
    name: 'Starter Pack'
  },
  {
    id: 'standard', 
    tokens: 5,
    price: 4000,
    name: 'Standard Pack',
    discount: 20
  },
  {
    id: 'premium',
    tokens: 10, 
    price: 7000,
    name: 'Premium Pack',
    discount: 30
  }
]

function PaymentCheckoutContent() {
  const [loading, setLoading] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<string>('standard')
  const [customerKey, setCustomerKey] = useState<string>('anonymous')
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get package from URL params if provided
    const packageId = searchParams.get('packageId')
    if (packageId && TOKEN_PACKAGES.find(pkg => pkg.id === packageId)) {
      setSelectedPackage(packageId)
    }

    // Get customer key from user
    const getCustomerKey = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCustomerKey(user.id)
      }
    }
    getCustomerKey()
  }, [searchParams])

  const handlePurchase = async () => {
    setLoading(true)

    try {
      // Step 1: Create payment session
      const checkoutResponse = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: selectedPackage })
      })

      if (!checkoutResponse.ok) {
        throw new Error('Failed to create payment session')
      }

      const { orderId, amount, tokens, name } = await checkoutResponse.json()

      // Step 2: Initialize Toss Payments
      const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)
      
      // Step 3: Create payment widget
      const paymentWidget = tossPayments.payment({ 
        customerKey: customerKey
      })
      
      // Step 4: Request payment
      await paymentWidget.requestPayment({
        method: 'CARD',
        amount: {
          currency: 'KRW',
          value: amount
        },
        orderId: orderId,
        orderName: name,
        successUrl: `${window.location.origin}/payments/success`,
        failUrl: `${window.location.origin}/payments/fail`,
      })

    } catch (error) {
      console.error('Payment error:', error)
      // Check if it's a cancellation (user closed payment window)
      if (error instanceof Error && error.message.includes('ABORTED')) {
        toast.info('결제가 취소되었습니다.')
      } else {
        toast.error('결제 처리 중 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="h-screen sm:min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm max-h-[600px] flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <div className="relative">
            <Hexagon className="w-6 h-6 text-blue-600" />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-600">
              J
            </span>
          </div>
          <h1 className="text-lg font-semibold">토큰 충전</h1>
        </div>
        
        <p className="text-sm text-gray-600 mb-6">
          토큰을 구매하여 AI 질문 생성과 답변 생성을 이용하세요.
        </p>

        <div className="space-y-0 mb-6 border border-gray-200 rounded-lg overflow-hidden">
          {TOKEN_PACKAGES.map((pkg) => (
            <div 
              key={pkg.id}
              className="flex items-center justify-between py-3 px-4 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50"
              onClick={() => setSelectedPackage(pkg.id)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="package"
                  value={pkg.id}
                  checked={selectedPackage === pkg.id}
                  onChange={() => setSelectedPackage(pkg.id)}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{pkg.tokens} 토큰</span>
                  {pkg.discount && (
                    <Badge variant="secondary" className="text-xs">
                      {pkg.discount}% 할인
                    </Badge>
                  )}
                </div>
              </div>
              
              <span className="text-sm font-semibold">{pkg.price.toLocaleString()} 원</span>
            </div>
          ))}
        </div>

        <Button
          onClick={handlePurchase}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 mb-4"
        >
          {loading ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              결제 중...
            </>
          ) : (
            '결제하기'
          )}
        </Button>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-blue-700 text-sm">
            AI 질문 생성에는 1 토큰이, AI 답변 생성에는 2 토큰이 필요합니다.
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PaymentCheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader className="h-4 w-4 animate-spin" /></div>}>
      <PaymentCheckoutContent />
    </Suspense>
  )
}