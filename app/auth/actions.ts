'use server'

import { createAdminClient } from '@/utils/supabase/clients/admin'
import { createClient } from '@/utils/supabase/clients/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function signin(formData: FormData) {
  const supabase = await createClient()

  const data = { 
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)
  if (error) {
    throw new Error(error.message || '로그인에 실패했습니다.')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string

  if (!email || !password || !name) {
    throw new Error('All fields are required')
  }

  // Enhanced password validation
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long')
  }

  // Check for at least one uppercase letter, one lowercase letter, one number, and one special character
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)

  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  }

  const data = { email, password, options: { data: { name } } }

  try {
    const { data: authData, error: authError } = await supabase.auth.signUp(data)

    if (authError) {
      console.error('Auth signup error:', authError)
      throw new Error(authError.message || 'Signup failed')
    }

    if (!authData.user) {
      console.error('No user data returned from signup')
      throw new Error('Signup failed - no user data returned')
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        name: name
      }])

    if (profileError) {
      console.error('Profile creation failed:', profileError)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(authData.user.id)
      
      if (deleteError) console.error('Failed to delete auth user after profile failure:', deleteError)
      throw new Error('Failed to create user profile')
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

    // Delete all user's interviews
    const { error: interviewsError } = await adminClient
      .from('interviews')
      .delete()
      .eq('user_id', user.id)

    if (interviewsError) {
      throw new Error(`Failed to delete user interviews: ${interviewsError.message}`)
    }

    // Delete the user's profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (profileError) {
      throw new Error(`Failed to delete user profile: ${profileError.message}`)
    }

    // Delete the user account from auth (requires admin privileges)
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