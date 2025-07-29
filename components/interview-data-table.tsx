"use client"

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { DataItem } from "@/lib/types";
import createTestColumns from "@/components/testColumns";
import { deleteInterviewClient } from "@/lib/supabase/services/clientServices";

interface InterviewDataTableProps {
  data: DataItem[];
}

export function InterviewDataTable({ data }: InterviewDataTableProps) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    await deleteInterviewClient(id);
    // Refresh the page to update the data
    router.refresh();
  };

  // Create columns with router and delete handler
  const columns = createTestColumns(router, handleDelete);

  return (
    <DataTable
      data={data}
      columns={columns}
      searchPlaceholder="지원자명으로 검색..."
      emptyMessage="현재 데이터베이스에 면접 기록이 없습니다. 새로운 면접을 생성해보세요."
      showCreateButton={true}
    />
  );
} 