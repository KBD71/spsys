/**
 * 메인 웹앱 진입점
 * Google Apps Script 웹앱의 doGet() 함수 정의
 */

/**
 * 웹앱 요청 처리 함수
 * @param {Object} e - 요청 이벤트 객체
 * @returns {HtmlOutput} HTML 출력
 */
function doGet(e) {
  try {
    // WebApp.html 파일을 로드하여 반환
    const template = HtmlService.createTemplateFromFile('WebApp');

    // HTML 출력 생성
    const html = template.evaluate()
      .setTitle('학생 포트폴리오 시스템')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');

    return html;

  } catch (error) {
    Logger.log(`doGet 오류: ${error.message}`);

    // 에러 페이지 반환
    return HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>오류</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .error-container {
              text-align: center;
              padding: 40px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 20px;
              backdrop-filter: blur(10px);
            }
            h1 { font-size: 3rem; margin: 0 0 20px 0; }
            p { font-size: 1.2rem; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>⚠️</h1>
            <p>웹앱 로드 중 오류가 발생했습니다.</p>
            <p>관리자에게 문의하세요.</p>
          </div>
        </body>
      </html>
    `).setTitle('오류');
  }
}

/**
 * 외부 파일을 포함하는 헬퍼 함수
 * @param {string} filename - 포함할 파일명
 * @returns {string} 파일 내용
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 현재 사용자 정보를 반환하는 함수
 * @returns {Object} 사용자 정보
 */
function getCurrentUser() {
  try {
    const user = Session.getActiveUser();
    const email = user.getEmail();

    return {
      email: email,
      domain: email.split('@')[1] || '',
      isAuthenticated: email ? true : false
    };
  } catch (error) {
    Logger.log(`사용자 정보 가져오기 오류: ${error.message}`);
    return {
      email: '',
      domain: '',
      isAuthenticated: false
    };
  }
}

/**
 * 시스템 상태를 확인하는 함수
 * @returns {Object} 시스템 상태
 */
function checkSystemStatus() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);

    if (!sheet) {
      return {
        status: 'error',
        message: '학생명단 시트를 찾을 수 없습니다.'
      };
    }

    const lastRow = sheet.getLastRow();
    const studentCount = lastRow > 1 ? lastRow - 1 : 0;

    return {
      status: 'ok',
      message: '시스템이 정상 작동 중입니다.',
      studentCount: studentCount,
      sheetName: sheet.getName(),
      lastUpdate: new Date()
    };

  } catch (error) {
    Logger.log(`시스템 상태 확인 오류: ${error.message}`);
    return {
      status: 'error',
      message: '시스템 상태 확인 중 오류가 발생했습니다.',
      error: error.message
    };
  }
}

/**
 * 웹앱 초기화 함수 (설치 시 한 번 실행)
 */
function initializeWebApp() {
  try {
    Logger.log('=== 웹앱 초기화 시작 ===');

    // 1. 비밀번호 컬럼 설정
    setupPasswordColumns();

    // 2. 시스템 정보 출력
    getSystemInfo();

    // 3. 보안 테스트
    testSecurity();

    Logger.log('=== 웹앱 초기화 완료 ===');

    return {
      success: true,
      message: '웹앱이 성공적으로 초기화되었습니다.'
    };

  } catch (error) {
    Logger.log(`웹앱 초기화 오류: ${error.message}`);
    return {
      success: false,
      message: '웹앱 초기화 중 오류가 발생했습니다.',
      error: error.message
    };
  }
}

/**
 * 전체 시스템 테스트 함수
 */
function runFullSystemTest() {
  Logger.log('=== 전체 시스템 테스트 시작 ===\n');

  // 1. 설정 테스트
  Logger.log('1. 설정 테스트:');
  testConfig();

  Logger.log('\n' + '='.repeat(50) + '\n');

  // 2. 보안 기능 테스트
  Logger.log('2. 보안 기능 테스트:');
  testSecurity();

  Logger.log('\n' + '='.repeat(50) + '\n');

  // 3. 시스템 정보 출력
  Logger.log('3. 시스템 정보:');
  getSystemInfo();

  Logger.log('\n' + '='.repeat(50) + '\n');

  // 4. 시스템 상태 확인
  Logger.log('4. 시스템 상태 확인:');
  const status = checkSystemStatus();
  Logger.log(JSON.stringify(status, null, 2));

  Logger.log('\n=== 전체 시스템 테스트 완료 ===');
}

/**
 * 웹앱 배포 전 체크리스트 검증
 */
function validateDeploymentChecklist() {
  Logger.log('=== 배포 전 체크리스트 검증 ===\n');

  const checks = [];

  // 1. Salt 변경 확인
  const defaultSalt = 'CHANGE_THIS_TO_RANDOM_STRING_IN_PRODUCTION';
  const currentSalt = SECURITY_CONFIG.SALT;

  checks.push({
    item: 'Salt 변경',
    passed: currentSalt !== defaultSalt,
    message: currentSalt === defaultSalt
      ? '❌ 기본 Salt를 사용 중입니다. 반드시 변경하세요!'
      : '✅ Salt가 변경되었습니다.'
  });

  // 2. 시트 존재 확인
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);

  checks.push({
    item: '학생명단 시트',
    passed: sheet !== null,
    message: sheet
      ? `✅ '${SHEET_NAMES.STUDENTS}' 시트가 존재합니다.`
      : `❌ '${SHEET_NAMES.STUDENTS}' 시트를 찾을 수 없습니다.`
  });

  // 3. 필수 컬럼 확인
  if (sheet) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const requiredColumns = ['학번', '비밀번호', '이름'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    checks.push({
      item: '필수 컬럼',
      passed: missingColumns.length === 0,
      message: missingColumns.length === 0
        ? '✅ 모든 필수 컬럼이 존재합니다.'
        : `❌ 누락된 컬럼: ${missingColumns.join(', ')}`
    });
  }

  // 4. 학생 데이터 확인
  if (sheet) {
    const studentCount = sheet.getLastRow() - 1;
    checks.push({
      item: '학생 데이터',
      passed: studentCount > 0,
      message: studentCount > 0
        ? `✅ ${studentCount}명의 학생 데이터가 있습니다.`
        : '⚠️ 학생 데이터가 없습니다.'
    });
  }

  // 5. WebApp.html 파일 확인
  try {
    const html = HtmlService.createTemplateFromFile('WebApp');
    checks.push({
      item: 'WebApp.html',
      passed: true,
      message: '✅ WebApp.html 파일이 존재합니다.'
    });
  } catch (error) {
    checks.push({
      item: 'WebApp.html',
      passed: false,
      message: '❌ WebApp.html 파일을 찾을 수 없습니다.'
    });
  }

  // 결과 출력
  Logger.log('검증 결과:\n');

  let allPassed = true;
  checks.forEach((check, index) => {
    Logger.log(`${index + 1}. ${check.item}: ${check.message}`);
    if (!check.passed) allPassed = false;
  });

  Logger.log('\n' + '='.repeat(50));

  if (allPassed) {
    Logger.log('\n✅ 모든 검증을 통과했습니다! 배포 준비가 완료되었습니다.');
  } else {
    Logger.log('\n❌ 일부 검증에 실패했습니다. 문제를 해결한 후 다시 확인하세요.');
  }

  Logger.log('\n=== 검증 완료 ===');

  return {
    allPassed: allPassed,
    checks: checks
  };
}
