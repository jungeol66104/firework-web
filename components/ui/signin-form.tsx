"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

export function SigninForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    router.push("/")
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>계정에 로그인</CardTitle>
          <CardDescription>
            아래에 이메일을 입력하여 계정에 로그인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  defaultValue="test@test.com"
                  disabled
                  required
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">비밀번호</Label>
                  {/* <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    비밀번호를 잊으셨나요?
                  </a> */}
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  defaultValue="test123"
                  disabled
                  required 
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full">
                  로그인
                </Button>
                {/* <Button variant="outline" className="w-full">
                  Google로 로그인
                </Button> */}
              </div>
            </div>
            {/* <div className="mt-4 text-center text-sm">
              계정이 없으신가요?{" "}
              <a href="#" className="underline underline-offset-4">
                회원가입
              </a>
            </div> */}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
