import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createAdminClient } from '@/lib/supabase/clients/admin'
import { fetchInterviewByIdServer } from '@/lib/supabase/services/serverServices'
import { checkTokenBalance, spendTokens, refundTokens } from '@/lib/supabase/services/tokenService'
import { GoogleGenAI, Type } from "@google/genai"

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId, userId, interviewId, inputData } = body
    const { category, index, comment } = inputData || {}

    console.log('Processing question edit job:', jobId)
    console.log('Edit params:', { category, index, comment })

    // Get supabase client
    const supabase = createAdminClient()

    // Mark job as processing
    const { error: processingError } = await supabase
      .from('interview_qa_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    if (processingError) {
      console.error('Failed to mark job as processing:', processingError)
      throw new Error(`Failed to update job status: ${processingError.message}`)
    }
    console.log('Job marked as processing:', jobId)

    // STEP 1: Token cost for question edit is 0.1
    const tokenCost = 0.1

    try {

      // STEP 2: Check token balance BEFORE any work
      const hasEnoughTokens = await checkTokenBalance(supabase, userId, tokenCost)
      if (!hasEnoughTokens) {
        console.error('Insufficient tokens for job', jobId, '- required:', tokenCost)
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'Insufficient tokens' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'Insufficient tokens' }, { status: 402 })
      }

      // STEP 3: Spend tokens UPFRONT (charge user before work)
      const tokenSpent = await spendTokens(supabase, userId, tokenCost)
      if (!tokenSpent) {
        console.error('Failed to spend tokens for job', jobId)
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'Token deduction failed' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'Token deduction failed' }, { status: 500 })
      }

      console.log(`✅ Charged ${tokenCost} tokens upfront for job`, jobId)

      // Fetch the interview data
      const interview = await fetchInterviewByIdServer(interviewId, userId)
      if (!interview) {
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens for job`, jobId)
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'Interview not found' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
      }

      // Fetch the default QA record with questions
      const { data: qa, error: qaError } = await supabase
        .from('interview_qas')
        .select('*')
        .eq('interview_id', interviewId)
        .eq('is_default', true)
        .single()

      if (qaError || !qa || !qa.questions_data) {
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens for job`, jobId)
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'QA record not found' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'QA record not found' }, { status: 404 })
      }

      const questionData = qa.questions_data

      // Get the current question
      const currentQuestion = questionData[category]?.[index]
      if (!currentQuestion) {
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens for job`, jobId)
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'Question not found' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'Question not found' }, { status: 400 })
      }

      // Prepare the prompt
      const prompt = generateEditPrompt(interview, category, currentQuestion, comment)
      console.log('Generated edit prompt for job', jobId, 'length:', prompt.length)

      // STEP 4: Generate with Gemini (user already paid)
      const editedQuestion = await generateQuestionWithGemini(prompt)
      console.log('Generated edited question for job', jobId, 'length:', editedQuestion.length)

      // Parse and validate JSON response
      let llmResponse: any = null
      try {
        let jsonString = editedQuestion.trim()

        // Extract JSON from markdown code blocks if present
        if (jsonString.includes('```json')) {
          const jsonMatch = jsonString.match(/```json\s*\n([\s\S]*?)\n\s*```/)
          if (jsonMatch) {
            jsonString = jsonMatch[1].trim()
          }
        } else if (jsonString.includes('```')) {
          const jsonMatch = jsonString.match(/```\s*\n([\s\S]*?)\n\s*```/)
          if (jsonMatch) {
            jsonString = jsonMatch[1].trim()
          }
        }

        llmResponse = JSON.parse(jsonString)

        // Validate structure - expecting { question: "..." }
        if (!llmResponse.question || typeof llmResponse.question !== 'string' || llmResponse.question.trim().length === 0) {
          throw new Error('Invalid JSON structure: missing question field')
        }

        console.log('JSON validation passed for job', jobId)

      } catch (error) {
        console.error('JSON parsing/validation failed for job', jobId, ':', error)
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens due to JSON parsing error for job`, jobId)
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'Failed to generate valid JSON question' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'JSON parsing failed' }, { status: 500 })
      }

      // Update the question in the data structure
      const updatedQuestionData = {
        ...questionData,
        [category]: [
          ...questionData[category].slice(0, index),
          llmResponse.question,
          ...questionData[category].slice(index + 1)
        ]
      }

      console.log('Updated question for job', jobId)

      // Clear the corresponding answer since the question changed
      const emptyAnswers = {
        general_personality: Array(10).fill(null),
        cover_letter_personality: Array(10).fill(null),
        cover_letter_competency: Array(10).fill(null)
      }

      const updatedAnswerData = qa.answers_data ? {
        ...qa.answers_data,
        [category]: [
          ...qa.answers_data[category].slice(0, index),
          null, // Clear answer for the edited question
          ...qa.answers_data[category].slice(index + 1)
        ]
      } : emptyAnswers

      // Unset current default
      await supabase
        .from('interview_qas')
        .update({ is_default: false })
        .eq('interview_id', interviewId)
        .eq('is_default', true)

      // Create new QA record with edited question as new default
      const { data: savedQA, error: saveError } = await supabase
        .from('interview_qas')
        .insert({
          interview_id: interviewId,
          name: comment || '질문 수정',
          questions_data: updatedQuestionData,
          answers_data: updatedAnswerData, // Clear corresponding answer
          is_default: true,
          type: 'question_edited'
        })
        .select()
        .single()

      if (saveError) {
        console.error('Error saving QA for job', jobId, ':', saveError)
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens due to save error for job`, jobId)
        await supabase
          .from('interview_qa_jobs')
          .update({ status: 'failed', error_message: 'Failed to save QA to database' })
          .eq('id', jobId)
        return NextResponse.json({ error: 'Database save failed' }, { status: 500 })
      }

      // Mark job as completed (tokens already spent)
      const { error: updateError } = await supabase
        .from('interview_qa_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)

      if (updateError) {
        console.error('Failed to mark job as completed:', updateError)
      } else {
        console.log('Job marked as completed in database:', jobId)
      }

      console.log('Question edit job completed successfully:', jobId)
      return NextResponse.json({ success: true, qaId: savedQA.id })

    } catch (error) {
      console.error('Error in question edit for job', jobId, ':', error)
      await refundTokens(supabase, userId, tokenCost)
      console.log(`♻️ Refunded ${tokenCost} tokens due to error for job`, jobId)
      await supabase
        .from('interview_qa_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', jobId)
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
    }

  } catch (error) {
    console.error('Error processing question edit job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateEditPrompt(interview: any, category: string, currentQuestion: string, comment?: string): string {
  const categoryLabel = category === 'general_personality' ? '일반 인성' :
                        category === 'cover_letter_personality' ? '자소서 기반 인성' :
                        '자소서 기반 역량'

  const prompt = `당신은 면접 질문을 수정하는 전문가입니다.
아래 기존 질문을 수정해주세요.

[사용자 정보]
<회사 정보>
${interview.company_info || ''}

<직무 정보>
${interview.position || ''}
${interview.job_posting || ''}

<자기소개서>
${interview.cover_letter || ''}

<이력서>
${interview.resume || ''}

<예상 질문>
${interview.expected_questions || ''}

<채점 항목>
${interview.company_evaluation || ''}

<기타>
${interview.other || ''}

[질문 카테고리]
${categoryLabel}

[현재 질문]
${currentQuestion}

[수정 요청사항]
${comment || '질문의 의도를 유지하면서 더 효과적으로 수정해주세요.'}

[수정 요구사항]
- 질문의 핵심 의도는 유지하되, 더 명확하고 효과적으로 수정
- 카테고리(${categoryLabel})에 적합한 질문으로 수정
- **중요**: 만약 카테고리가 "일반 인성"인 경우, 자기소개서/이력서/회사정보 등 사용자가 업로드한 구체적 정보를 절대 사용하지 말고 일반적이고 보편적인 질문으로만 수정할 것
- 카테고리가 "자소서 기반 인성" 또는 "자소서 기반 역량"인 경우에만 사용자 정보를 반영하여 구체적으로 작성
- 면접관이 실제로 물어볼 법한 자연스러운 표현 사용

[출력 형식]
수정된 질문을 JSON 형식으로 반환해주세요.

예시:
{
  "question": "수정된 질문 내용"
}

수정된 질문 1개만 생성해주세요.`

  return prompt
}

async function generateQuestionWithGemini(prompt: string): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY

  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  console.log('Using Gemini API key:', geminiApiKey.substring(0, 10) + '...')
  console.log('Edit prompt length:', prompt.length)

  const ai = new GoogleGenAI({ apiKey: geminiApiKey })

  const modelsToTry = [
    { name: 'gemini-2.5-pro', description: 'Gemini 2.5 Pro' },
    { name: 'gemini-2.5-pro-001', description: 'Gemini 2.5 Pro (stable)' },
    { name: 'gemini-2.5-flash', description: 'Gemini 2.5 Flash (fallback)' }
  ]

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting to call Gemini API with model: ${model.name}`)

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          question: {
            type: Type.STRING
          }
        },
        required: ["question"]
      }

      const response = await ai.models.generateContent({
        model: model.name,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      })

      const responseText = response.text
      console.log('Gemini API response received, length:', responseText?.length || 0)

      if (!responseText) {
        throw new Error('Empty response from Gemini API')
      }

      console.log(`✅ Successfully used ${model.name}`)
      return responseText

    } catch (error) {
      console.error(`❌ Failed with ${model.name}:`, error instanceof Error ? error.message : 'Unknown error')

      if (error instanceof Error && error.message.includes('API key not valid')) {
        throw new Error('Invalid Gemini API key')
      }

      if (model === modelsToTry[modelsToTry.length - 1]) {
        throw new Error(`All models failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      continue
    }
  }

  throw new Error('No models available')
}

// Signature verification enabled - QStash will verify requests using signing keys
export const POST = verifySignatureAppRouter(handler, { clockTolerance: 30000 })
