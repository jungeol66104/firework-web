"use client"

import { Button } from "@/components/ui/button"
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { createInterviewClient } from "@/lib/supabase/services/clientServices"
import { Interview } from "@/lib/types"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/clients/client"

interface CreateInterviewButtonProps {
  onInterviewCreated?: (interview: Interview) => void
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
}

export function CreateInterviewButton({ onInterviewCreated, className, size = "default" }: CreateInterviewButtonProps) {
  const [companyName, setCompanyName] = useState("")
  const [position, setPosition] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    getCurrentUser()
  }, [])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setCompanyName("")
      setPosition("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted with company name:", companyName, "position:", position)
    
    if (!userId) {
      alert("사용자 인증이 필요합니다. 다시 로그인해주세요.")
      return
    }
    
    if (companyName.trim() && position.trim() && !isLoading) {
      setIsLoading(true)
      console.log("Starting interview creation...")
      
      try {
        const interview = await createInterviewClient({
          company_name: companyName.trim(),
          position: position.trim(),
          user_id: userId
        })
        console.log("Created interview:", interview)
        setCompanyName("")
        setPosition("")
        handleOpenChange(false)
        // Call the callback to update parent state
        onInterviewCreated?.(interview)
      } catch (error) {
        console.error("Failed to create interview:", error)
        alert("면접 생성에 실패했습니다. 다시 시도해주세요.")
      } finally {
        setIsLoading(false)
      }
    } else {
      console.log("Form validation failed - company name:", companyName, "position:", position, "isLoading:", isLoading)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
          <Button variant="outline" size={size} className={cn("", className)}>새 면접 생성</Button>
        </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>새 면접 생성</DialogTitle>
          <DialogDescription>
            새로운 면접을 생성하려면 회사명과 직무를 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="company-name">회사명</Label>
              <Input 
                id="company-name" 
                name="companyName" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="회사명을 입력하세요"
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="position">직무</Label>
              <Input 
                id="position" 
                name="position" 
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="직무를 입력하세요"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isLoading}>취소</Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "생성 중..." : "생성"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 