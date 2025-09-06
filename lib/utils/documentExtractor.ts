export const validateDocumentFile = (file: File): void => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword' // .doc (legacy)
  ]
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('PDF, DOC, DOCX 파일만 업로드 가능합니다.')
  }
  
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    throw new Error('파일 크기는 10MB 이하여야 합니다.')
  }
}

export const extractTextFromWord = async (file: File): Promise<string> => {
  try {
    console.log(`Processing Word document via server: ${file.name}, Size: ${file.size} bytes`)
    
    // Create FormData to send file to server
    const formData = new FormData()
    formData.append('file', file)
    
    // Send file to server-side API
    const response = await fetch('/api/document/extract', {
      method: 'POST',
      body: formData
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Word 문서 처리에 실패했습니다.')
    }
    
    const text = result.text.trim()
    console.log(`Server-side Word extraction completed: ${text.length} characters`)
    console.log(`Word text preview:`, text.substring(0, 200) + '...')
    
    if (!text || text.length < 5) {
      throw new Error('Word 문서에서 텍스트를 추출할 수 없습니다.')
    }
    
    return text
    
  } catch (error) {
    console.error('Word extraction error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Word 문서 처리 중 오류가 발생했습니다.')
  }
}

// Import PDF extraction from existing file
import { extractTextFromPDF } from './pdfExtractor'

export const extractTextFromDocument = async (file: File): Promise<string> => {
  try {
    validateDocumentFile(file)
    
    if (file.type === 'application/pdf') {
      return await extractTextFromPDF(file)
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword'
    ) {
      return await extractTextFromWord(file)
    } else {
      throw new Error('지원하지 않는 파일 형식입니다.')
    }
    
  } catch (error) {
    console.error('Document extraction error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('문서 처리 중 오류가 발생했습니다.')
  }
}