import { customAlphabet } from 'nanoid'
import { SupabaseClient } from '@supabase/supabase-js'

// Exclude confusing characters: 0, O, I, l, 1
const SAFE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const CODE_LENGTH = 6

// Generate a random referral code
const generateReferralCode = customAlphabet(SAFE_CHARS, CODE_LENGTH)

/**
 * Generate a unique referral code that doesn't exist in the database
 * @param supabase - Supabase client for database queries
 * @param maxAttempts - Maximum number of retry attempts (default: 10)
 * @returns Unique referral code
 * @throws Error if unable to generate unique code after max attempts
 */
export async function generateUniqueReferralCode(
  supabase: SupabaseClient,
  maxAttempts: number = 10
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateReferralCode()

    // Check if code already exists
    const { data, error } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('referral_code', code)
      .maybeSingle()

    // If no match found, this code is unique!
    if (!data) {
      return code
    }

    // Code exists, retry with new code
    console.log(`Referral code collision on attempt ${attempt + 1}, retrying...`)
  }

  throw new Error(`Failed to generate unique referral code after ${maxAttempts} attempts`)
}

/**
 * Find a user's profile by their referral code
 * @param supabase - Supabase client
 * @param referralCode - The referral code to look up
 * @returns Profile ID of the referrer, or null if not found
 */
export async function findUserByReferralCode(
  supabase: SupabaseClient,
  referralCode: string
): Promise<string | null> {
  if (!referralCode || referralCode.trim().length === 0) {
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', referralCode.toUpperCase().trim())
    .maybeSingle()

  if (error || !data) {
    console.error('Error finding user by referral code:', error)
    return null
  }

  return data.id
}
