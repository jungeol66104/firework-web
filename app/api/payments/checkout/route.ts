import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'

// Token packages configuration
const TOKEN_PACKAGES = {
  bundle_3: { 
    tokens: 3, 
    price: 27000,
    name: '3토큰 팩'
  },
  bundle_5: { 
    tokens: 5, 
    price: 45000,
    name: '5토큰 팩'
  },
  bundle_10: { 
    tokens: 10, 
    price: 80000,
    name: '10토큰 팩'
  },
  bundle_20: { 
    tokens: 20, 
    price: 150000,
    name: '20토큰 팩'
  },
  bundle_50: { 
    tokens: 50, 
    price: 360000,
    name: '50토큰 팩'
  },
  bundle_100: { 
    tokens: 100, 
    price: 702000,
    name: '100토큰 팩'
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