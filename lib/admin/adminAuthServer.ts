import { createClient as createServerClient } from '@/lib/supabase/clients/server'
import { getCurrentUserProfileServer } from '@/lib/supabase/services/serverServices'

// Server-side admin check
export async function isAdminServer(): Promise<boolean> {
  try {
    const profile = await getCurrentUserProfileServer()
    return profile?.is_admin === true
  } catch {
    return false
  }
}

// Server-side require admin
export async function requireAdminServer(): Promise<void> {
  if (!await isAdminServer()) {
    throw new Error('Admin access required')
  }
}

// Server-side get current admin user
export async function getCurrentAdminUserServer() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  const profile = await getCurrentUserProfileServer()

  if (!profile?.is_admin) {
    throw new Error('Admin access required')
  }

  return { user, profile }
}