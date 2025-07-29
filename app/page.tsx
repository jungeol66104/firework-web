import { fetchInterviewsServer } from "@/lib/supabase/services/serverServices";
import { DataItem, Interview } from "@/lib/types";
import { InterviewDataTable } from "@/components/interview-data-table";

export default async function Home() {
  const { interviews } = await fetchInterviewsServer({ limit: 50 });

  // Transform interviews to DataItem format
  const data: DataItem[] = interviews.length > 0 ? interviews.map((interview: Interview) => ({
    id: interview.id,
    candidate_name: interview.candidate_name,
    company_name: interview.company_name,
    position: interview.position,
    job_posting: interview.job_posting,
    cover_letter: interview.cover_letter,
    company_info: interview.company_info,
    expected_questions: interview.expected_questions,
    company_evaluation: interview.company_evaluation,
    created_at: interview.created_at ? new Date(interview.created_at).toISOString().split('T')[0] : '',
    updated_at: interview.updated_at ? new Date(interview.updated_at).toISOString().split('T')[0] : ''
  })) : [];

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl p-8">
          <h1 className="text-2xl font-bold">면접 내역</h1>
          <InterviewDataTable data={data} />
      </div>
    </div>
  );
}
