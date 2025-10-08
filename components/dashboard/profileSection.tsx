"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader, LogOut, Hexagon } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateCurrentUserProfileClient } from "@/lib/supabase/services/clientServices"
import { deleteUserAccount, signout } from "@/app/auth/actions"
import { usePaymentPopup } from "@/hooks/usePaymentPopup"
import { useStore } from "@/lib/zustand"
import { useTokens, useRefreshTokens } from "@/lib/zustand"

interface ProfileSectionProps {
  userName: string
  userEmail?: string
  tokens: number
}

export default function ProfileSection({ userName, userEmail, tokens: initialTokens }: ProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(userName)
  const [email, setEmail] = useState(userEmail || "")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const { openPaymentPopup } = usePaymentPopup()
  const reset = useStore((state) => state.reset)
  
  // Use global token state instead of props
  const currentTokens = useTokens()
  const refreshTokens = useRefreshTokens()
  
  // Use current tokens from store, fall back to initialTokens if not loaded yet
  const displayTokens = currentTokens !== null ? currentTokens : initialTokens

  // Initialize token store on component mount
  useEffect(() => {
    refreshTokens()
  }, [refreshTokens])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("이름을 입력해주세요")
      return
    }

    setIsLoading(true)
    try {
      const updatedProfile = await updateCurrentUserProfileClient({ name: name.trim() })
      
      toast.success("프로필이 성공적으로 업데이트되었습니다")
      setIsEditing(false)
      // Refresh the page to show updated data
      router.refresh()
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error(error instanceof Error ? error.message : '프로필 업데이트에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setName(userName)
    setEmail(userEmail || "")
    setIsEditing(false)
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteUserAccount()
      
      if (result.success) {
        // Clear the Zustand store
        reset()
        
        // Clear localStorage store manually as well
        localStorage.removeItem('interview-store')
        
        toast.success("계정이 성공적으로 삭제되었습니다")
        // Redirect to signin page
        router.push('/auth/signin')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Account deletion error:', error)
      toast.error(error instanceof Error ? error.message : '계정 삭제에 실패했습니다')
      setShowDeleteDialog(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      // Clear the Zustand store first
      reset()
      
      // Clear localStorage store manually as well
      localStorage.removeItem('interview-store')
      
      await signout()
      // The server action will handle the redirect, but we show a toast just in case
      toast.success("로그아웃되었습니다")
    } catch (error) {
      console.error('Logout error:', error)
      toast.error(error instanceof Error ? error.message : '로그아웃에 실패했습니다')
      setIsLoggingOut(false)
    }
  }

  return (
    <div id="profile" className="w-full max-w-4xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">프로필</h1>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            수정
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isLoading}>
              취소
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </div>
        )}
      </div>
      <Card>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            {isEditing ? (
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                disabled={isLoading}
              />
            ) : (
              <div className="text-foreground dark:bg-input/30 flex items-center h-9 w-full min-w-0 rounded-md bg-transparent py-1 text-base transition-[color,box-shadow] outline-none md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50">
                <span className="text-sm text-gray-600">{name}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <div className="text-foreground dark:bg-input/30 flex items-center h-9 w-full min-w-0 rounded-md bg-transparent py-1 text-base transition-[color,box-shadow] outline-none md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50">
              <span className="text-sm text-gray-600">{email || "이메일이 설정되지 않았습니다"}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tokens">남은 토큰</Label>
            <div className="text-foreground dark:bg-input/30 flex items-center justify-between h-9 w-full min-w-0 rounded-md bg-transparent py-1 text-base transition-[color,box-shadow] outline-none md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Hexagon className="w-6 h-6 text-blue-600" />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-600">
                    J
                  </span>
                </div>
                <span className="text-sm text-gray-600">{displayTokens.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              </div>
              <Button 
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
                onClick={() => {
                  openPaymentPopup({
                    onClose: async () => {
                      // Refresh tokens from store for real-time update
                      await refreshTokens()
                      // Also refresh router for other server-side data
                      router.refresh()
                    }
                  })
                }}
              >
                충전하기
              </Button>
            </div>
          </div>
          {isEditing && (
            <div className="space-y-2">
              <Label>계정 삭제</Label>
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>계정을 삭제하시겠습니까?</AlertTitle>
                <AlertDescription>
                  <p>계정과 모든 데이터를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.</p>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="w-full mt-3"
                    disabled={isLoading}
                  >
                    계정 삭제
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="mt-4 flex justify-end">
        <Button 
          variant="outline" 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-2"
        >
          {isLoggingOut ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              로그아웃 중...
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              로그아웃
            </>
          )}
        </Button>
      </div>
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>계정 삭제</DialogTitle>
            <DialogDescription>
              계정과 모든 데이터를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다 — 신중하게 진행해 주세요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end items-center">
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                '계정 삭제'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
} 