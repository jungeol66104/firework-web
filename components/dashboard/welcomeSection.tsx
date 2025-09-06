"use client"

interface WelcomeSectionProps {
  userName: string
}

export default function WelcomeSection({ userName }: WelcomeSectionProps) {
  return (
    <div className="w-full max-w-4xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">환영합니다, {userName}님.</h1>
      </div>
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="text-blue-700 text-sm">
          <div className="font-semibold mb-2">🚀 빅토리 포뮬러 시작하기</div>
          <div className="space-y-1">
            <div>1. 아래 "면접 생성하기" 버튼을 클릭하여 새로운 면접을 생성하세요</div>
            <div>2. 기업 정보, 자기소개서, 이력서 등 필수 정보를 입력하세요</div>
            <div>3. AI가 맞춤형 면접 질문을 생성하고 모의 면접을 진행할 수 있습니다</div>
          </div>
        </div>
      </div>
    </div>
  )
}