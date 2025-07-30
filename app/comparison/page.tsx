import { fetchInterviewsServer } from "@/lib/supabase/services/serverServices";
import { ComparisonDataTable } from "@/components/comparisonDataTable";

export default async function ComparisonPage() {
  const { interviews } = await fetchInterviewsServer({ limit: 50 });

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl p-8">
          <h1 className="text-2xl font-bold mb-4">면접 내역 (예전)</h1>
          <ComparisonDataTable data={interviews} />
      </div>
    </div>
  );
}
