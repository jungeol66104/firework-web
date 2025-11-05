/**
 * Backfill Script: Generate referral codes for existing users
 *
 * This script generates unique referral codes for all users who don't have one yet.
 *
 * Usage:
 *   npx tsx scripts/backfill-referral-codes.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { generateUniqueReferralCode } from '../lib/utils/referralCode'

// Load .env.local file
config({ path: '.env.local' })

async function main() {
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL')
    console.error('   SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Create Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🚀 Starting referral code backfill...\n')

  // Get all users without referral codes
  const { data: users, error: fetchError } = await supabase
    .from('profiles')
    .select('id, name, email')
    .is('referral_code', null)

  if (fetchError) {
    console.error('❌ Error fetching users:', fetchError)
    process.exit(1)
  }

  if (!users || users.length === 0) {
    console.log('✅ All users already have referral codes!')
    process.exit(0)
  }

  console.log(`📊 Found ${users.length} users without referral codes\n`)

  let successCount = 0
  let failCount = 0

  // Generate codes for each user
  for (const user of users) {
    try {
      // Generate unique code
      const code = await generateUniqueReferralCode(supabase)

      // Update user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ referral_code: code })
        .eq('id', user.id)

      if (updateError) {
        console.error(`❌ Failed to update user ${user.id}:`, updateError)
        failCount++
        continue
      }

      console.log(`✅ Generated code ${code} for user: ${user.name || user.email || user.id}`)
      successCount++

    } catch (error) {
      console.error(`❌ Error processing user ${user.id}:`, error)
      failCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Backfill Summary:')
  console.log(`   Total users processed: ${users.length}`)
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  console.log('='.repeat(60))

  if (failCount > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
