import { createClient } from '../clientClient'
import { createInterview, deleteInterview } from './services'
import { CreateInterviewParams, Interview } from '@/lib/types'

export async function createInterviewClient(
  params: CreateInterviewParams
): Promise<Interview> {
  console.log("createInterviewClient called with params:", params)
  const supabase = createClient()
  console.log("Supabase client created")
  const result = await createInterview(supabase, params)
  console.log("createInterview result:", result)
  return result
}

export async function deleteInterviewClient(
  interviewId: string
): Promise<void> {
  console.log("deleteInterviewClient called with id:", interviewId)
  const supabase = createClient()
  console.log("Supabase client created for delete")
  await deleteInterview(supabase, interviewId)
  console.log("deleteInterview completed")
}
