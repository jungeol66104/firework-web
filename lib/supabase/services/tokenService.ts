import { SupabaseClient } from '@supabase/supabase-js'

export async function getUserTokens(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('tokens')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching user tokens:', error)
    return 0
  }
  
  return data?.tokens || 0
}

export async function spendTokens(supabase: SupabaseClient, userId: string, amount: number): Promise<boolean> {
  const tokens = await getUserTokens(supabase, userId)
  if (tokens < amount) {
    console.log(`Insufficient tokens. Required: ${amount}, Available: ${tokens}`)
    return false
  }

  // Calculate precise token balance (supports decimals)
  const newTokenBalance = tokens - amount

  const { error } = await supabase
    .from('profiles')
    .update({ tokens: newTokenBalance })
    .eq('id', userId)

  if (error) {
    console.error('Error spending tokens:', error)
    return false
  }

  console.log(`Successfully spent ${amount} tokens. Remaining: ${newTokenBalance}`)
  return true
}

export async function addTokens(supabase: SupabaseClient, userId: string, amount: number): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('profiles')
    .select('tokens')
    .eq('id', userId)
    .single()
    
  if (fetchError) {
    console.error('Error fetching current tokens for addition:', fetchError)
    return
  }
  
  const currentTokens = data?.tokens || 0
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ tokens: currentTokens + amount })
    .eq('id', userId)
    
  if (updateError) {
    console.error('Error adding tokens:', updateError)
    return
  }
  
  console.log(`Successfully added ${amount} tokens. New balance: ${currentTokens + amount}`)
}