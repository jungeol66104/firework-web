import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/clients/server'
import { addTokens } from '@/lib/supabase/services/tokenService'

export async function POST(request: NextRequest) {
  try {
    const { paymentKey, orderId, amount } = await request.json()
    
    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the payment record
    const { data: paymentRecord, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (findError || !paymentRecord) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    // Verify amount matches
    if (paymentRecord.amount !== amount) {
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }

    // Confirm payment with Toss Payments
    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount
      })
    })

    const tossData = await tossResponse.json()

    if (!tossResponse.ok) {
      console.error('Toss payment confirmation failed:', tossData)
      
      // Update payment status to failed
      await supabase
        .from('payments')
        .update({ 
          status: 'failed',
          payment_key: paymentKey
        })
        .eq('order_id', orderId)

      return NextResponse.json({ 
        error: 'Payment confirmation failed', 
        details: tossData 
      }, { status: 400 })
    }

    // Payment successful - add tokens to user
    await addTokens(supabase, user.id, paymentRecord.tokens)

    // Update payment record
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        payment_key: paymentKey,
        payment_method: tossData.method,
        completed_at: new Date().toISOString()
      })
      .eq('order_id', orderId)

    return NextResponse.json({
      success: true,
      tokens: paymentRecord.tokens,
      payment: tossData
    })

  } catch (error) {
    console.error('Payment confirmation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}