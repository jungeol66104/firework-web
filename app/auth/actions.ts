'use server'

import { createAdminClient } from '@/lib/supabase/clients/admin'
import { createClient } from '@/lib/supabase/clients/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { generateUniqueReferralCode, findUserByReferralCode } from '@/lib/utils/referralCode'

export async function signin(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)
  if (error) {
    console.error('Auth signin error:', error)

    // Translate common Supabase error messages to Korean
    const errorMsg = error.message?.toLowerCase() || ''
    if (errorMsg.includes('invalid login credentials') || errorMsg.includes('invalid credentials')) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
    }
    if (errorMsg.includes('email not confirmed') || errorMsg.includes('email confirmation')) {
      throw new Error('이메일 인증이 필요합니다. 이메일을 확인해주세요.')
    }
    if (errorMsg.includes('too many requests')) {
      throw new Error('너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.')
    }

    // Don't expose raw English error messages - use generic Korean message
    throw new Error('로그인에 실패했습니다. 다시 시도해주세요.')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const referralCode = formData.get('referralCode') as string | null
  const signupPlatform = formData.get('signupPlatform') as string | null
  const signupPlatformDetail = formData.get('signupPlatformDetail') as string | null

  if (!email || !password || !name) {
    throw new Error('모든 필드를 입력해주세요.')
  }

  if (!signupPlatform) {
    throw new Error('어디서 알게 되셨는지 선택해주세요.')
  }

  // Enhanced password validation
  if (password.length < 8) {
    throw new Error('비밀번호는 최소 8자 이상이어야 합니다.')
  }

  // Check for at least one uppercase letter, one lowercase letter, one number, and one special character
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)

  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    throw new Error('비밀번호는 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.')
  }

  const data = { email, password, options: { data: { name } } }

  try {
    // Add a timeout wrapper for the signup request
    const signupPromise = supabase.auth.signUp(data)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.')), 30000)
    })
    
    const { data: authData, error: authError } = await Promise.race([signupPromise, timeoutPromise]) as any

    if (authError) {
      console.error('Auth signup error:', authError)

      // Handle specific error types with Korean messages
      if (authError.status === 504) {
        throw new Error('서버 연결 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.')
      }

      if (authError.status === 422) {
        throw new Error('이미 사용 중인 이메일입니다.')
      }

      // Check for common Supabase error messages and translate
      const errorMsg = authError.message?.toLowerCase() || ''
      if (errorMsg.includes('user already registered') || errorMsg.includes('already registered')) {
        throw new Error('이미 가입된 이메일입니다.')
      }
      if (errorMsg.includes('email not confirmed') || errorMsg.includes('email confirmation')) {
        throw new Error('이메일 인증이 필요합니다. 이메일을 확인해주세요.')
      }
      if (errorMsg.includes('invalid email')) {
        throw new Error('올바른 이메일 형식이 아닙니다.')
      }

      // Don't expose raw English error messages - use generic Korean message
      throw new Error('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.')
    }

    if (!authData.user) {
      console.error('No user data returned from signup')
      throw new Error('회원가입에 실패했습니다. 다시 시도해주세요.')
    }

    // Generate unique referral code for the new user
    let newUserReferralCode: string
    try {
      newUserReferralCode = await generateUniqueReferralCode(supabase)
    } catch (error) {
      console.error('Failed to generate referral code:', error)
      throw new Error('회원가입 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
    }

    // Find referrer if referral code was provided
    let referrerId: string | null = null
    if (referralCode) {
      referrerId = await findUserByReferralCode(supabase, referralCode)
      if (!referrerId) {
        console.warn('Invalid referral code provided:', referralCode)
        // Don't fail signup, just log the invalid code
      }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        name: name,
        referral_code: newUserReferralCode,
        referred_by: referrerId,
        signup_platform: signupPlatform,
        signup_platform_detail: signupPlatform === 'other' ? signupPlatformDetail : null
      }])

    if (profileError) {
      console.error('Profile creation failed:', profileError)

      // Use admin client to delete auth user if profile creation fails
      const adminClient = createAdminClient()
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(authData.user.id)

      if (deleteError) console.error('Failed to delete auth user after profile failure:', deleteError)
      throw new Error('프로필 생성에 실패했습니다. 다시 시도해주세요.')
    }

  } catch (error) {
    console.error('Unexpected error during signup:', error)
    throw error
  }

  revalidatePath('/', 'layout')
  redirect('/auth/verify')
}

export async function signout() {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message || '로그아웃에 실패했습니다.')
  }

  revalidatePath('/', 'layout')
  redirect('/auth/signin')
}

export async function deleteUserAccount() {
  try {
    // First, get the current user using the regular server client
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('User not authenticated')
    }

    // Use admin client for admin operations
    const adminClient = createAdminClient()

    // Get all user's interview IDs first
    const { data: userInterviews } = await adminClient
      .from('interviews')
      .select('id')
      .eq('user_id', user.id)

    const interviewIds = userInterviews?.map(i => i.id) || []

    // Delete in proper order to avoid foreign key violations

    // 1. Delete notifications
    await adminClient
      .from('notifications')
      .delete()
      .eq('user_id', user.id)

    // 2. Delete reports (references interviews)
    if (interviewIds.length > 0) {
      await adminClient
        .from('reports')
        .delete()
        .in('interview_id', interviewIds)
    }

    // 3. Delete interview_qa_jobs (references interviews)
    if (interviewIds.length > 0) {
      await adminClient
        .from('interview_qa_jobs')
        .delete()
        .in('interview_id', interviewIds)
    }

    // 4. Delete generation_jobs if it exists (old table name)
    if (interviewIds.length > 0) {
      try {
        await adminClient
          .from('generation_jobs')
          .delete()
          .in('interview_id', interviewIds)
      } catch (error) {
        // Ignore if table doesn't exist
        console.log('generation_jobs table not found (legacy table)')
      }
    }

    // 5. Delete interview_qas (references interviews)
    if (interviewIds.length > 0) {
      await adminClient
        .from('interview_qas')
        .delete()
        .in('interview_id', interviewIds)
    }

    // 6. Now delete all user's interviews
    const { error: interviewsError } = await adminClient
      .from('interviews')
      .delete()
      .eq('user_id', user.id)

    if (interviewsError) {
      throw new Error(`Failed to delete user interviews: ${interviewsError.message}`)
    }

    // 7. Delete payments
    await adminClient
      .from('payments')
      .delete()
      .eq('user_id', user.id)

    // 8. Delete the user's profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (profileError) {
      throw new Error(`Failed to delete user profile: ${profileError.message}`)
    }

    // 9. Delete the user account from auth (requires admin privileges)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)

    if (deleteError) {
      throw new Error(`Failed to delete user account: ${deleteError.message}`)
    }

    revalidatePath('/dashboard')
    return { success: true, message: 'Account deleted successfully' }
  } catch (error) {
    console.error('Account deletion error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete account'
    }
  }
}