"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { DataItem } from "@/lib/types"

// Example of a simple column configuration
const simpleColumns: ColumnDef<DataItem>[] = [
  {
    accessorKey: "name",
    header: "이름",
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "info",
    header: "회사",
    cell: ({ row }) => <div>{row.getValue("info")}</div>,
  },
  {
    accessorKey: "createdAt",
    header: "생성일",
    cell: ({ row }) => <div>{row.getValue("createdAt")}</div>,
  },
]

// Example of a custom column configuration
const customColumns: ColumnDef<DataItem>[] = [
  {
    accessorKey: "name",
    header: "후보자",
    cell: ({ row }) => <div className="font-bold">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "info",
    header: "회사명",
    cell: ({ row }) => <div className="text-blue-600">{row.getValue("info")}</div>,
  },
  {
    accessorKey: "question",
    header: "포지션",
    cell: ({ row }) => <div className="text-green-600">{row.getValue("question")}</div>,
  },
]

interface ExampleDataTableProps {
  data: DataItem[]
  variant?: "simple" | "custom"
}

export function ExampleDataTable({ data, variant = "simple" }: ExampleDataTableProps) {
  const columns = variant === "simple" ? simpleColumns : customColumns

  return (
    <DataTable
      data={data}
      columns={columns}
      searchPlaceholder={`${variant === "simple" ? "이름" : "후보자"}으로 검색...`}
      emptyMessage={`${variant === "simple" ? "데이터" : "면접 기록"}가 없습니다.`}
      showCreateButton={variant === "custom"}
    />
  )
} 