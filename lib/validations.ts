import { z } from 'zod'
import { SIGNUP_PLATFORMS } from '@/lib/constants/signup'

export const signinSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식을 입력해주세요'),
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요')
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
})

export const signupSchema = z.object({
  name: z
    .string()
    .min(1, '이름을 입력해주세요')
    .min(2, '이름은 최소 2자 이상이어야 합니다')
    .max(50, '이름은 최대 50자까지 입력 가능합니다'),
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식을 입력해주세요'),
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요')
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .regex(/[A-Z]/, '비밀번호는 대문자를 하나 이상 포함해야 합니다')
    .regex(/[a-z]/, '비밀번호는 소문자를 하나 이상 포함해야 합니다')
    .regex(/\d/, '비밀번호는 숫자를 하나 이상 포함해야 합니다')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, '비밀번호는 특수문자를 하나 이상 포함해야 합니다'),
  confirmPassword: z
    .string()
    .min(1, '비밀번호 확인을 입력해주세요'),
  referralCode: z
    .string()
    .optional(),
  signupPlatform: z
    .enum(Object.keys(SIGNUP_PLATFORMS) as [string, ...string[]], {
      message: '어디서 알게 되셨는지 선택해주세요',
    })
    .refine(val => val in SIGNUP_PLATFORMS, '어디서 알게 되셨는지 선택해주세요'),
  signupPlatformDetail: z
    .string()
    .optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
}).refine((data) => {
  // If platform is "other", detail is required
  if (data.signupPlatform === 'other' && (!data.signupPlatformDetail || data.signupPlatformDetail.trim() === '')) {
    return false
  }
  return true
}, {
  message: '기타를 선택하셨다면 구체적인 내용을 입력해주세요',
  path: ['signupPlatformDetail']
})

export type SigninFormData = z.infer<typeof signinSchema>
export type SignupFormData = z.infer<typeof signupSchema> 