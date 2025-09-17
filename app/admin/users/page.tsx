import { UsersDataTable } from "@/components/admin/users/UsersDataTable"

export default function AdminUsersPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">사용자</h1>
      </div>
      <UsersDataTable />
    </div>
  )
}