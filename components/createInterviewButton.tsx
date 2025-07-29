"use client"

import { Button } from "@/components/ui/button"
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { createInterviewClient } from "@/lib/supabase/services/clientServices"
import { useRouter } from "next/navigation"

export function CreateInterviewButton() {
  const [candidateName, setCandidateName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setCandidateName("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted with candidate name:", candidateName)
    
    if (candidateName.trim() && !isLoading) {
      setIsLoading(true)
      console.log("Starting interview creation...")
      
      try {
        const interview = await createInterviewClient({
          candidate_name: candidateName.trim()
        })
        console.log("Created interview:", interview)
        setCandidateName("")
        handleOpenChange(false)
        // Refresh the page to show the new interview
        router.refresh()
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
          <Button variant="outline">새 면접 생성</Button>
        </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>새 면접 생성</DialogTitle>
          <DialogDescription>
            새로운 면접을 생성하려면 지원자 이름을 입력하세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="candidate-name">지원자 이름</Label>
              <Input 
                id="candidate-name" 
                name="candidateName" 
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="지원자 이름을 입력하세요"
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
