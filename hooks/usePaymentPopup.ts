import { useCallback } from 'react'

interface PaymentPopupOptions {
  packageId?: string
  onClose?: () => void
  width?: number
  height?: number
}

export const usePaymentPopup = () => {
  const openPaymentPopup = useCallback(({
    packageId,
    onClose,
    width = 700,
    height = 700
  }: PaymentPopupOptions = {}) => {
    // Calculate center position
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2
    
    // Build URL
    const url = packageId 
      ? `/payments/checkout?packageId=${packageId}`
      : '/payments/checkout'
    
    // Open centered popup
    const paymentWindow = window.open(
      url,
      'payment',
      `width=${width},height=${height},left=${left},top=${top},resizable=no,scrollbars=no`
    )
    
    if (!paymentWindow) {
      alert('팝업이 차단되었습니다. 팝업을 허용하고 다시 시도해주세요.')
      return null
    }
    
    // Monitor window closure if callback provided
    if (onClose) {
      const checkInterval = setInterval(() => {
        if (paymentWindow.closed) {
          clearInterval(checkInterval)
          onClose()
        }
      }, 1000)
      
      // Return cleanup function
      return () => {
        clearInterval(checkInterval)
        if (!paymentWindow.closed) {
          paymentWindow.close()
        }
      }
    }
    
    return paymentWindow
  }, [])
  
  return { openPaymentPopup }
}