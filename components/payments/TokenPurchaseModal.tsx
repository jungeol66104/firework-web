'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Hexagon } from 'lucide-react'
import { usePaymentPopup } from '@/hooks/usePaymentPopup'

interface TokenPurchaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

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
  },
  {
    id: 'bundle_20',
    tokens: 20, 
    price: 150000,
    name: '20토큰 팩',
    discount: 17
  },
  {
    id: 'bundle_50',
    tokens: 50, 
    price: 360000,
    name: '50토큰 팩',
    discount: 20
  },
  {
    id: 'bundle_100',
    tokens: 100, 
    price: 702000,
    name: '100토큰 팩',
    discount: 22
  }
]

export default function TokenPurchaseModal({ open, onOpenChange, onSuccess }: TokenPurchaseModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string>('bundle_5')
  const { openPaymentPopup } = usePaymentPopup()

  const handlePurchase = () => {
    const cleanup = openPaymentPopup({
      packageId: selectedPackage,
      width: 500,
      onClose: () => {
        onOpenChange(false)
        if (onSuccess) {
          onSuccess()
        }
      }
    })
    
    // Store cleanup function for potential manual cleanup
    if (cleanup && typeof cleanup === 'function') {
      const originalOnOpenChange = onOpenChange
      onOpenChange = (open) => {
        if (!open && typeof cleanup === 'function') {
          cleanup()
        }
        originalOnOpenChange(open)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="relative">
              <Hexagon className="w-6 h-6 text-blue-600" />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-600">
                J
              </span>
            </div>
            토큰 충전
          </DialogTitle>
          <DialogDescription>
            토큰을 구매하여 AI 질문 생성과 답변 생성을 이용하세요.
          </DialogDescription>
        </DialogHeader>

        <div>
          {TOKEN_PACKAGES.map((pkg) => (
            <div 
              key={pkg.id}
              className="flex items-center justify-between py-2 px-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50"
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
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          결제하기
        </Button>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-blue-700 text-sm">
            질문지 생성(30문항)에는 3 토큰이, 답변지 생성(30문항)에는 6 토큰이 필요합니다.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}