import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('=== Test Endpoint Hit ===')
  console.log('Method:', request.method)
  console.log('URL:', request.url)
  console.log('Headers:', Object.fromEntries(request.headers.entries()))
  
  return NextResponse.json({ 
    success: true, 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  })
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    success: true, 
    message: 'Test GET endpoint working',
    timestamp: new Date().toISOString()
  })
}