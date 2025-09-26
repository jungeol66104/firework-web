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
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>"서비스"란 회사가 제공하는 면접 질문 생성 및 관련 서비스를 의미합니다.</li>
              <li>"이용자"란 본 약관에 따라 회사가 제공하는 서비스를 받는 회원을 말합니다.</li>
              <li>"토큰"이란 서비스 이용을 위해 구매하는 디지털 사용권(선불전자지급수단)을 의미합니다.</li>
            </ol>
          </section>

          {/* 제3조 토큰 시스템 및 결제 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제3조 (토큰 시스템 및 결제)</h2>
            
            <div className="space-y-6 text-gray-700">
              <div>
                <h3 className="text-lg font-semibold mb-3">1. 토큰 사용 단가 및 용도</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>토큰은 회사가 제공하는 면접 질문 생성 및 답변 생성 서비스를 이용하기 위한 목적으로 사용됩니다.</li>
                  <li>질문지(30문항) 생성 1회: 3토큰</li>
                  <li>답변지(30문항) 생성 1회: 6토큰</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">2. 토큰 가격</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>1토큰 = 9,000원 (부가세 포함)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">3. 토큰 구매 옵션 및 한도</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>구매 가능 수량: 3, 5, 10 토큰</li>
                  <li>대량 구매 시 할인 혜택이 적용됩니다</li>
                  <li>결제대행사(PG사) 및 카드사 정책에 따라 1회 최대 충전(결제) 가능 금액은 100,000원으로 제한됩니다. 이에 따라 10만원을 초과하는 토큰 묶음 상품의 구매가 제한될 수 있습니다.</li>
                  <li>카드사 정책에 따라 이용자별 월별 총 결제 금액이 일정 금액 이하로 제한될 수 있습니다.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">4. 결제 수단 제한</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>충전형 상품(토큰) 구매 시, 카카오페이, 네이버페이, 페이코, 토스페이를 제외한 기타 간편결제 서비스는 이용이 불가능합니다.</li>
                  <li>하나카드를 포함한 일부 카드사의 이용이 불가할 수 있습니다.</li>
                  <li>현금성 결제(계좌이체, 가상계좌) 사용이 제한될 수 있습니다.</li>
                </ul>
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
                  <ul className="list-disc pl-6 space-y-3">
                    <li>환불은 반드시 결제가 진행되었던 원래의 결제 수단으로 처리됩니다.</li>

                    <li>
                      결제 후 7일 이내
                      <ul className="list-disc pl-6 mt-2 space-y-1">
                        <li>미사용 토큰: 전액 환불</li>
                        <li>일부 사용 토큰: 아래 환불 계산 공식에 따라 부분 환불</li>
                      </ul>

                      <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm mb-2">환불 계산 공식 (결제 후 7일 이내)</p>
                        <p className="text-sm mb-2">
                          <code className="bg-white px-2 py-1 rounded">환불액 = 결제금액 – (사용토큰수 × 9,000원)</code>
                        </p>
                        <ul className="list-disc pl-6 text-sm space-y-2">
                          <li>번들 할인을 받았더라도 사용분은 항상 정가(9,000원/토큰)로 차감됩니다.</li>
                          <li>소수점 토큰 사용 시에도 동일한 공식 적용 (예: 2.3토큰 사용 시 20,700원 차감)</li>
                          <li>계산 결과가 0 미만이면 환불액은 0원이며, 추가 청구는 없습니다.</li>
                        </ul>
                      </div>
                    </li>

                    <li>
                      결제 후 7일 경과 및 유효기간(1년) 이내<br/>
                      미사용한 토큰에 한하여, 잔여 토큰 환산 금액의 10%를 환불 수수료로 공제한 후 환불이 가능합니다.
                    </li>
                  </ul>
                </div>
              </div>


              <div>
                <h3 className="text-lg font-semibold mb-3">3. 토큰 유효기간 및 환불가능기간</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>충전된 토큰의 이용기간은 결제시점으로부터 1년(12개월) 이내로 제한됩니다.</li>
                  <li>유효기간(1년)이 만료된 토큰은 자동으로 소멸되나, 이용자는 유효기간 만료 후 상법상 상사채권 소멸시효인 5년 이내에 회사에 미사용 토큰 잔액의 90%에 해당하는 금액의 반환을 청구할 수 있습니다.</li>
                  <li>회사는 토큰 만료 30일 전과 7일 전에 이용자에게 알림을 발송합니다.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">4. 환불 예외 사항</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>회사가 무상으로 지급한 보너스/프로모션 토큰은 환불 대상에서 제외됩니다. (환불 시 유상으로 구매한 토큰부터 차감됩니다.)</li>
                  <li>시스템 오류 등으로 인한 중복 결제 또는 오결제가 확인될 경우, 회사는 해당 금액을 전액 환불합니다.</li>
                </ul>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm mb-2">환불 계산 예시</p>
                <p className="text-sm">
                  (가정) 10토큰 번들 구매 (₩80,000) → 3토큰 사용 → 7일 내 환불 요청<br/>
                  환불액 = 80,000원 – (3토큰 × 9,000원) = ₩53,000
                </p>
              </div>
            </div>
          </section>

          {/* 제5조 서비스 이용 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제5조 (서비스 이용)</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>이용자는 본 약관과 관련 법령을 준수하여 서비스를 이용해야 합니다.</li>
              <li>회사는 서비스의 안정적 제공을 위해 필요한 경우 서비스를 일시 중단할 수 있습니다.</li>
              <li>토큰은 사용자 간 양도가 불가하며, 전매, 현금화할 수 없습니다.</li>
            </ol>
          </section>

          {/* 제6조 면책조항 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제6조 (면책조항)</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
              <li>회사는 이용자가 서비스를 이용하여 얻은 정보로 인한 손해에 대해 책임지지 않습니다.</li>
              <li>회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임지지 않습니다.</li>
            </ol>
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
              본 약관은 2025년 9월 26일부터 시행됩니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}