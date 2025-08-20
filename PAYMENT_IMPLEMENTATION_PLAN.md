# Payment Implementation Plan - Token Based System

## Overview
Lean implementation of a token-based payment system with automated payment processing using PortOne (Iamport).

## Phase 1: Database Design (Lean)

### 1.1 Database Migrations
```sql
-- Add tokens to existing profiles table
ALTER TABLE profiles ADD COLUMN tokens INTEGER DEFAULT 5;

-- Create minimal payment tracking table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Amount in KRW
  tokens INTEGER NOT NULL, -- Tokens purchased
  payment_method VARCHAR(50), -- 'toss', 'kakao', etc
  payment_key VARCHAR(255) UNIQUE, -- Payment provider's transaction ID
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Give existing users bonus tokens
UPDATE profiles SET tokens = 5 WHERE tokens IS NULL;
```

## Phase 2: Token Service Implementation

### 2.1 Create Token Service
**File:** `/utils/supabase/services/tokenService.ts`

```typescript
import { SupabaseClient } from '@supabase/supabase-js'

export async function getUserTokens(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data } = await supabase
    .from('profiles')
    .select('tokens')
    .eq('id', userId)
    .single()
  return data?.tokens || 0
}

export async function spendTokens(supabase: SupabaseClient, userId: string, amount: number): Promise<boolean> {
  const tokens = await getUserTokens(supabase, userId)
  if (tokens < amount) return false
  
  const { error } = await supabase
    .from('profiles')
    .update({ tokens: tokens - amount })
    .eq('id', userId)
  
  return !error
}

export async function addTokens(supabase: SupabaseClient, userId: string, amount: number): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('tokens')
    .eq('id', userId)
    .single()
    
  await supabase
    .from('profiles')
    .update({ tokens: (data?.tokens || 0) + amount })
    .eq('id', userId)
}
```

## Phase 3: Payment Integration with PortOne

### 3.1 Token Packages
```typescript
const TOKEN_PACKAGES = {
  'starter': { 
    tokens: 10, 
    price: 5000,
    name: 'Starter Pack'
  },
  'standard': { 
    tokens: 30, 
    price: 12000,
    name: 'Standard Pack' 
  },
  'premium': { 
    tokens: 100, 
    price: 35000,
    name: 'Premium Pack'
  }
}
```

### 3.2 Payment API Routes

#### Checkout Endpoint
**File:** `/app/api/payments/checkout/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/clients/server'

export async function POST(request: NextRequest) {
  const { packageId } = await request.json()
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const selected = TOKEN_PACKAGES[packageId]
  if (!selected) {
    return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
  }
  
  const orderId = `order_${user.id}_${Date.now()}`
  
  // Save pending payment
  const { error } = await supabase.from('payments').insert({
    user_id: user.id,
    amount: selected.price,
    tokens: selected.tokens,
    payment_key: orderId,
    status: 'pending'
  })
  
  if (error) {
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
  
  return NextResponse.json({
    orderId,
    amount: selected.price,
    tokens: selected.tokens,
    name: selected.name
  })
}
```

#### Payment Completion Endpoint
**File:** `/app/api/payments/complete/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/clients/server'
import { addTokens } from '@/utils/supabase/services/tokenService'

export async function POST(request: NextRequest) {
  const { paymentKey, impUid } = await request.json()
  const supabase = await createClient()
  
  // Verify payment with PortOne
  const verifyResponse = await fetch('https://api.iamport.kr/payments/' + impUid, {
    headers: {
      'Authorization': `Bearer ${await getPortOneAccessToken()}`
    }
  })
  
  const paymentData = await verifyResponse.json()
  
  if (paymentData.response?.status === 'paid') {
    // Get payment record
    const { data: paymentRecord } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_key', paymentKey)
      .eq('status', 'pending')
      .single()
    
    if (!paymentRecord) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }
    
    // Verify amount matches
    if (paymentRecord.amount !== paymentData.response.amount) {
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }
    
    // Add tokens to user
    await addTokens(supabase, paymentRecord.user_id, paymentRecord.tokens)
    
    // Update payment status
    await supabase
      .from('payments')
      .update({ status: 'completed', payment_method: paymentData.response.pay_method })
      .eq('payment_key', paymentKey)
    
    return NextResponse.json({ success: true, tokens: paymentRecord.tokens })
  }
  
  return NextResponse.json({ success: false, error: 'Payment not verified' }, { status: 400 })
}
```

### 3.3 Frontend Payment Component
**File:** `/components/payments/TokenPurchase.tsx`

```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

declare global {
  interface Window {
    IMP: any
  }
}

export default function TokenPurchase({ onSuccess }: { onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false)
  
  const handlePurchase = async (packageId: string) => {
    setLoading(true)
    
    try {
      // Get payment details from our API
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId })
      })
      
      const { orderId, amount, tokens, name } = await response.json()
      
      // Initialize PortOne
      const IMP = window.IMP
      IMP.init(process.env.NEXT_PUBLIC_IAMPORT_CODE)
      
      // Request payment
      IMP.request_pay({
        pg: 'tosspayments', // or 'kakaopay'
        pay_method: 'card',
        merchant_uid: orderId,
        name: name,
        amount: amount,
        buyer_email: user?.email,
        buyer_name: user?.name,
        m_redirect_url: `${window.location.origin}/payments/complete`
      }, async (response: any) => {
        if (response.success) {
          // Verify payment on backend
          const verifyResponse = await fetch('/api/payments/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentKey: orderId,
              impUid: response.imp_uid
            })
          })
          
          const result = await verifyResponse.json()
          
          if (result.success) {
            alert(`${tokens} 토큰이 추가되었습니다!`)
            onSuccess?.()
            window.location.reload()
          } else {
            alert('결제 검증에 실패했습니다. 고객센터에 문의해주세요.')
          }
        } else {
          alert('결제가 취소되었습니다.')
        }
      })
    } catch (error) {
      console.error('Payment error:', error)
      alert('결제 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-6">
        <h3 className="font-bold text-lg mb-2">Starter</h3>
        <p className="text-2xl font-bold mb-1">10 토큰</p>
        <p className="text-gray-600 mb-4">₩5,000</p>
        <Button 
          onClick={() => handlePurchase('starter')}
          disabled={loading}
          className="w-full"
        >
          구매하기
        </Button>
      </Card>
      
      <Card className="p-6 border-blue-500">
        <h3 className="font-bold text-lg mb-2">Standard</h3>
        <p className="text-2xl font-bold mb-1">30 토큰</p>
        <p className="text-gray-600 mb-4">₩12,000</p>
        <p className="text-sm text-green-600 mb-2">20% 할인</p>
        <Button 
          onClick={() => handlePurchase('standard')}
          disabled={loading}
          className="w-full"
        >
          구매하기
        </Button>
      </Card>
      
      <Card className="p-6">
        <h3 className="font-bold text-lg mb-2">Premium</h3>
        <p className="text-2xl font-bold mb-1">100 토큰</p>
        <p className="text-gray-600 mb-4">₩35,000</p>
        <p className="text-sm text-green-600 mb-2">30% 할인</p>
        <Button 
          onClick={() => handlePurchase('premium')}
          disabled={loading}
          className="w-full"
        >
          구매하기
        </Button>
      </Card>
    </div>
  )
}
```

## Phase 4: Update Existing Features

### 4.1 Update Question Generation API
**File:** `/app/api/ai/question/route.ts`

Add before question generation:
```typescript
import { getUserTokens, spendTokens } from '@/utils/supabase/services/tokenService'

// Check tokens
const tokens = await getUserTokens(supabase, user.id)
if (tokens < 1) {
  return NextResponse.json(
    { error: 'Insufficient tokens', tokens: tokens },
    { status: 402 }
  )
}

// After successful generation
const tokenSpent = await spendTokens(supabase, user.id, 1)
if (!tokenSpent) {
  console.error('Failed to deduct token')
}
```

### 4.2 Update Answer Generation API
Similar updates to `/app/api/ai/answer/route.ts` with 2 tokens per generation.

### 4.3 Update Frontend Components
Update `questionsSection.tsx` and `answersSection.tsx` to:
1. Fetch real token balance
2. Show token purchase modal when insufficient
3. Display current token balance

## Phase 5: Environment Setup

### 5.1 Required Environment Variables
Add to `.env.local`:
```
# PortOne (Iamport)
IAMPORT_CODE=imp12345678  # Your merchant code
IAMPORT_API_KEY=your_api_key
IAMPORT_API_SECRET=your_api_secret
NEXT_PUBLIC_IAMPORT_CODE=imp12345678  # Same as IAMPORT_CODE, for client
```

### 5.2 Add PortOne Script
In `/app/layout.tsx`, add before closing `</body>`:
```html
<Script src="https://cdn.iamport.kr/v1/iamport.js" />
```

## Implementation Timeline

### Day 1 (2-3 hours)
1. Run database migrations (5 min)
2. Create token service (30 min)
3. Update question/answer APIs (30 min)
4. Basic token display in UI (1 hour)

### Day 2 (3-4 hours)
1. Set up PortOne account (30 min)
2. Implement payment APIs (1 hour)
3. Create payment UI component (1 hour)
4. Testing with test payments (1 hour)

### Day 3 (2 hours)
1. Error handling improvements (1 hour)
2. Production deployment (1 hour)

## Testing Checklist
- [ ] New users get 5 free tokens
- [ ] Tokens decrease on question generation (1 token)
- [ ] Tokens decrease on answer generation (2 tokens)
- [ ] Payment flow works with test card
- [ ] Tokens are added after successful payment
- [ ] Failed payments don't add tokens
- [ ] Token balance updates in UI

## Future Enhancements (After MVP)
1. Transaction history page
2. Referral system (bonus tokens)
3. Subscription plans (monthly token allowance)
4. Admin dashboard for manual token management
5. Email receipts
6. Bulk discounts
7. Token expiration (optional)

## Support & Troubleshooting

### Common Issues
1. **Payment not completing**: Check PortOne webhook configuration
2. **Tokens not adding**: Verify payment status in database
3. **API errors**: Check Supabase RLS policies

### Manual Token Management
If needed, manually add tokens via SQL:
```sql
UPDATE profiles SET tokens = tokens + 10 WHERE id = 'user_uuid';
```

## Notes
- Keep it simple initially
- Manual fallback for payment issues
- Monitor first 10 users closely
- Iterate based on user feedback