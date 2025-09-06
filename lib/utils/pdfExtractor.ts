export const validatePDFFile = (file: File): void => {
  if (file.type !== 'application/pdf') {
    throw new Error('PDF 파일만 업로드 가능합니다.')
  }
  
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    throw new Error('파일 크기는 10MB 이하여야 합니다.')
  }
}

// Load PDF.js from CDN to avoid bundling issues
const loadPdfJs = async () => {
  if (typeof window === 'undefined') {
    throw new Error('PDF processing only available in browser')
  }
  
  // Load PDF.js from CDN if not already loaded
  if (!(window as any).pdfjsLib) {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    document.head.appendChild(script)
    
    await new Promise((resolve, reject) => {
      script.onload = resolve
      script.onerror = reject
    })
    
    // Set up worker
    ;(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  }
  
  return (window as any).pdfjsLib
}

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    validatePDFFile(file)
    console.log(`Processing PDF: ${file.name}, Size: ${file.size} bytes`)
    
    // Dynamic imports
    const [Tesseract, pdfjsLib] = await Promise.all([
      import('tesseract.js'),
      loadPdfJs()
    ])
    
    // Read the PDF file as array buffer
    const arrayBuffer = await file.arrayBuffer()
    console.log('PDF array buffer created, loading document...')
    
    // Configure PDF.js with CMap support for Korean fonts
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
    }).promise
    console.log(`PDF loaded successfully, ${pdf.numPages} pages found`)
    
    let extractedText = ''
    
    // Process each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        console.log(`Processing page ${pageNum}/${pdf.numPages}`)
        const page = await pdf.getPage(pageNum)
        
        // First try to extract text directly from PDF (faster and more accurate)
        try {
          const textContent = await page.getTextContent()
          
          // Reconstruct text with proper line breaks and blank line detection
          let pageText = ''
          let lastY = null
          
          for (const item of textContent.items) {
            if (lastY !== null) {
              const yDifference = Math.abs(lastY - item.transform[5])
              
              if (yDifference > 5) {
                // Detect blank lines based on larger vertical gaps
                if (yDifference > 20) {
                  // Large gap indicates blank line(s) - add double newline
                  pageText += '\n\n'
                } else {
                  // Normal line break
                  pageText += '\n'
                }
              }
            }
            pageText += item.str
            lastY = item.transform[5]
          }
          
          pageText = pageText.trim()
          
          if (pageText && pageText.length > 10) {
            console.log(`Page ${pageNum}: Direct text extraction successful (${pageText.length} chars)`)
            console.log(`Page ${pageNum} text preview:`, pageText.substring(0, 100) + '...')
            extractedText += pageText + '\n\n'
            continue
          }
        } catch (textError) {
          console.log(`Page ${pageNum}: Direct text extraction failed, falling back to OCR`)
        }
        
        // Fallback to OCR if direct text extraction fails or returns minimal text
        const viewport = page.getViewport({ scale: 3.0 }) // Higher scale for Korean text
        console.log(`Page ${pageNum} dimensions: ${viewport.width}x${viewport.height}`)
        
        // Create canvas for rendering
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')!
        canvas.width = viewport.width
        canvas.height = viewport.height
        
        // Render page to canvas with better quality for Korean text
        console.log(`Rendering page ${pageNum} to canvas for OCR...`)
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise
        
        // Convert canvas to high-quality image data for Tesseract
        const imageData = canvas.toDataURL('image/png')
        console.log(`Canvas rendered, image data size: ${imageData.length} chars`)
        
        // Try multiple OCR configurations for Korean text
        console.log(`Starting OCR for page ${pageNum}...`)
        
        let text = ''
        const ocrConfigs = [
          // Primary Korean-optimized config
          {
            lang: 'kor+eng',
            options: {
              tessedit_pageseg_mode: Tesseract.PSM.AUTO,
              tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
              preserve_interword_spaces: '1'
            }
          },
          // Fallback with different page segmentation
          {
            lang: 'kor+eng',
            options: {
              tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
              tessedit_ocr_engine_mode: Tesseract.OEM.DEFAULT
            }
          },
          // English-first fallback
          {
            lang: 'eng+kor',
            options: {
              tessedit_pageseg_mode: Tesseract.PSM.AUTO,
              tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
            }
          }
        ]
        
        for (let i = 0; i < ocrConfigs.length; i++) {
          const config = ocrConfigs[i]
          try {
            console.log(`Trying OCR config ${i + 1}: ${config.lang} with ${config.options.tesseract_pageseg_mode || 'AUTO'}`)
            
            const result = await Tesseract.recognize(imageData, config.lang, {
              logger: m => {
                if (m.status === 'recognizing text') {
                  console.log(`OCR progress Page ${pageNum} (Config ${i + 1}): ${Math.round(m.progress * 100)}%`)
                }
              },
              ...config.options
            })
            
            text = result.data.text
            console.log(`OCR config ${i + 1} extracted ${text.length} characters`)
            
            if (text.trim().length > 5) {
              console.log(`OCR config ${i + 1} successful, stopping`)
              break
            }
          } catch (ocrError) {
            console.log(`OCR config ${i + 1} failed:`, ocrError)
            continue
          }
        }
        
        console.log(`OCR completed for page ${pageNum}, extracted ${text.length} characters`)
        console.log(`Page ${pageNum} OCR text preview:`, text.substring(0, 100) + '...')
        
        // Be more lenient with OCR results - even short text might be valid Korean text
        if (text.trim() && text.trim().length > 2) {
          // Preserve existing newlines and add page separation
          extractedText += text.trim() + '\n\n'
        } else if (text.trim()) {
          console.log(`Page ${pageNum}: Short text found (${text.length} chars), might be Korean: "${text.trim()}"`)
          extractedText += text.trim() + '\n\n'
        }
        
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError)
        // Continue with other pages even if one fails
      }
    }
    
    const finalText = extractedText.trim()
    console.log(`Total extracted text length: ${finalText.length} characters`)
    console.log(`Final extracted text preview:`, finalText.substring(0, 200) + '...')
    
    if (!finalText || finalText.length < 5) {
      throw new Error('PDF에서 텍스트를 추출할 수 없습니다. PDF가 이미지 기반이거나 텍스트가 없을 수 있습니다. 직접 텍스트를 복사해서 입력해주세요.')
    }
    
    return finalText
    
  } catch (error) {
    console.error('PDF extraction error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('PDF 처리 중 오류가 발생했습니다.')
  }
}