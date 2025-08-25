import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'

// Token packages configuration
const TOKEN_PACKAGES = {
  starter: { 
    tokens: 1, 
    price: 1000,
    name: 'Starter Pack'
  },
  standard: { 
    tokens: 5, 
    price: 4000,
    name: 'Standard Pack'
  },
  premium: { 
    tokens: 10, 
    price: 7000,
    name: 'Premium Pack'
  }
} as const

type PackageId = keyof typeof TOKEN_PACKAGES

export async function POST(request: NextRequest) {
  try {
    const { packageId } = await request.json() as { packageId: string }
    
    // Validate package
    if (!TOKEN_PACKAGES[packageId as PackageId]) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
    }
    
    const selectedPackage = TOKEN_PACKAGES[packageId as PackageId]
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Generate unique order ID
    const orderId = `order_${user.id.slice(0, 8)}_${Date.now()}`
    
    // Create payment record
    const { error: dbError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        order_id: orderId,
        amount: selectedPackage.price,
        tokens: selectedPackage.tokens,
        status: 'pending'
      })
    
    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
    }
    
    // Return payment details
    return NextResponse.json({
      orderId,
      amount: selectedPackage.price,
      tokens: selectedPackage.tokens,
      name: selectedPackage.name
    })
    
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}