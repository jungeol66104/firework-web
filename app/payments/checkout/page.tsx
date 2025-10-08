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
    id: 'bundle_3',
    tokens: 3,
    price: 27000,
    name: '3토큰 팩'
  },
  {
    id: 'bundle_5',
    tokens: 5,
    price: 45000,
    name: '5토큰 팩'
  },
  {
    id: 'bundle_10',
    tokens: 10,
    price: 80000,
    name: '10토큰 팩',
    discount: 11
  }
]

function PaymentCheckoutContent() {
  const [loading, setLoading] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<string>('bundle_5')
  const [customerKey, setCustomerKey] = useState<string>('anonymous')
  const [showPaymentWidget, setShowPaymentWidget] = useState(false)
  const [widgets, setWidgets] = useState<any>(null)
  const [paymentMethodWidget, setPaymentMethodWidget] = useState<any>(null)
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

  const initializeWidget = async () => {
    try {
      // Get the selected package price
      const selectedPkg = TOKEN_PACKAGES.find(pkg => pkg.id === selectedPackage)
      if (!selectedPkg) return

      const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)

      // Initialize payment widgets
      const widgets = tossPayments.widgets({
        customerKey: customerKey
      })

      // Set the payment amount
      await widgets.setAmount({
        currency: 'KRW',
        value: selectedPkg.price
      })

      setWidgets(widgets)

      // Render payment methods widget
      const paymentMethodWidget = await widgets.renderPaymentMethods({
        selector: '#payment-method',
        variantKey: 'DEFAULT'
      })

      setPaymentMethodWidget(paymentMethodWidget)

      // Render agreement widget
      await widgets.renderAgreement({
        selector: '#agreement',
        variantKey: 'AGREEMENT'
      })

    } catch (error) {
      console.error('Widget initialization error:', error)
    }
  }

  const handlePurchase = async () => {
    if (customerKey === 'anonymous') {
      toast.error('로그인이 필요합니다.')
      return
    }

    setLoading(true)

    try {
      // Show the payment widget modal first
      setShowPaymentWidget(true)

      // Initialize payment widget when modal is shown
      await initializeWidget()

    } catch (error) {
      console.error('Payment initialization error:', error)
      toast.error('결제 준비 중 오류가 발생했습니다.')
      setShowPaymentWidget(false) // Hide modal on error
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!widgets || !paymentMethodWidget) {
      toast.error('결제 준비 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

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

      // Step 2: Request payment with widgets
      await widgets.requestPayment({
        orderId: orderId,
        orderName: name,
        customerName: '고객',
        customerEmail: 'customer@example.com',
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
    <div className="h-screen sm:min-h-screen bg-white flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-md h-full sm:max-h-[800px] flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <div className="relative">
            <Hexagon className="w-6 h-6 text-blue-600" />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-600">
              J
            </span>
          </div>
          <h1 className="text-lg font-semibold">토큰 충전</h1>
        </div>
        
        <p className="text-sm text-gray-600 mb-4 sm:mb-6">
          토큰을 구매하여 AI 질문 생성과 답변 생성을 이용하세요.
        </p>

        <div className="space-y-0 mb-4 sm:mb-6 border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
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
          className="w-full bg-blue-600 hover:bg-blue-700 mb-3 sm:mb-4 flex-shrink-0"
        >
          {loading ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              결제 준비 중...
            </>
          ) : (
            '결제하기'
          )}
        </Button>

        {/* Payment Widget Modal */}
        {showPaymentWidget && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg border border-gray-300 w-full max-w-lg max-h-[95vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">결제 수단 선택</h2>
                <button
                  onClick={() => setShowPaymentWidget(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-4">
                {/* Selected Package Info */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">선택한 상품</span>
                    <span className="font-medium">
                      {TOKEN_PACKAGES.find(pkg => pkg.id === selectedPackage)?.tokens} 토큰
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-600">결제 금액</span>
                    <span className="font-semibold text-blue-600">
                      {TOKEN_PACKAGES.find(pkg => pkg.id === selectedPackage)?.price.toLocaleString()} 원
                    </span>
                  </div>
                </div>

                {/* Payment Methods Widget */}
                {!widgets ? (
                  <div className="mb-4 p-8 text-center">
                    <Loader className="mx-auto h-4 w-4 animate-spin text-blue-600 mb-2" />
                    <p className="text-sm text-gray-600">결제 수단을 불러오는 중...</p>
                  </div>
                ) : (
                  <div id="payment-method" className="mb-4"></div>
                )}

                {/* Agreement Widget */}
                <div id="agreement" className="mb-4"></div>

                {/* Payment Button */}
                <Button
                  onClick={handleConfirmPayment}
                  disabled={loading || !widgets}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      결제 중...
                    </>
                  ) : !widgets ? (
                    '결제 준비 중...'
                  ) : (
                    '결제하기'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-md flex-shrink-0">
          <div className="text-blue-700 text-sm">
            질문지 생성(30문항)에는 3 토큰이, 답변지 생성(30문항)에는 6 토큰이 필요합니다.
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