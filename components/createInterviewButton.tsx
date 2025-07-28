"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"

export function CreateInterviewButton() {
  const [candidateName, setCandidateName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (candidateName.trim()) {
      console.log("Create interview for candidate:", candidateName)
      // TODO: Add actual interview creation logic here
      setCandidateName("")
    }
  }

  return (
    <Dialog>
      <form onSubmit={handleSubmit}>
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
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="candidate-name">지원자 이름</Label>
              <Input 
                id="candidate-name" 
                name="candidateName" 
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="지원자 이름을 입력하세요"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button type="submit">생성</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}
