
import { AdminInterviewDataTable } from "@/components/admin/adminInterviewDataTable"

export default async function Page() {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl p-8">
        <h1 className="text-2xl font-bold mb-4">면접 내역</h1>
        <AdminInterviewDataTable />
      </div>
    </div>
  )
}
