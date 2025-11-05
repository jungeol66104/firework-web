import { SignupForm } from "@/components/ui/signup-form"
import { Suspense } from "react"
import { Loader } from "lucide-react"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={
          <div className="flex items-center justify-center p-8">
            <Loader className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        }>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  )
}
