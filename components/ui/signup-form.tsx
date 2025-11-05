"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import Link from "next/link"
import { signup } from "@/app/auth/actions"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signupSchema, type SignupFormData } from "@/lib/validations"
import { SIGNUP_PLATFORM_OPTIONS } from "@/lib/constants/signup"
import { Eye, EyeOff } from "lucide-react"

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Safely get ref code with proper null handling
  const refCode = searchParams?.get('ref') || undefined

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    setError: setFormError,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      referralCode: refCode,
    }
  })

  const selectedPlatform = watch('signupPlatform')

  // Pre-fill referral code from URL
  useEffect(() => {
    const refCode = searchParams?.get('ref')
    if (refCode) {
      setValue('referralCode', refCode.toUpperCase())
    }
  }, [searchParams, setValue])

  async function onSubmit(data: SignupFormData) {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('email', data.email)
      formData.append('password', data.password)
      if (data.referralCode) {
        formData.append('referralCode', data.referralCode.toUpperCase().trim())
      }
      formData.append('signupPlatform', data.signupPlatform)
      if (data.signupPlatformDetail) {
        formData.append('signupPlatformDetail', data.signupPlatformDetail.trim())
      }

      await signup(formData)
    } catch (err) {
      // Re-throw redirect errors to allow Next.js to handle them
      if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
        throw err
      }
      const errorMessage = err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.'
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
          <CardDescription>아래 정보를 입력하여 새 계정을 만드세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="name">
                  이름 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="정코치"
                  {...register('name')}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              <div className="grid gap-3">
                <Label htmlFor="email">
                  이메일 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jungcoach@example.com"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div className="grid gap-3">
                <Label htmlFor="password">
                  비밀번호 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register('password')}
                    className={cn("pr-10", errors.password ? 'border-red-500' : '')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  비밀번호는 최소 8자 이상이며, 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.
                </p>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="confirmPassword">
                  비밀번호 확인 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    {...register('confirmPassword')}
                    className={cn("pr-10", errors.confirmPassword ? 'border-red-500' : '')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
              <div className="grid gap-3">
                <Label htmlFor="signupPlatform">
                  어디서 알게 되셨나요? <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="signupPlatform"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className={errors.signupPlatform ? 'border-red-500' : ''}>
                        <SelectValue placeholder="선택해주세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {SIGNUP_PLATFORM_OPTIONS.map((option) => (
                          <SelectItem key={option.key} value={option.key}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.signupPlatform && (
                  <p className="text-sm text-red-600">{errors.signupPlatform.message}</p>
                )}
              </div>
              {selectedPlatform === 'other' && (
                <div className="grid gap-3">
                  <Label htmlFor="signupPlatformDetail">
                    구체적으로 어디서 알게 되셨나요? <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="signupPlatformDetail"
                    type="text"
                    placeholder="예: 친구 카톡, 유튜브 광고 등"
                    {...register('signupPlatformDetail')}
                    className={errors.signupPlatformDetail ? 'border-red-500' : ''}
                  />
                  {errors.signupPlatformDetail && (
                    <p className="text-sm text-red-600">{errors.signupPlatformDetail.message}</p>
                  )}
                </div>
              )}
              <div className="grid gap-3">
                <Label htmlFor="referralCode">추천인 코드 (선택사항)</Label>
                <Input
                  id="referralCode"
                  type="text"
                  placeholder="예: K7M9X2"
                  {...register('referralCode')}
                  className={cn("uppercase", errors.referralCode ? 'border-red-500' : '')}
                />
                {errors.referralCode && (
                  <p className="text-sm text-red-600">{errors.referralCode.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  추천인 코드가 있다면 입력해주세요.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "처리 중..." : "회원가입"}
                </Button>
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              이미 계정이 있으신가요?{" "}
              <Link href="/auth/signin" className="underline underline-offset-4 hover:text-primary">
                로그인
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 