import { createClient } from '@/lib/supabase/clients/client'
import { getCurrentUserProfileClient } from '@/lib/supabase/services/clientServices'

// Client-side admin check
export async function isAdmin(): Promise<boolean> {
  try {
    const profile = await getCurrentUserProfileClient()
    return profile?.is_admin === true
  } catch {
    return false
  }
}

// Require admin access (throws if not admin)
export async function requireAdmin(): Promise<void> {
  if (!await isAdmin()) {
    throw new Error('Admin access required')
  }
}

// Get current admin user info
export async function getCurrentAdminUser() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  const profile = await getCurrentUserProfileClient()

  if (!profile?.is_admin) {
    throw new Error('Admin access required')
  }

  return { user, profile }
}