import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createAdminClient } from '@/lib/supabase/clients/admin'
import { fetchInterviewByIdServer } from '@/lib/supabase/services/serverServices'
import { checkTokenBalance, spendTokens, refundTokens } from '@/lib/supabase/services/tokenService'
import { createNotification } from '@/lib/supabase/services/notificationService'
import { NOTIFICATION_MESSAGES } from '@/lib/constants'
import { generateWithGemini } from '@/lib/gemini/client'

async function handler(request: NextRequest) {
  try {
    // Debug logging for QStash
    console.log('=== QStash Question Handler Debug ===')
    console.log('Headers:', Object.fromEntries(request.headers.entries()))
    console.log('Method:', request.method)
    console.log('URL:', request.url)
    console.log('Environment check:')
    console.log('- QSTASH_CURRENT_SIGNING_KEY exists:', !!process.env.QSTASH_CURRENT_SIGNING_KEY)
    console.log('- QSTASH_NEXT_SIGNING_KEY exists:', !!process.env.QSTASH_NEXT_SIGNING_KEY)

    const body = await request.json()
    const { jobId, userId, interviewId } = body

    console.log('Processing question generation job:', jobId)
    console.log('Job params:', { jobId, userId, interviewId })

    // Get supabase client
    const supabase = createAdminClient()

    // Mark job as processing
    await supabase
      .from('interview_qa_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // STEP 1: Check token balance BEFORE any work
    const tokenCost = 3

    try {
      const hasEnoughTokens = await checkTokenBalance(supabase, userId, tokenCost)
      if (!hasEnoughTokens) {
        console.error('Insufficient tokens for job', jobId, '- required:', tokenCost)
        await supabase
          .from('interview_qa_jobs')
          .update({
            status: 'failed',
            error_message: 'Insufficient tokens',
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId)
        return NextResponse.json({ error: 'Insufficient tokens' }, { status: 402 })
      }

      // STEP 2: Spend tokens UPFRONT (charge user before work)
      const tokenSpent = await spendTokens(supabase, userId, tokenCost)
      if (!tokenSpent) {
        console.error('Failed to spend tokens for job', jobId)
        await supabase
          .from('interview_qa_jobs')
          .update({
            status: 'failed',
            error_message: 'Token deduction failed',
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId)
        return NextResponse.json({ error: 'Token deduction failed' }, { status: 500 })
      }

      console.log(`✅ Charged ${tokenCost} tokens upfront for job`, jobId)

      // Fetch the interview data
      const interview = await fetchInterviewByIdServer(interviewId, userId)
      if (!interview) {
        // Refund tokens since we failed before generation
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens for job`, jobId)

        await supabase
          .from('interview_qa_jobs')
          .update({
            status: 'failed',
            error_message: 'Interview not found',
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId)
        return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
      }

      // Fetch all previous questions to avoid duplicates (limit to last 20 generations)
      const { data: allQAs } = await supabase
        .from('interview_qas')
        .select('questions_data')
        .eq('interview_id', interviewId)
        .order('created_at', { ascending: false })
        .limit(20)

      // Extract all previous questions into a flat array
      const previousQuestions: string[] = []
      if (allQAs && allQAs.length > 0) {
        allQAs.forEach(qa => {
          if (qa.questions_data) {
            const { general_personality, cover_letter_personality, cover_letter_competency } = qa.questions_data
            if (general_personality) previousQuestions.push(...general_personality)
            if (cover_letter_personality) previousQuestions.push(...cover_letter_personality)
            if (cover_letter_competency) previousQuestions.push(...cover_letter_competency)
          }
        })
        console.log(`Found ${previousQuestions.length} previous questions to avoid for job`, jobId)
      }

      // Prepare the prompt with previous questions if they exist
      const prompt = generatePrompt(interview, undefined, previousQuestions.length > 0 ? previousQuestions : null)
      console.log('Generated prompt for job', jobId, 'length:', prompt.length)

      // STEP 3: Generate with Gemini (user already paid)
      const question = await generateWithGemini(prompt, 'questions_bulk')
      console.log('Generated question for job', jobId, 'length:', question.length)

      // Parse and validate JSON response
      let questionData: any = null
      try {
        let jsonString = question.trim()
        
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
        
        questionData = JSON.parse(jsonString)
        
        // Validate structure
        const requiredKeys = ['general_personality', 'cover_letter_personality', 'cover_letter_competency']
        const hasRequiredKeys = requiredKeys.every(key => {
          const arr = questionData[key]
          return Array.isArray(arr) && arr.length === 10 && arr.every(item => typeof item === 'string' && item.trim().length > 0)
        })
        
        if (!hasRequiredKeys) {
          throw new Error('Invalid JSON structure from Gemini API')
        }
        
        console.log('JSON validation passed for job', jobId)
        
      } catch (error) {
        console.error('JSON parsing/validation failed for job', jobId, ':', error)
        // Refund tokens on parsing failure
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens due to JSON parsing error for job`, jobId)

        await supabase
          .from('interview_qa_jobs')
          .update({
            status: 'failed',
            error_message: 'Failed to generate valid JSON questions',
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId)
        return NextResponse.json({ error: 'JSON parsing failed' }, { status: 500 })
      }

      // Check if there's an existing default QA record
      const { data: existingQAs } = await supabase
        .from('interview_qas')
        .select('id')
        .eq('interview_id', interviewId)
        .eq('is_default', true)

      // Store parent QA ID if there's a previous version
      const parentQaId = existingQAs && existingQAs.length > 0 ? existingQAs[0].id : null

      // If exists, set it to non-default
      if (existingQAs && existingQAs.length > 0) {
        await supabase
          .from('interview_qas')
          .update({ is_default: false })
          .eq('interview_id', interviewId)
          .eq('is_default', true)
      }

      // Save to interview_qas as new default with empty answers structure
      // New questions = fresh empty answers (old answers don't map to new questions)
      const emptyAnswers = {
        general_personality: Array(10).fill(null),
        cover_letter_personality: Array(10).fill(null),
        cover_letter_competency: Array(10).fill(null)
      }

      // Build target_items - all 30 questions were generated
      const targetItems = {
        questions: [
          ...Array.from({ length: 10 }, (_, i) => ({ category: 'general_personality' as const, index: i })),
          ...Array.from({ length: 10 }, (_, i) => ({ category: 'cover_letter_personality' as const, index: i })),
          ...Array.from({ length: 10 }, (_, i) => ({ category: 'cover_letter_competency' as const, index: i }))
        ],
        answers: []
      }

      const { data: savedQA, error: saveError } = await supabase
        .from('interview_qas')
        .insert({
          interview_id: interviewId,
          name: '질문지 생성',
          questions_data: questionData,
          answers_data: emptyAnswers,
          is_default: true,
          type: 'questions_generated',
          parent_qa_id: parentQaId,
          target_items: targetItems,
          tokens_used: 3
        })
        .select()
        .single()

      if (saveError) {
        console.error('Error saving QA for job', jobId, ':', saveError)
        // Refund tokens on save failure
        await refundTokens(supabase, userId, tokenCost)
        console.log(`♻️ Refunded ${tokenCost} tokens due to save error for job`, jobId)

        await supabase
          .from('interview_qa_jobs')
          .update({
            status: 'failed',
            error_message: 'Failed to save QA to database',
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId)
        return NextResponse.json({ error: 'Database save failed' }, { status: 500 })
      }

      // Mark job as completed (tokens already spent)
      await supabase
        .from('interview_qa_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)

      // Create notification for user
      try {
        await createNotification(supabase, {
          user_id: userId,
          type: 'questions_generated',
          message: NOTIFICATION_MESSAGES.questions_generated(interview.company_name || '회사'),
          interview_id: interviewId,
          interview_qas_id: savedQA.id,
          metadata: {
            company_name: interview.company_name
          }
        })
        console.log('Notification created for job:', jobId)
      } catch (notifError) {
        console.error('Failed to create notification for job', jobId, ':', notifError)
        // Don't fail the job if notification creation fails
      }

      console.log('Question generation job completed successfully:', jobId)
      return NextResponse.json({ success: true, qaId: savedQA.id })

    } catch (error) {
      console.error('Error in question generation for job', jobId, ':', error)
      // Refund tokens on any failure
      await refundTokens(supabase, userId, tokenCost)
      console.log(`♻️ Refunded ${tokenCost} tokens due to error for job`, jobId)

      await supabase
        .from('interview_qa_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
    }

  } catch (error) {
    console.error('Error processing question generation job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generatePrompt(interview: any, comment?: string, previousQuestions?: string[] | null): string {
  if (previousQuestions && previousQuestions.length > 0) {
    // Regeneration mode prompt - avoid duplicates
    const previousQuestionsText = previousQuestions
      .map((q, i) => `${i + 1}. ${q}`)
      .join('\n')

    const prompt = `다음 JSON 형식으로 정확히 30개 면접 질문을 생성해줘. 첫 번째 질문은 반드시 '1분 자기소개 부탁드립니다.'로 시작해야 함.

[생성하면 안 되는 기존 질문들]
다음 질문들은 이전에 생성되었으므로 절대 생성하지 마세요. 완전히 새로운 질문을 만들어야 합니다:
${previousQuestionsText}

[사용자 요청]
${comment || '위의 기존 질문들과 중복되지 않는 완전히 새로운 질문들을 생성해줘'}

[JSON 출력 형식]
{
  "general_personality": [
    "1분 자기소개 부탁드립니다.",
    "질문 2",
    "질문 3",
    "질문 4",
    "질문 5",
    "질문 6",
    "질문 7",
    "질문 8",
    "질문 9",
    "질문 10"
  ],
  "cover_letter_personality": [10개],
  "cover_letter_competency": [10개]
}

[질문 카테고리별 특성]
- general_personality: 일반적인 인성 질문으로, 자기소개서/이력서/회사정보 등 사용자가 업로드한 정보를 절대 사용하지 말 것. 오직 일반적이고 보편적인 질문만 생성할 것.
- cover_letter_personality: 자기소개서와 이력서를 기반으로 한 인성 질문
- cover_letter_competency: 자기소개서와 이력서를 기반으로 한 직무 역량 질문

[기본 원칙]
- 첫 번째 질문은 반드시 '1분 자기소개 부탁드립니다.' 유지
- 채점항목도 고려해야
- 두괄식이어야
- 논리적이어야
- 직관적이어야
- 이 사람의 구체적인 경험을 잘 드러내야
- 이 사람의 경험이 없는 건 지어내지 말고, 경험은 있는데 디테일이 부족한 경우는 디테일을 채워줘도 됨

[데이터]
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
${interview.company_evaluation || ''}`

    return prompt
  } else {
    // Initial generation mode prompt
    const prompt = `다음 JSON 형식으로 정확히 30개 면접 질문을 생성해줘. 첫 번째 질문은 반드시 '1분 자기소개 부탁드립니다.'로 시작해야 함.

[JSON 출력 형식]
{
  "general_personality": [
    "1분 자기소개 부탁드립니다.",
    "질문 2",
    "질문 3",
    "질문 4",
    "질문 5",
    "질문 6",
    "질문 7",
    "질문 8",
    "질문 9",
    "질문 10"
  ],
  "cover_letter_personality": [10개],
  "cover_letter_competency": [10개]
}

[질문 카테고리별 특성]
- general_personality: 일반적인 인성 질문으로, 자기소개서/이력서/회사정보 등 사용자가 업로드한 정보를 절대 사용하지 말 것. 오직 일반적이고 보편적인 질문만 생성할 것.
- cover_letter_personality: 자기소개서와 이력서를 기반으로 한 인성 질문
- cover_letter_competency: 자기소개서와 이력서를 기반으로 한 직무 역량 질문

[원칙]
- 채점항목도 고려해야
- 두괄식이어야
- 논리적이어야
- 직관적이어야
- 이 사람의 구체적인 경험을 잘 드러내야
- 이 사람의 경험이 없는 건 지어내지 말고, 경험은 있는데 디테일이 부족한 경우는 디테일을 채워줘도 됨

[데이터]
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

[개선 요청]
${comment || '없음'}`

    return prompt
  }
}

// Signature verification enabled - QStash will verify requests using signing keys
export const POST = verifySignatureAppRouter(handler, { clockTolerance: 30000 })