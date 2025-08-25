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

interface AdminCreateInterviewButtonProps {
  onInterviewCreated?: (interview: Interview) => void
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
}

export function AdminCreateInterviewButton({ onInterviewCreated, className, size = "default" }: AdminCreateInterviewButtonProps) {
  const [candidateName, setCandidateName] = useState("")
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
      setCandidateName("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted with candidate name:", candidateName)
    
    if (!userId) {
      alert("사용자 인증이 필요합니다. 다시 로그인해주세요.")
      return
    }
    
    if (candidateName.trim() && !isLoading) {
      setIsLoading(true)
      console.log("Starting interview creation...")
      
      try {
        const interview = await createInterviewClient({
          candidate_name: candidateName.trim(),
          user_id: userId
        })
        console.log("Created interview:", interview)
        setCandidateName("")
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
      console.log("Form validation failed - candidate name:", candidateName, "isLoading:", isLoading)
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
            새로운 면접을 생성하려면 지원자명을 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="candidate-name">지원자명</Label>
              <Input 
                id="candidate-name" 
                name="candidateName" 
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="지원자명을 입력하세요"
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
