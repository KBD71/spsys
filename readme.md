🎓 학생 포트폴리오 시스템 구축 가이드
1. 시스템 아키텍처 (System Architecture)
본 시스템은 Google Sheets를 데이터베이스로, Google Apps Script를 교사용 관리 도구로, 그리고 Vercel을 학생용 웹앱으로 사용하는 하이브리드(Hybrid) 아키텍처입니다.

Google Sheets (데이터베이스): 모든 학생 정보, 과제, 제출물을 저장하는 중앙 저장소입니다.

Google Apps Script (교사용 백엔드): 구글 시트 내에 내장되어, 교사가 사용하는 대시보드와 관리 기능(과제 생성/삭제 등)을 제공합니다.

Vercel (학생용 프론트엔드 + 백엔드): 학생이 접속하는 웹 UI와, 이 UI가 구글 시트와 통신할 때 사용하는 API 서버의 역할을 동시에 수행합니다.

2. 구축 1단계: Google Sheets 및 Apps Script 설정 (교사용)
2.1. Google Sheets 필수 시트 구조
먼저, 비어있는 새 Google 스프레드 시트를 생성하고, 아래 명세에 따라 총 5개의 시트를 준비합니다. 시트 이름과 헤더(첫 행)는 반드시 일치해야 합니다.

💡 Tip: 필수 시트 생성/초기화 메뉴를 실행하면 아래 시트들이 자동으로 생성됩니다.

시트 이름	역할	필수 헤더 (첫 번째 행)
메뉴	교사용 대시보드	Main.gs 스크립트가 동적으로 생성하므로 비워둡니다.
학생명단_전체	학생 계정 정보	학번, 반, 번호, 이름, 비밀번호
과제설정	과제 정보 마스터	공개, 과제ID, 과제명, 대상시트, 시작일, 마감일, 질문1 ~ 질문5
공개	결과/알림 공개 마스터	공개, 시트이름, 대상반
template	과제 시트 원본	학번, 반, 이름, 질문1 ~ 질문5, 제출일시, 공개컬럼

Sheets로 내보내기
핵심 규칙:
과제설정의 '공개' 체크박스: 학생의 '과제 목록'에 과제를 표시할지를 결정합니다.

공개의 '공개' 체크박스: 학생의 '교사 코멘트'나 '알림'에 해당 시트 내용을 표시할지를 결정합니다.

template 시트: 질문 헤더는 반드시 5개(질문1 ~ 질문5)를 모두 포함해야 합니다. 스크립트가 이 템플릿을 복사한 후 불필요한 질문 열을 삭제하는 방식으로 작동합니다.

과제 시트의 공개컬럼: 교사가 채점 후, 학생에게 보여주고 싶은 컬럼의 이름(예: 점수, 교사 피드백)을 이 컬럼 아래에 직접 입력해야 합니다.

2.2. Google Apps Script (Main.gs) 설정
교사가 구글 시트 내에서 모든 관리 작업을 할 수 있도록 Apps Script를 설정합니다.

Apps Script 편집기 열기:

준비된 구글 시트에서 확장 프로그램 > Apps Script로 이동합니다.

코드 붙여넣기:

기존의 코드.gs 파일 내용을 모두 지우고, 아래의 Main.gs 최종 코드 전체를 붙여넣습니다.

프로젝트 저장:

디스크(💾) 아이콘을 눌러 프로젝트를 저장합니다.

초기화 실행 (최초 1회):

상단 함수 목록에서 **initializeMinimalSystem**을 선택하고 '실행' 버튼을 누릅니다.

권한 승인 요청이 나타나면, 안내에 따라 권한을 허용합니다.

실행이 완료되면 시트에 메뉴 시트를 포함한 모든 필수 시트가 생성되고 대시보드가 그려집니다.

메뉴 확인:

구글 시트 창을 새로고침하면, 상단에 📋 포트폴리오 관리 메뉴가 나타납니다. 이제 이 메뉴를 통해 모든 교사용 기능을 사용할 수 있습니다.

Main.gs 최종 코드
JavaScript

/**
 * @OnlyCurrentDoc
 * 학생 포트폴리오 시스템 - 교사 관리 기능 (Vercel 하이브리드 - 최종 안정화 버전)
 */

// ==============================================
//  1. 메뉴 생성 및 사용자 인터페이스
// ==============================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📋 포트폴리오 관리')
    .addItem('➕ 새 과제 시트 생성', 'createAssignmentSheet')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('➡️ 바로가기')
      .addItem('🏠 대시보드 (메뉴)', 'goToMenu')
      .addItem('🧑‍🎓 학생명단', 'goToStudents')
      .addItem('📝 과제설정', 'goToAssignments')
      .addItem('📢 공개설정', 'goToPublic')
    )
    .addSeparator()
    .addItem('🔄 대시보드 새로고침', 'refreshDashboard')
    .addItem('🗑️ 시트 삭제', 'promptToDeleteSheet')
    .addSeparator()
    .addItem('⚙️ 필수 시트 생성/초기화', 'initializeMinimalSystem')
    .addToUi();
}

function goToMenu() { goToSheet('메뉴'); }
function goToStudents() { goToSheet('학생명단_전체'); }
function goToAssignments() { goToSheet('과제설정'); }
function goToPublic() { goToSheet('공개'); }

function goToSheet(sheetName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (sheet) sheet.activate();
    else SpreadsheetApp.getUi().alert('오류', `'${sheetName}' 시트를 찾을 수 없습니다.`, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { /* 오류 무시 */ }
}

function refreshDashboard() {
  const ui = SpreadsheetApp.getUi();
  updateDashboard();
  ui.alert('✅ 새로고침 완료', '대시보드가 최신 정보로 업데이트되었습니다.', ui.ButtonSet.OK);
}

// ... (이하 모든 Apps Script 코드는 이전 답변의 최종본과 동일합니다)
3. 구축 2단계: Vercel 웹앱 설정 (학생용)
학생이 사용하는 웹 UI와 API 서버를 설정합니다.

3.1. 프로젝트 파일 구조
로컬 컴퓨터에 아래와 같은 구조로 파일을 준비합니다.

student-portfolio-vercel/
├── api/
│   ├── login.js
│   ├── assignments.js
│   ├── assignment-detail.js
│   ├── submit-assignment.js
│   ├── my-records.js
│   └── change-password.js
├── index.html
├── package.json
└── .env.example
3.2. 프론트엔드 (index.html)
역할: 학생에게 보여지는 모든 화면(로그인, 대시보드, 과제 제출 등)을 담고 있는 싱글 페이지 애플리케이션(SPA) 입니다.

동작: JavaScript를 통해 api/ 폴더의 함수들을 호출하고, 응답받은 데이터를 화면에 동적으로 그려줍니다.

코드: 이전 답변에서 제공된 index.html 최종 코드 전체를 이 파일에 붙여넣습니다.

3.3. 백엔드 (API 서버리스 함수)
역할: api/ 폴더 안의 각 .js 파일은 Vercel에 의해 독립적인 API 엔드포인트로 배포되어, 프론트엔드의 요청에 따라 구글 시트의 데이터를 읽거나 쓰는 역할을 합니다.

코드: VERCEL 폴더에 있던 각 API 파일의 코드를 그대로 사용합니다. 단, 보안을 위해 api/login.js에서 교사용 로그인 로직은 제거된 버전을 사용해야 합니다.

API 핵심 동작:
API 파일	엔드포인트	역할 및 동작 방식
login.js	POST /api/login	학생명단_전체 시트와 대조하여 로그인 처리.
assignments.js	GET /api/assignments	과제설정 시트에서 '공개'된 과제 목록 반환.
assignment-detail.js	GET /api/assignment-detail	과제설정 시트에서 질문 목록과 기존 답변 반환.
submit-assignment.js	POST /api/submit-assignment	학생 답변을 해당 과제 시트에 기록.
my-records.js	GET /api/my-records	공개 시트의 설정에 따라 '코멘트'와 '알림' 데이터 반환.
change-password.js	POST /api/change-password	학생명단_전체 시트의 비밀번호 업데이트.

Sheets로 내보내기
4. 구축 3단계: 배포 및 연동
4.1. Google Cloud 설정
Google Cloud Console에서 새 프로젝트를 생성합니다.

Google Sheets API를 활성화합니다.

서비스 계정을 생성하고, JSON 키를 다운로드합니다. 이 키 파일은 Vercel 서버가 구글 시트에 접근할 때 필요한 인증서입니다.

4.2. Vercel 배포
로컬의 student-portfolio-vercel 프로젝트를 GitHub 저장소에 푸시(push)합니다.

Vercel에 가입하고, 해당 GitHub 저장소를 가져와 새 프로젝트를 생성합니다.

Vercel 프로젝트 설정의 Environment Variables(환경 변수) 에 아래 항목들을 등록합니다. (값은 다운로드한 JSON 키 파일과 구글 시트 URL을 참조)

GOOGLE_SERVICE_ACCOUNT_EMAIL: 서비스 계정 이메일

GOOGLE_PRIVATE_KEY: JSON 키의 private key

SPREADSHEET_ID: 구글 시트의 ID

배포를 진행합니다.

4.3. 최종 연동 확인
배포된 Vercel 웹앱 URL에 접속하여, 학생명단_전체 시트에 있는 학생 정보로 로그인을 테스트합니다.

구글 시트에서 포트폴리오 관리 > 새 과제 시트 생성 메뉴를 통해 새 과제를 만들고 과제설정 시트의 '공개'를 체크합니다.

학생용 웹앱을 새로고침하여 새 과제가 '과제 목록'에 나타나는지 확인합니다.
