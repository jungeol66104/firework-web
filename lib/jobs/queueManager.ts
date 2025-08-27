import { Client } from '@upstash/qstash'

export interface QueueJobParams {
  jobId: string
  type: 'question' | 'answer'
  userId: string
  interviewId: string
  questionId?: string
  comment?: string
}

export class QueueManager {
  private get client(): Client {
    const token = process.env.QSTASH_TOKEN
    if (!token) {
      throw new Error('QSTASH_TOKEN environment variable is not set')
    }
    console.log('QStash token exists:', !!token)
    console.log('QStash token length:', token.length)
    return new Client({ token })
  }

  private getProcessingEndpoint(type: 'question' | 'answer'): string {
    // Force production domain for QStash webhooks instead of preview URLs
    const vercelUrl = process.env.VERCEL_URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    
    // Use production domain or fallback to NEXT_PUBLIC_APP_URL or localhost
    const baseUrl = appUrl || 
      (vercelUrl && !vercelUrl.includes('jungeol66104s-projects') 
        ? (vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`)
        : 'http://localhost:3000')
    
    const endpoint = `${baseUrl}/api/process/${type}`
    
    console.log('=== QStash Endpoint Generation Debug ===')
    console.log('- VERCEL_URL:', vercelUrl)
    console.log('- NEXT_PUBLIC_APP_URL:', appUrl)
    console.log('- Generated baseUrl:', baseUrl)
    console.log('- Final endpoint:', endpoint)
    
    return endpoint
  }

  async queueQuestionGeneration(params: QueueJobParams): Promise<string> {
    if (params.type !== 'question') {
      throw new Error('Invalid job type for question generation')
    }

    const endpoint = this.getProcessingEndpoint('question')
    
    console.log('=== QStash Publish Debug ===')
    console.log('Publishing to URL:', endpoint)
    console.log('Job params:', { jobId: params.jobId, userId: params.userId, interviewId: params.interviewId })
    
    const response = await this.client.publishJSON({
      url: endpoint,
      body: {
        jobId: params.jobId,
        userId: params.userId,
        interviewId: params.interviewId,
        comment: params.comment
      },
      headers: {
        'Content-Type': 'application/json',
      },
      retries: 3,
      delay: '0s'
    })
    
    console.log('QStash response:', response)

    console.log(`Queued question generation job: ${params.jobId}, messageId: ${response.messageId}`)
    return response.messageId
  }

  async queueAnswerGeneration(params: QueueJobParams): Promise<string> {
    if (params.type !== 'answer' || !params.questionId) {
      throw new Error('Invalid job type or missing questionId for answer generation')
    }

    const endpoint = this.getProcessingEndpoint('answer')
    
    const response = await this.client.publishJSON({
      url: endpoint,
      body: {
        jobId: params.jobId,
        userId: params.userId,
        interviewId: params.interviewId,
        questionId: params.questionId,
        comment: params.comment
      },
      headers: {
        'Content-Type': 'application/json',
      },
      retries: 3,
      delay: '0s'
    })

    console.log(`Queued answer generation job: ${params.jobId}, messageId: ${response.messageId}`)
    return response.messageId
  }

  async cancelJob(messageId: string): Promise<void> {
    try {
      await this.client.messages.delete(messageId)
      console.log(`Cancelled job with messageId: ${messageId}`)
    } catch (error) {
      console.error('Error cancelling job:', error)
      throw error
    }
  }
}

export function createQueueManager(): QueueManager {
  return new QueueManager()
}