import { InterviewDataTable } from "@/components/interviewDataTable";

export default async function Home() {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl p-8">
          <h1 className="text-2xl font-bold">면접 내역</h1>
          <InterviewDataTable />
      </div>
    </div>
  );
}
