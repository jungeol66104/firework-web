import { DataTable } from "@/components/data-table";

export default function Home() {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl p-8">
          <h1 className="text-2xl font-bold">정코치 면접 관리 시스템</h1>
          <DataTable />
      </div>
    </div>
  );
}
