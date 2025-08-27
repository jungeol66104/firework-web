"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { usePaymentPopup } from '@/hooks/usePaymentPopup'
import { useRefreshTokens } from '@/lib/zustand'
import { cn } from '@/lib/utils'

interface TokenButtonProps {
  children: React.ReactNode
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  packageId?: string
  disabled?: boolean
  onPaymentComplete?: () => void
}

export const TokenButton: React.FC<TokenButtonProps> = ({
  children,
  variant = "default",
  size = "default", 
  className,
  packageId,
  disabled = false,
  onPaymentComplete
}) => {
  const { openPaymentPopup } = usePaymentPopup()
  const refreshTokens = useRefreshTokens()

  const handleClick = () => {
    if (disabled) return

    openPaymentPopup({
      packageId,
      onClose: async () => {
        // Refresh tokens after payment popup closes
        await refreshTokens()
        // Call additional callback if provided
        if (onPaymentComplete) {
          onPaymentComplete()
        }
      }
    })
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}