import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="flex justify-center items-start">
        <div className="w-full max-w-4xl px-4 py-8">
          {/* Company Name */}
          <div className="mb-8">
            <Link href="/" className="text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors">
              빅토리 포뮬러
            </Link>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Legal Links */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">약관 및 정책</h4>
              <div className="space-y-2 text-sm">
                <Link 
                  href="/terms-of-service" 
                  className="block text-gray-600 hover:text-gray-900 transition-colors"
                >
                  서비스 이용약관
                </Link>
                <Link 
                  href="/privacy-policy" 
                  className="block text-gray-600 hover:text-gray-900 transition-colors"
                >
                  개인정보 처리방침
                </Link>
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">관련 서비스</h4>
              <div className="space-y-2 text-sm">
                <a 
                  href="https://soomgo.com/profile/users/3379598" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-gray-600 hover:text-gray-900 transition-colors"
                >
                  숨고 면접 코칭 서비스
                </a>
              </div>
            </div>

            {/* Company Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">회사 정보</h4>
              <div className="text-xs text-gray-500 space-y-1">
                <div>상호명: 승리의 공식</div>
                <div>대표자명: 정재훈</div>
                <div>사업자등록번호: 823-17-02092</div>
                <div>통신판매업신고번호: 2024-서울서초-4393</div>
                <div>유선전화번호: 010-3095-1077</div>
                <div>이메일: business.jhjung@gmail.com</div>
                <div>사업장 주소: 경기 남양주시 다산중앙로82번안길 166-22 414호</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}