import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword' // .doc (legacy)
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only Word documents (.doc, .docx) are supported' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Import mammoth on server side
    const mammoth = await import('mammoth')
    
    // Convert file to buffer for mammoth
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Extract text from Word document
    const result = await mammoth.extractRawText({ buffer })
    
    // Clean up excessive newlines and whitespace for Word documents
    let text = result.value
      .replace(/\r\n/g, '\n')        // Normalize line endings
      .replace(/\r/g, '\n')          // Convert remaining \r to \n
      .replace(/\n\n/g, '\n')        // Convert double newlines to single newlines (Word adds extra)
      .replace(/\n\s*\n\s*\n+/g, '\n\n')  // Replace 3+ consecutive newlines with 2
      .replace(/[ \t]+$/gm, '')      // Remove trailing spaces/tabs from each line
      .replace(/^\s+|\s+$/g, '')     // Trim start and end whitespace
    
    console.log(`Server-side Word extraction completed: ${text.length} characters`)
    
    if (!text || text.length < 5) {
      return NextResponse.json(
        { error: 'Could not extract text from Word document' },
        { status: 422 }
      )
    }
    
    return NextResponse.json({
      text,
      success: true,
      message: 'Word document processed successfully'
    })
    
  } catch (error) {
    console.error('Word extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to process Word document' },
      { status: 500 }
    )
  }
}