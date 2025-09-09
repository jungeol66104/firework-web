export default function TermsOfServicePage() {
  return (
    <div className="flex justify-center items-start">
      <div className="w-full max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">서비스 이용약관</h1>
        
        <div className="prose max-w-none space-y-8">
          {/* 제1조 목적 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제1조 (목적)</h2>
            <p className="text-gray-700 leading-relaxed">
              본 약관은 승리의 공식(이하 "회사")이 제공하는 면접 준비 서비스(이하 "서비스")의 이용과 관련하여 
              회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          {/* 제2조 용어의 정의 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제2조 (용어의 정의)</h2>
            <div className="space-y-2 text-gray-700">
              <p>1. "서비스"란 회사가 제공하는 면접 질문 생성 및 관련 서비스를 의미합니다.</p>
              <p>2. "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 받는 회원을 말합니다.</p>
              <p>3. "토큰"이란 서비스 이용을 위해 구매하는 디지털 사용권을 의미합니다.</p>
            </div>
          </section>

          {/* 제3조 토큰 시스템 및 결제 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제3조 (토큰 시스템 및 결제)</h2>
            
            <div className="space-y-6 text-gray-700">
              <div>
                <h3 className="text-lg font-semibold mb-3">1. 토큰 사용 단가</h3>
                <div className="space-y-1">
                  <p>• 질문지(30문항) 생성 1회: 3토큰</p>
                  <p>• 답변지(30문항) 생성 1회: 6토큰</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">2. 토큰 가격</h3>
                <p>• 1토큰 = 9,000원 (부가세 포함)</p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">3. 토큰 구매 옵션</h3>
                <div className="space-y-1">
                  <p>• 구매 가능 수량: 3, 5, 10, 20, 50, 100 토큰</p>
                  <p>• 대량 구매 시 할인 혜택이 적용됩니다</p>
                </div>
              </div>
            </div>
          </section>

          {/* 제4조 환불 및 취소 정책 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제4조 (환불 및 취소 정책)</h2>
            
            <div className="space-y-6 text-gray-700">
              <div>
                <h3 className="text-lg font-semibold mb-3">1. 토큰 환불 정책</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">결제 후 7일 이내</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li><strong>미사용 토큰:</strong> 전액 환불</li>
                      <li><strong>일부 사용 토큰:</strong> 부분 환불</li>
                    </ul>
                    
                    <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium text-sm mb-2">환불 계산 공식</p>
                      <p className="text-sm mb-2">
                        <code className="bg-white px-2 py-1 rounded">환불액 = 결제금액 – (사용토큰수 × 9,000원)</code>
                      </p>
                      <ul className="text-sm space-y-1">
                        <li>• 번들 할인을 받았더라도 사용분은 항상 정가(9,000원/토큰)로 차감</li>
                        <li>• 계산 결과가 0 미만이면 환불액 0원 (추가 청구 없음)</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">결제 후 7일 경과</h4>
                    <p>환불 불가 (디지털 사용권 관행 준용)</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">2. 환불 예외 사항</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>보너스/프로모션 토큰:</strong> 환불 대상 제외 (환불 시 유상 토큰부터 차감)</li>
                  <li><strong>중복·오류 결제:</strong> 확인 즉시 전액 환불</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">3. 토큰 유효기간</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>구매일로부터 12개월</li>
                  <li>만료 토큰은 소멸·환불 불가</li>
                  <li>만료 30일, 7일 전 알림 발송</li>
                </ul>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2">환불 계산 예시</h4>
                <p className="text-sm">
                  20토큰 번들 구매 (₩150,000) → 8토큰 사용 → 7일 내 환불 요청<br/>
                  환불액 = 150,000 – (8 × 9,000) = <strong>₩78,000</strong>
                </p>
              </div>
            </div>
          </section>

          {/* 제5조 서비스 이용 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제5조 (서비스 이용)</h2>
            <div className="space-y-2 text-gray-700">
              <p>1. 이용자는 본 약관과 관련 법령을 준수하여 서비스를 이용해야 합니다.</p>
              <p>2. 회사는 서비스의 안정적 제공을 위해 필요한 경우 서비스를 일시 중단할 수 있습니다.</p>
              <p>3. 토큰은 양도, 전매, 현금화할 수 없습니다.</p>
            </div>
          </section>

          {/* 제6조 면책조항 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제6조 (면책조항)</h2>
            <div className="space-y-2 text-gray-700">
              <p>1. 회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인한 서비스 중단에 대해 책임지지 않습니다.</p>
              <p>2. 회사는 이용자가 서비스를 이용하여 얻은 정보로 인한 손해에 대해 책임지지 않습니다.</p>
              <p>3. 회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임지지 않습니다.</p>
            </div>
          </section>

          {/* 제7조 약관의 변경 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제7조 (약관의 변경)</h2>
            <p className="text-gray-700">
              회사는 필요한 경우 본 약관을 변경할 수 있으며, 변경된 약관은 이메일(business.jhjung@gmail.com)을 통해 
              공지한 후 7일이 경과한 날부터 효력을 발생합니다.
            </p>
          </section>

          {/* 부칙 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">부칙</h2>
            <p className="text-gray-700">
              본 약관은 2025년 9월 9일부터 시행됩니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}