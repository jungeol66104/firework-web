export default function PrivacyPolicyPage() {
  return (
    <div className="flex justify-center items-start">
      <div className="w-full max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">개인정보 처리방침</h1>
        
        <div className="prose max-w-none space-y-8">
          {/* 제1조 개인정보의 처리 목적 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제1조 (개인정보의 처리 목적)</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              승리의 공식(이하 "회사")은 다음의 목적을 위하여 개인정보를 처리합니다. 
              처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 
              이용 목적이 변경되는 경우에는 개인정보보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>회원 가입 및 관리</li>
              <li>서비스 제공 및 계약의 이행</li>
              <li>요금 결제 및 정산</li>
              <li>고객 상담 및 불만 처리</li>
              <li>서비스 개선 및 통계 분석</li>
            </ul>
          </section>

          {/* 제2조 개인정보의 처리 및 보유 기간 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제2조 (개인정보의 처리 및 보유 기간)</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 
                동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
              </p>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">보유 기간</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>회원 정보: 회원 탈퇴 시까지</li>
                  <li>결제 정보: 전자상거래법에 따라 5년</li>
                  <li>서비스 이용 기록: 통신비밀보호법에 따라 3개월</li>
                  <li>불만 또는 분쟁 처리 기록: 전자상거래법에 따라 3년</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 제3조 처리하는 개인정보의 항목 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제3조 (처리하는 개인정보의 항목)</h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="text-lg font-medium mb-2">필수 정보</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>이메일 주소</li>
                  <li>비밀번호 (암호화 저장)</li>
                  <li>이름</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">자동 수집 정보</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>서비스 이용 기록</li>
                  <li>접속 로그</li>
                  <li>쿠키</li>
                  <li>접속 IP 정보</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">결제 시 추가 수집</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>결제 정보 (토스페이먼츠를 통해 처리, 회사는 결제 완료 정보만 보관)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 제4조 개인정보의 제3자 제공 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제4조 (개인정보의 제3자 제공)</h2>
            <div className="space-y-4 text-gray-700">
              <p>회사는 원칙적으로 정보주체의 개인정보를 제3자에게 제공하지 않습니다.</p>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">예외적 제공 사례</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>토스페이먼츠: 결제 처리를 위한 최소한의 정보</li>
                  <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 제5조 정보주체의 권리·의무 및 행사방법 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제5조 (정보주체의 권리·의무 및 행사방법)</h2>
            <div className="space-y-4 text-gray-700">
              <p>정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
              
              <ul className="list-disc pl-6 space-y-1">
                <li>개인정보 처리현황 통지요구</li>
                <li>개인정보 열람요구</li>
                <li>개인정보 정정·삭제요구</li>
                <li>개인정보 처리정지요구</li>
              </ul>

              <div className="bg-blue-50 p-4 rounded mt-4">
                <p className="text-sm">
                  <strong>권리 행사 방법:</strong> 이메일(business.jhjung@gmail.com) 또는 서비스 내 고객센터를 통해 요청하실 수 있습니다.
                </p>
              </div>
            </div>
          </section>

          {/* 제6조 개인정보의 안전성 확보조치 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제6조 (개인정보의 안전성 확보조치)</h2>
            <div className="space-y-2 text-gray-700">
              <p>회사는 개인정보보호법 제29조에 따라 다음과 같이 안전성 확보에 필요한 기술적/관리적 및 물리적 조치를 하고 있습니다.</p>
              
              <ul className="list-disc pl-6 space-y-1 mt-4">
                <li>개인정보 취급 직원의 최소화 및 교육</li>
                <li>개인정보에 대한 접근 제한</li>
                <li>개인정보의 암호화</li>
                <li>해킹 등에 대비한 기술적 대책</li>
                <li>개인정보처리시스템 등의 접근권한 관리</li>
                <li>접속기록의 보관 및 위변조 방지</li>
              </ul>
            </div>
          </section>

          {/* 제7조 개인정보보호책임자 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제7조 (개인정보보호책임자)</h2>
            <div className="space-y-4 text-gray-700">
              <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보보호책임자를 지정하고 있습니다.</p>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">개인정보보호책임자</h3>
                <ul className="space-y-1">
                  <li>성명: 정재훈</li>
                  <li>직책: 대표</li>
                  <li>연락처: 010-3095-1077</li>
                  <li>이메일: business.jhjung@gmail.com</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 제8조 개인정보 처리방침 변경 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">제8조 (개인정보 처리방침 변경)</h2>
            <p className="text-gray-700">
              이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 이메일(business.jhjung@gmail.com)을 통하여 고지할 것입니다.
            </p>
          </section>

          {/* 부칙 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">부칙</h2>
            <p className="text-gray-700">
              본 방침은 2025년 9월 9일부터 시행됩니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}