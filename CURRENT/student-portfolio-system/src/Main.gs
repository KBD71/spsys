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

/**
 * 내 기록 조회 함수
 * @param {string} studentId - 학번
 * @returns {Object} 조회 결과
 */
function getMyRecords(studentId) {
  try {
    if (!studentId) {
      return {
        success: false,
        message: '학번을 입력해주세요.'
      };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 학생의 반 정보 조회
    const studentSheet = ss.getSheetByName('학생명단_전체');
    if (!studentSheet) {
      return {
        success: false,
        message: '학생명단 시트를 찾을 수 없습니다.'
      };
    }

    const studentData = studentSheet.getDataRange().getValues();
    const student = studentData.find((row, idx) => idx > 0 && row[0] === studentId);
    
    if (!student) {
      return {
        success: false,
        message: '학생을 찾을 수 없습니다.'
      };
    }

    const studentClass = student[2]; // 학생의 반 정보
    
    // "공개" 시트 읽기
    const publicSheet = ss.getSheetByName('공개');
    if (!publicSheet) {
      return {
        success: true,
        records: []
      };
    }

    const publicData = publicSheet.getDataRange().getValues();
    if (publicData.length < 2) {
      return {
        success: true,
        records: []
      };
    }

    const records = [];

    // 각 공개된 시트 처리 (2행부터)
    for (let i = 1; i < publicData.length; i++) {
      const row = publicData[i];
      const isPublic = row[0] === true || row[0] === 'TRUE' || row[0] === 'Y';
      const sheetName = row[1];
      const targetClass = row[2] || '전체'; // 대상반 (기본값: 전체)

      if (!isPublic || !sheetName) continue;

      // 반별 필터링 체크
      if (!isClassAllowedGS(studentClass, targetClass)) continue;

      // 시스템 시트 제외
      if (sheetName === '학생명단_전체' || sheetName === '과제설정' ||
          sheetName === '평가항목설정' || sheetName === '공개') continue;

      try {
        const targetSheet = ss.getSheetByName(sheetName);
        if (!targetSheet) continue;

        const sheetData = targetSheet.getDataRange().getValues();
        if (sheetData.length < 2) continue;

        const headers = sheetData[0];

        // 학번 컬럼 찾기
        const studentIdColIndex = headers.indexOf('학번');
        if (studentIdColIndex === -1) continue;

        // "공개컬럼" 컬럼 찾기
        const publicColumnIndex = headers.indexOf('공개컬럼');

        // 공개컬럼 수집
        const publicColumns = [];
        if (publicColumnIndex !== -1) {
          for (let rowIdx = 1; rowIdx < sheetData.length; rowIdx++) {
            const colValue = sheetData[rowIdx][publicColumnIndex];
            if (colValue && colValue.toString().trim()) {
              publicColumns.push(colValue.toString().trim());
            }
          }
        }

        // 학생 행 찾기
        const studentRow = sheetData.find((row, idx) => idx > 0 && row[studentIdColIndex] === studentId);
        if (!studentRow) continue;

        // 공개컬럼이 지정되지 않은 경우 학번/반/이름 제외한 모든 컬럼 표시
        let data = {};

        if (publicColumns.length === 0) {
          // 모든 데이터 컬럼 표시 (학번, 반, 이름, 학생피드백, 제출일시, 공개컬럼 제외)
          headers.forEach((header, index) => {
            if (header !== '학번' && header !== '반' && header !== '이름' &&
                header !== '학생피드백' && header !== '제출일시' && header !== '공개컬럼' &&
                header !== '건의사항') {
              data[header] = studentRow[index] || '';
            }
          });
        } else {
          // 지정된 공개컬럼만 표시 (건의사항 제외)
          publicColumns.forEach(colName => {
            if (colName !== '건의사항') {
              const colIndex = headers.indexOf(colName);
              if (colIndex !== -1) {
                data[colName] = studentRow[colIndex] || '';
              }
            }
          });
        }

        // 학생피드백 확인
        const feedbackIndex = headers.indexOf('학생피드백');
        const hasFeedback = feedbackIndex !== -1;
        const feedbackValue = hasFeedback ? (studentRow[feedbackIndex] || '') : '';

        // 건의사항 확인
        const suggestionIndex = headers.indexOf('건의사항');
        const hasSuggestion = suggestionIndex !== -1;
        const suggestionValue = hasSuggestion ? (studentRow[suggestionIndex] || '') : '';

        records.push({
          sheetName: sheetName,
          data: data,
          hasFeedback: hasFeedback,
          feedback: feedbackValue,
          hasSuggestion: hasSuggestion,
          suggestion: suggestionValue
        });

      } catch (error) {
        console.log(`Warning: Could not read sheet ${sheetName}: ${error.message}`);
        continue;
      }
    }

    return {
      success: true,
      records: records
    };

  } catch (error) {
    Logger.log(`내 기록 조회 오류: ${error.message}`);
    return {
      success: false,
      message: '내 기록 조회 실패: ' + error.message
    };
  }
}

/**
 * 건의사항 저장 함수
 * @param {string} studentId - 학번
 * @param {string} sheetName - 시트명
 * @param {string} suggestion - 건의사항
 * @returns {Object} 저장 결과
 */
function saveSuggestion(studentId, sheetName, suggestion) {
  try {
    if (!studentId || !sheetName || suggestion === undefined) {
      return {
        success: false,
        message: '필수 파라미터가 누락되었습니다.'
      };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const targetSheet = ss.getSheetByName(sheetName);

    if (!targetSheet) {
      return {
        success: false,
        message: '시트를 찾을 수 없습니다.'
      };
    }

    const sheetData = targetSheet.getDataRange().getValues();
    if (sheetData.length < 2) {
      return {
        success: false,
        message: '시트 데이터를 찾을 수 없습니다.'
      };
    }

    const headers = sheetData[0];

    // 학번 컬럼과 건의사항 컬럼 찾기
    const studentIdColIndex = headers.indexOf('학번');
    const suggestionColIndex = headers.indexOf('건의사항');

    if (studentIdColIndex === -1) {
      return {
        success: false,
        message: '학번 컬럼을 찾을 수 없습니다.'
      };
    }

    if (suggestionColIndex === -1) {
      return {
        success: false,
        message: '건의사항 컬럼을 찾을 수 없습니다.'
      };
    }

    // 학생 행 찾기
    let studentRowIndex = -1;
    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][studentIdColIndex] === studentId) {
        studentRowIndex = i + 1; // 1-based index for Google Sheets
        break;
      }
    }

    if (studentRowIndex === -1) {
      return {
        success: false,
        message: '학생 데이터를 찾을 수 없습니다.'
      };
    }

    // 건의사항 업데이트
    targetSheet.getRange(studentRowIndex, suggestionColIndex + 1).setValue(suggestion);

    return {
      success: true,
      message: '건의사항이 저장되었습니다.'
    };

  } catch (error) {
    Logger.log(`건의사항 저장 오류: ${error.message}`);
    return {
      success: false,
      message: '건의사항 저장 실패: ' + error.message
    };
  }
}

/**
 * 반별 접근 권한 확인 (Apps Script 버전)
 * @param {string} studentClass - 학생의 반 (예: "1-1", "2-3")
 * @param {string} targetClass - 대상반 설정 (예: "전체", "1학년", "1-1,1-2")
 * @returns {boolean} 접근 가능 여부
 */
function isClassAllowedGS(studentClass, targetClass) {
  if (!targetClass || targetClass === '전체') {
    return true; // 전체 공개
  }

  // 학년별 필터링 (예: "1학년", "2학년")
  if (targetClass.indexOf('학년') !== -1) {
    const targetGrade = targetClass.replace('학년', '');
    const studentGrade = studentClass.split('-')[0];
    return studentGrade === targetGrade;
  }

  // 특정 반 목록 (예: "1-1,1-2,2-1")
  const allowedClasses = targetClass.split(',');
  for (let i = 0; i < allowedClasses.length; i++) {
    if (allowedClasses[i].trim() === studentClass) {
      return true;
    }
  }
  
  return false;
}

// ==================== 평가 시스템 함수 ====================

/**
 * 평가항목 목록 조회
 * @param {string} teacherClass - 교사 담당 반 (선택사항)
 * @returns {Object} 평가항목 목록
 */
function getEvaluations(teacherClass) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const evaluationSheet = ss.getSheetByName('평가항목설정');
    
    if (!evaluationSheet) {
      return {
        success: true,
        evaluations: []
      };
    }

    const data = evaluationSheet.getDataRange().getValues();
    if (data.length < 2) {
      return {
        success: true,
        evaluations: []
      };
    }

    const evaluations = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      const evaluation = {
        id: row[0],
        name: row[1],
        description: row[2],
        type: row[3],
        totalPoints: parseInt(row[4]) || 0,
        targetClass: row[5],
        createdDate: row[6],
        status: row[7]
      };

      // 교사 담당 반 필터링
      if (teacherClass && !isClassAllowedGS(teacherClass, evaluation.targetClass)) {
        continue;
      }

      // 활성 상태만 조회
      if (evaluation.status === '활성') {
        evaluations.push(evaluation);
      }
    }

    return {
      success: true,
      evaluations: evaluations
    };

  } catch (error) {
    Logger.log(`평가항목 조회 오류: ${error.message}`);
    return {
      success: false,
      message: '평가항목 조회 실패: ' + error.message
    };
  }
}

/**
 * 새 평가항목 생성
 * @param {Object} evaluationData - 평가항목 데이터
 * @returns {Object} 생성 결과
 */
function createEvaluation(evaluationData) {
  try {
    const { name, description, type, totalPoints, targetClass, items } = evaluationData;

    if (!name || !type || !totalPoints || !targetClass) {
      return {
        success: false,
        message: '필수 항목을 모두 입력해주세요.'
      };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 평가항목설정 시트 생성 (없으면)
    let evaluationSheet = ss.getSheetByName('평가항목설정');
    if (!evaluationSheet) {
      evaluationSheet = ss.insertSheet('평가항목설정');
      evaluationSheet.getRange(1, 1, 1, 8).setValues([
        ['평가ID', '평가명', '설명', '평가유형', '총배점', '대상반', '생성일', '상태']
      ]);
    }

    // 평가ID 생성
    const lastRow = evaluationSheet.getLastRow();
    const evaluationId = 'E' + String(lastRow).padStart(3, '0');

    // 평가항목 추가
    evaluationSheet.appendRow([
      evaluationId,
      name,
      description || '',
      type,
      totalPoints,
      targetClass,
      new Date().toISOString().split('T')[0],
      '활성'
    ]);

    // 세부항목 추가
    if (items && items.length > 0) {
      let detailSheet = ss.getSheetByName('평가세부항목');
      if (!detailSheet) {
        detailSheet = ss.insertSheet('평가세부항목');
        detailSheet.getRange(1, 1, 1, 6).setValues([
          ['항목ID', '평가ID', '항목명', '배점', '평가기준', '순서']
        ]);
      }

      items.forEach((item, index) => {
        const itemId = `I${evaluationId.substring(1)}${String(index + 1).padStart(2, '0')}`;
        detailSheet.appendRow([
          itemId,
          evaluationId,
          item.name,
          item.points,
          item.criteria || '',
          index + 1
        ]);
      });
    }

    return {
      success: true,
      message: '평가항목이 생성되었습니다.',
      evaluationId: evaluationId
    };

  } catch (error) {
    Logger.log(`평가항목 생성 오류: ${error.message}`);
    return {
      success: false,
      message: '평가항목 생성 실패: ' + error.message
    };
  }
}

/**
 * 평가 대상 학생 및 기존 결과 조회
 * @param {string} evaluationId - 평가ID
 * @returns {Object} 평가 대상 및 기존 결과
 */
function getEvaluationTargets(evaluationId) {
  try {
    if (!evaluationId) {
      return {
        success: false,
        message: '평가ID가 필요합니다.'
      };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 평가항목 정보 조회
    const evaluationSheet = ss.getSheetByName('평가항목설정');
    if (!evaluationSheet) {
      return {
        success: false,
        message: '평가항목설정 시트를 찾을 수 없습니다.'
      };
    }

    const evaluationData = evaluationSheet.getDataRange().getValues();
    let evaluation = null;
    
    for (let i = 1; i < evaluationData.length; i++) {
      if (evaluationData[i][0] === evaluationId) {
        evaluation = {
          id: evaluationData[i][0],
          name: evaluationData[i][1],
          description: evaluationData[i][2],
          type: evaluationData[i][3],
          totalPoints: parseInt(evaluationData[i][4]) || 0,
          targetClass: evaluationData[i][5]
        };
        break;
      }
    }

    if (!evaluation) {
      return {
        success: false,
        message: '평가항목을 찾을 수 없습니다.'
      };
    }

    // 세부항목 조회
    const detailSheet = ss.getSheetByName('평가세부항목');
    const items = [];
    
    if (detailSheet) {
      const detailData = detailSheet.getDataRange().getValues();
      for (let i = 1; i < detailData.length; i++) {
        const row = detailData[i];
        if (row[1] === evaluationId) {
          items.push({
            itemId: row[0],
            name: row[2],
            points: parseInt(row[3]) || 0,
            criteria: row[4],
            order: parseInt(row[5]) || 0
          });
        }
      }
      items.sort((a, b) => a.order - b.order);
    }

    // 대상 학생 목록
    const studentSheet = ss.getSheetByName('학생명단_전체');
    const studentData = studentSheet.getDataRange().getValues();
    const targetStudents = [];

    for (let i = 1; i < studentData.length; i++) {
      const row = studentData[i];
      const studentClass = row[2];
      
      if (isClassAllowedGS(studentClass, evaluation.targetClass)) {
        targetStudents.push({
          studentId: row[0],
          name: row[1],
          class: row[2]
        });
      }
    }

    // 기존 평가 결과
    const resultSheet = ss.getSheetByName('평가결과');
    const existingResults = {};
    
    if (resultSheet) {
      const resultData = resultSheet.getDataRange().getValues();
      for (let i = 1; i < resultData.length; i++) {
        const row = resultData[i];
        const studentId = row[1];
        const itemId = row[3];
        
        if (row[2] === evaluationId) { // 해당 평가의 결과만
          if (!existingResults[studentId]) {
            existingResults[studentId] = {};
          }
          existingResults[studentId][itemId] = {
            score: parseFloat(row[4]) || 0,
            comment: row[5] || ''
          };
        }
      }
    }

    return {
      success: true,
      evaluation: evaluation,
      items: items,
      students: targetStudents,
      existingResults: existingResults
    };

  } catch (error) {
    Logger.log(`평가 대상 조회 오류: ${error.message}`);
    return {
      success: false,
      message: '평가 대상 조회 실패: ' + error.message
    };
  }
}

/**
 * 평가 결과 저장
 * @param {Object} resultData - 평가 결과 데이터
 * @returns {Object} 저장 결과
 */
function saveEvaluationResults(resultData) {
  try {
    const { evaluationId, results, teacherName } = resultData;

    if (!evaluationId || !results || !Array.isArray(results)) {
      return {
        success: false,
        message: '필수 데이터가 누락되었습니다.'
      };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 평가결과 시트 생성 (없으면)
    let resultSheet = ss.getSheetByName('평가결과');
    if (!resultSheet) {
      resultSheet = ss.insertSheet('평가결과');
      resultSheet.getRange(1, 1, 1, 8).setValues([
        ['결과ID', '학번', '평가ID', '항목ID', '점수', '교사코멘트', '평가일', '평가자']
      ]);
    }

    const today = new Date().toISOString().split('T')[0];
    
    // 기존 결과 삭제 (해당 평가ID)
    const existingData = resultSheet.getDataRange().getValues();
    const filteredData = existingData.filter((row, index) => {
      if (index === 0) return true; // 헤더 유지
      return row[2] !== evaluationId; // 해당 평가ID 제외
    });

    // 시트 클리어 후 필터된 데이터 복원
    resultSheet.clear();
    if (filteredData.length > 0) {
      resultSheet.getRange(1, 1, filteredData.length, 8).setValues(filteredData);
    }

    // 새 결과 추가
    let resultCounter = filteredData.length;
    let savedCount = 0;

    results.forEach(result => {
      const { studentId, itemId, score, comment } = result;
      
      if (score !== undefined && score !== null && score !== '') {
        const resultId = 'R' + String(++resultCounter).padStart(3, '0');
        
        resultSheet.appendRow([
          resultId,
          studentId,
          evaluationId,
          itemId,
          score,
          comment || '',
          today,
          teacherName || ''
        ]);
        
        savedCount++;
      }
    });

    return {
      success: true,
      message: '평가 결과가 저장되었습니다.',
      savedCount: savedCount
    };

  } catch (error) {
    Logger.log(`평가 결과 저장 오류: ${error.message}`);
    return {
      success: false,
      message: '평가 결과 저장 실패: ' + error.message
    };
  }
}

/**
 * 학생 개인 평가 결과 조회
 * @param {string} studentId - 학번
 * @returns {Object} 학생 평가 결과
 */
function getMyEvaluations(studentId) {
  try {
    if (!studentId) {
      return {
        success: false,
        message: '학번이 필요합니다.'
      };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 평가 결과 조회
    const resultSheet = ss.getSheetByName('평가결과');
    if (!resultSheet) {
      return {
        success: true,
        evaluations: []
      };
    }

    const resultData = resultSheet.getDataRange().getValues();
    const studentResults = [];
    
    for (let i = 1; i < resultData.length; i++) {
      const row = resultData[i];
      if (row[1] === studentId) { // 학번 매칭
        studentResults.push({
          evaluationId: row[2],
          itemId: row[3],
          score: parseFloat(row[4]) || 0,
          comment: row[5] || '',
          evaluateDate: row[6] || ''
        });
      }
    }

    // 평가항목 및 세부항목 정보 수집
    const evaluationSheet = ss.getSheetByName('평가항목설정');
    const detailSheet = ss.getSheetByName('평가세부항목');
    
    const evaluations = {};
    const items = {};

    // 평가항목 정보
    if (evaluationSheet) {
      const evaluationData = evaluationSheet.getDataRange().getValues();
      for (let i = 1; i < evaluationData.length; i++) {
        const row = evaluationData[i];
        evaluations[row[0]] = {
          name: row[1],
          description: row[2],
          type: row[3],
          totalPoints: parseInt(row[4]) || 0
        };
      }
    }

    // 세부항목 정보
    if (detailSheet) {
      const detailData = detailSheet.getDataRange().getValues();
      for (let i = 1; i < detailData.length; i++) {
        const row = detailData[i];
        items[row[0]] = {
          evaluationId: row[1],
          name: row[2],
          points: parseInt(row[3]) || 0
        };
      }
    }

    // 결과 데이터 정리
    const myEvaluations = {};
    
    studentResults.forEach(result => {
      const { evaluationId, itemId, score, comment, evaluateDate } = result;
      
      if (!myEvaluations[evaluationId]) {
        myEvaluations[evaluationId] = {
          ...evaluations[evaluationId],
          items: [],
          totalScore: 0,
          maxScore: 0,
          evaluateDate: evaluateDate
        };
      }

      if (items[itemId]) {
        myEvaluations[evaluationId].items.push({
          name: items[itemId].name,
          score: score,
          maxPoints: items[itemId].points,
          comment: comment
        });
        myEvaluations[evaluationId].totalScore += score;
        myEvaluations[evaluationId].maxScore += items[itemId].points;
      }
    });

    return {
      success: true,
      evaluations: Object.values(myEvaluations)
    };

  } catch (error) {
    Logger.log(`개인 평가 결과 조회 오류: ${error.message}`);
    return {
      success: false,
      message: '평가 결과 조회 실패: ' + error.message
    };
  }
}

/**
 * 평가 시스템 시트 자동 생성 함수
 * @returns {Object} 생성 결과
 */
function createEvaluationSheets() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const results = [];

    // 1. 평가항목설정 시트 생성
    let evaluationSheet = ss.getSheetByName('평가항목설정');
    if (!evaluationSheet) {
      evaluationSheet = ss.insertSheet('평가항목설정');
      evaluationSheet.getRange(1, 1, 1, 8).setValues([
        ['평가ID', '평가명', '설명', '평가유형', '총배점', '대상반', '생성일', '상태']
      ]);
      
      // 헤더 스타일링
      const headerRange = evaluationSheet.getRange(1, 1, 1, 8);
      headerRange.setBackground('#667eea');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');
      
      // 컬럼 너비 조정
      evaluationSheet.setColumnWidth(1, 80);  // 평가ID
      evaluationSheet.setColumnWidth(2, 150); // 평가명
      evaluationSheet.setColumnWidth(3, 200); // 설명
      evaluationSheet.setColumnWidth(4, 100); // 평가유형
      evaluationSheet.setColumnWidth(5, 80);  // 총배점
      evaluationSheet.setColumnWidth(6, 100); // 대상반
      evaluationSheet.setColumnWidth(7, 100); // 생성일
      evaluationSheet.setColumnWidth(8, 80);  // 상태
      
      // 샘플 데이터 추가
      evaluationSheet.getRange(2, 1, 2, 8).setValues([
        ['E001', '1학기 중간고사', '국어/수학/영어', '지필평가', 300, '1학년', '2025-10-02', '활성'],
        ['E002', '발표수행평가', '개인발표 평가', '수행평가', 20, '전체', '2025-10-02', '활성']
      ]);
      
      results.push('✅ 평가항목설정 시트 생성 완료');
    } else {
      results.push('ℹ️ 평가항목설정 시트 이미 존재');
    }

    // 2. 평가세부항목 시트 생성
    let detailSheet = ss.getSheetByName('평가세부항목');
    if (!detailSheet) {
      detailSheet = ss.insertSheet('평가세부항목');
      detailSheet.getRange(1, 1, 1, 6).setValues([
        ['항목ID', '평가ID', '항목명', '배점', '평가기준', '순서']
      ]);
      
      // 헤더 스타일링
      const headerRange = detailSheet.getRange(1, 1, 1, 6);
      headerRange.setBackground('#667eea');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');
      
      // 컬럼 너비 조정
      detailSheet.setColumnWidth(1, 100); // 항목ID
      detailSheet.setColumnWidth(2, 80);  // 평가ID
      detailSheet.setColumnWidth(3, 150); // 항목명
      detailSheet.setColumnWidth(4, 80);  // 배점
      detailSheet.setColumnWidth(5, 200); // 평가기준
      detailSheet.setColumnWidth(6, 80);  // 순서
      
      // 샘플 데이터 추가
      detailSheet.getRange(2, 1, 6, 6).setValues([
        ['I00101', 'E001', '국어', 100, '객관식 50점, 주관식 50점', 1],
        ['I00102', 'E001', '수학', 100, '객관식 60점, 서술형 40점', 2],
        ['I00103', 'E001', '영어', 100, '듣기 30점, 문법 70점', 3],
        ['I00201', 'E002', '발표내용', 10, '논리성, 창의성', 1],
        ['I00202', 'E002', '발표태도', 10, '자세, 목소리, 시간', 2]
      ]);
      
      results.push('✅ 평가세부항목 시트 생성 완료');
    } else {
      results.push('ℹ️ 평가세부항목 시트 이미 존재');
    }

    // 3. 평가결과 시트 생성
    let resultSheet = ss.getSheetByName('평가결과');
    if (!resultSheet) {
      resultSheet = ss.insertSheet('평가결과');
      resultSheet.getRange(1, 1, 1, 8).setValues([
        ['결과ID', '학번', '평가ID', '항목ID', '점수', '교사코멘트', '평가일', '평가자']
      ]);
      
      // 헤더 스타일링
      const headerRange = resultSheet.getRange(1, 1, 1, 8);
      headerRange.setBackground('#667eea');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');
      
      // 컬럼 너비 조정
      resultSheet.setColumnWidth(1, 80);  // 결과ID
      resultSheet.setColumnWidth(2, 80);  // 학번
      resultSheet.setColumnWidth(3, 80);  // 평가ID
      resultSheet.setColumnWidth(4, 100); // 항목ID
      resultSheet.setColumnWidth(5, 80);  // 점수
      resultSheet.setColumnWidth(6, 200); // 교사코멘트
      resultSheet.setColumnWidth(7, 100); // 평가일
      resultSheet.setColumnWidth(8, 100); // 평가자
      
      // 샘플 데이터 추가 (첫 번째 학생만)
      const studentSheet = ss.getSheetByName('학생명단_전체');
      if (studentSheet) {
        const studentData = studentSheet.getDataRange().getValues();
        if (studentData.length > 1) {
          const firstStudentId = studentData[1][0]; // 첫 번째 학생 학번
          
          resultSheet.getRange(2, 1, 5, 8).setValues([
            ['R001', firstStudentId, 'E001', 'I00101', 85, '문학 이해도 우수', '2025-10-02', '김국어'],
            ['R002', firstStudentId, 'E001', 'I00102', 92, '계산 실수 주의', '2025-10-02', '박수학'],
            ['R003', firstStudentId, 'E001', 'I00103', 88, '발음이 좋음', '2025-10-02', '이영어'],
            ['R004', firstStudentId, 'E002', 'I00201', 9, '발표 내용 충실', '2025-10-03', '정선생'],
            ['R005', firstStudentId, 'E002', 'I00202', 8, '목소리 크기 조절 필요', '2025-10-03', '정선생']
          ]);
        }
      }
      
      results.push('✅ 평가결과 시트 생성 완료');
    } else {
      results.push('ℹ️ 평가결과 시트 이미 존재');
    }

    // 4. 평가통계 시트 생성 (선택)
    let statsSheet = ss.getSheetByName('평가통계');
    if (!statsSheet) {
      statsSheet = ss.insertSheet('평가통계');
      statsSheet.getRange(1, 1, 1, 8).setValues([
        ['통계ID', '평가ID', '반', '평균점수', '최고점', '최저점', '표준편차', '계산일']
      ]);
      
      // 헤더 스타일링
      const headerRange = statsSheet.getRange(1, 1, 1, 8);
      headerRange.setBackground('#667eea');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');
      
      // 컬럼 너비 조정
      statsSheet.setColumnWidth(1, 80);  // 통계ID
      statsSheet.setColumnWidth(2, 80);  // 평가ID
      statsSheet.setColumnWidth(3, 80);  // 반
      statsSheet.setColumnWidth(4, 100); // 평균점수
      statsSheet.setColumnWidth(5, 80);  // 최고점
      statsSheet.setColumnWidth(6, 80);  // 최저점
      statsSheet.setColumnWidth(7, 100); // 표준편차
      statsSheet.setColumnWidth(8, 100); // 계산일
      
      results.push('✅ 평가통계 시트 생성 완료');
    } else {
      results.push('ℹ️ 평가통계 시트 이미 존재');
    }

    // 5. 공개 시트에 대상반 컬럼 추가 (Phase 3용)
    const publicSheet = ss.getSheetByName('공개');
    if (publicSheet) {
      const headers = publicSheet.getRange(1, 1, 1, publicSheet.getLastColumn()).getValues()[0];
      if (!headers.includes('대상반')) {
        // 대상반 컬럼 추가
        const lastCol = publicSheet.getLastColumn();
        publicSheet.getRange(1, lastCol + 1).setValue('대상반');
        
        // 기존 데이터에 기본값 '전체' 추가
        const lastRow = publicSheet.getLastRow();
        if (lastRow > 1) {
          const defaultValues = Array(lastRow - 1).fill(['전체']);
          publicSheet.getRange(2, lastCol + 1, lastRow - 1, 1).setValues(defaultValues);
        }
        
        results.push('✅ 공개 시트에 대상반 컬럼 추가 완료');
      } else {
        results.push('ℹ️ 공개 시트 대상반 컬럼 이미 존재');
      }
    }

    // 결과 로그 출력
    Logger.log('=== 평가 시스템 시트 생성 결과 ===');
    results.forEach(result => Logger.log(result));
    Logger.log('==============================');

    return {
      success: true,
      message: '평가 시스템 시트 생성이 완료되었습니다.',
      results: results
    };

  } catch (error) {
    Logger.log(`평가 시스템 시트 생성 오류: ${error.message}`);
    return {
      success: false,
      message: '평가 시스템 시트 생성 실패: ' + error.message,
      error: error.message
    };
  }
}

/**
 * 평가 시스템 초기화 및 테스트 함수
 */
function initializeEvaluationSystem() {
  Logger.log('=== 평가 시스템 초기화 시작 ===');
  
  // 1. 시트 생성
  const createResult = createEvaluationSheets();
  Logger.log('시트 생성 결과:', createResult.message);
  
  if (!createResult.success) {
    Logger.log('❌ 시트 생성 실패:', createResult.error);
    return;
  }
  
  // 2. 기능 테스트
  Logger.log('\n--- 기능 테스트 시작 ---');
  
  // 평가항목 조회 테스트
  const evaluationsResult = getEvaluations();
  Logger.log('✅ 평가항목 조회 테스트:', evaluationsResult.success ? '성공' : '실패');
  Logger.log('   조회된 평가 수:', evaluationsResult.evaluations?.length || 0);
  
  // 평가 대상 조회 테스트
  if (evaluationsResult.evaluations && evaluationsResult.evaluations.length > 0) {
    const firstEvalId = evaluationsResult.evaluations[0].id;
    const targetsResult = getEvaluationTargets(firstEvalId);
    Logger.log('✅ 평가 대상 조회 테스트:', targetsResult.success ? '성공' : '실패');
    Logger.log('   대상 학생 수:', targetsResult.students?.length || 0);
  }
  
  // 학생 평가 결과 조회 테스트
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const studentSheet = ss.getSheetByName('학생명단_전체');
  if (studentSheet) {
    const studentData = studentSheet.getDataRange().getValues();
    if (studentData.length > 1) {
      const firstStudentId = studentData[1][0];
      const myEvalResult = getMyEvaluations(firstStudentId);
      Logger.log('✅ 학생 평가 결과 조회 테스트:', myEvalResult.success ? '성공' : '실패');
      Logger.log('   조회된 평가 수:', myEvalResult.evaluations?.length || 0);
    }
  }
  
  Logger.log('--- 기능 테스트 완료 ---');
  Logger.log('\n=== 평가 시스템 초기화 완료 ===');
  Logger.log('\n🎉 이제 웹앱에서 평가 시스템을 사용할 수 있습니다!');
  Logger.log('교사 비밀번호: teacher2025!');
}

/**
 * 메뉴 시트 생성 및 관리 시스템
 */
function createMenuSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let menuSheet = ss.getSheetByName('메뉴');
    
    if (menuSheet) {
      Logger.log('ℹ️ 메뉴 시트가 이미 존재합니다. 기존 시트를 업데이트합니다.');
    } else {
      menuSheet = ss.insertSheet('메뉴', 0); // 첫 번째 위치에 생성
      Logger.log('✅ 메뉴 시트 생성 완료');
    }

    // 시트 내용 클리어
    menuSheet.clear();
    
    // 1. 헤더 및 제목
    menuSheet.getRange('A1:H1').merge().setValue('🎓 학생 포트폴리오 시스템 - 관리 메뉴');
    menuSheet.getRange('A1').setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
    menuSheet.getRange('A1').setBackground('#667eea').setFontColor('white');
    
    // 2. 관리자 설정 섹션
    menuSheet.getRange('A3').setValue('👤 관리자 설정').setFontSize(14).setFontWeight('bold').setBackground('#e3f2fd');
    menuSheet.getRange('A3:H3').setBackground('#e3f2fd');
    
    const adminData = [
      ['항목', '값', '설명', '마지막 수정일'],
      ['관리자 ID', 'admin', '교사용 로그인 아이디', new Date().toISOString().split('T')[0]],
      ['관리자 비밀번호', 'teacher2025!', '교사용 로그인 비밀번호', new Date().toISOString().split('T')[0]],
      ['시스템 상태', '활성', '전체 시스템 가동 상태', new Date().toISOString().split('T')[0]]
    ];
    
    menuSheet.getRange(4, 1, adminData.length, 4).setValues(adminData);
    menuSheet.getRange('A4:D4').setFontWeight('bold').setBackground('#f5f5f5');
    
    // 3. 시트 관리 섹션
    menuSheet.getRange('A9').setValue('📊 시트 관리').setFontSize(14).setFontWeight('bold').setBackground('#e8f5e8');
    menuSheet.getRange('A9:H9').setBackground('#e8f5e8');
    
    const sheetData = [
      ['시트명', '상태', '설명', '마지막 업데이트', '액션'],
      ['학생명단_전체', '필수', '전체 학생 명단', '', '👁️ 보기'],
      ['과제목록', '필수', '과제 관리', '', '👁️ 보기'],
      ['제출현황', '필수', '과제 제출 상황', '', '👁️ 보기'],
      ['공개', '필수', '공개 기록 설정', '', '👁️ 보기'],
      ['평가항목설정', '평가용', '평가 항목 관리', '', '👁️ 보기'],
      ['평가세부항목', '평가용', '평가 세부 기준', '', '👁️ 보기'],
      ['평가결과', '평가용', '평가 점수 저장', '', '👁️ 보기'],
      ['평가통계', '평가용', '평가 통계 데이터', '', '👁️ 보기']
    ];
    
    menuSheet.getRange(10, 1, sheetData.length, 5).setValues(sheetData);
    menuSheet.getRange('A10:E10').setFontWeight('bold').setBackground('#f5f5f5');
    
    // 4. 시스템 액션 섹션
    menuSheet.getRange('A20').setValue('⚙️ 시스템 액션').setFontSize(14).setFontWeight('bold').setBackground('#fff3e0');
    menuSheet.getRange('A20:H20').setBackground('#fff3e0');
    
    const actionData = [
      ['액션', '설명', '실행'],
      ['시트 초기화', '모든 필수 시트 생성', '🔄 실행'],
      ['평가 시스템 초기화', '평가 관련 시트 생성', '🔄 실행'],
      ['샘플 데이터 생성', '테스트용 데이터 추가', '🔄 실행'],
      ['백업 생성', '현재 데이터 백업', '💾 실행'],
      ['시스템 상태 확인', '전체 시스템 점검', '🔍 실행']
    ];
    
    menuSheet.getRange(21, 1, actionData.length, 3).setValues(actionData);
    menuSheet.getRange('A21:C21').setFontWeight('bold').setBackground('#f5f5f5');
    
    // 5. 통계 정보 섹션
    menuSheet.getRange('A28').setValue('📈 시스템 통계').setFontSize(14).setFontWeight('bold').setBackground('#f3e5f5');
    menuSheet.getRange('A28:H28').setBackground('#f3e5f5');
    
    // 실시간 통계 계산
    const stats = getSystemStats();
    const statsData = [
      ['항목', '값', '마지막 업데이트'],
      ['총 학생 수', stats.totalStudents, new Date().toLocaleString('ko-KR')],
      ['총 과제 수', stats.totalAssignments, new Date().toLocaleString('ko-KR')],
      ['총 평가 수', stats.totalEvaluations, new Date().toLocaleString('ko-KR')],
      ['제출 완료 수', stats.totalSubmissions, new Date().toLocaleString('ko-KR')],
      ['시트 개수', stats.totalSheets, new Date().toLocaleString('ko-KR')]
    ];
    
    menuSheet.getRange(29, 1, statsData.length, 3).setValues(statsData);
    menuSheet.getRange('A29:C29').setFontWeight('bold').setBackground('#f5f5f5');
    
    // 6. 컬럼 너비 조정
    menuSheet.setColumnWidth(1, 150); // 시트명/항목
    menuSheet.setColumnWidth(2, 120); // 상태/값
    menuSheet.setColumnWidth(3, 200); // 설명
    menuSheet.setColumnWidth(4, 150); // 날짜
    menuSheet.setColumnWidth(5, 100); // 액션
    
    // 7. 테두리 추가
    const lastRow = 34;
    menuSheet.getRange(1, 1, lastRow, 5).setBorder(true, true, true, true, true, true);
    
    // 8. 조건부 서식 (상태별 색상)
    const statusRange = menuSheet.getRange('B11:B18');
    const rule1 = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('필수')
      .setBackground('#c8e6c9')
      .setRanges([statusRange])
      .build();
    const rule2 = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('평가용')
      .setBackground('#e1bee7')
      .setRanges([statusRange])
      .build();
    
    menuSheet.setConditionalFormatRules([rule1, rule2]);
    
    Logger.log('✅ 메뉴 시트 생성/업데이트 완료');
    return {
      success: true,
      message: '메뉴 시트가 성공적으로 생성되었습니다.'
    };
    
  } catch (error) {
    Logger.log(`❌ 메뉴 시트 생성 오류: ${error.message}`);
    return {
      success: false,
      message: '메뉴 시트 생성 실패: ' + error.message
    };
  }
}

/**
 * 시스템 통계 정보 수집
 */
function getSystemStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stats = {
    totalStudents: 0,
    totalAssignments: 0,
    totalEvaluations: 0,
    totalSubmissions: 0,
    totalSheets: ss.getSheets().length
  };
  
  try {
    // 학생 수
    const studentSheet = ss.getSheetByName('학생명단_전체');
    if (studentSheet) {
      stats.totalStudents = Math.max(0, studentSheet.getLastRow() - 1);
    }
    
    // 과제 수
    const assignmentSheet = ss.getSheetByName('과제목록');
    if (assignmentSheet) {
      stats.totalAssignments = Math.max(0, assignmentSheet.getLastRow() - 1);
    }
    
    // 평가 수
    const evaluationSheet = ss.getSheetByName('평가항목설정');
    if (evaluationSheet) {
      stats.totalEvaluations = Math.max(0, evaluationSheet.getLastRow() - 1);
    }
    
    // 제출 수
    const submissionSheet = ss.getSheetByName('제출현황');
    if (submissionSheet) {
      stats.totalSubmissions = Math.max(0, submissionSheet.getLastRow() - 1);
    }
    
  } catch (error) {
    Logger.log(`통계 수집 오류: ${error.message}`);
  }
  
  return stats;
}

// ==================== 빠른 실행용 래퍼 함수들 ====================

/**
 * 메뉴 시트 생성 실행용 래퍼
 */
function runCreateMenuSheet() {
  Logger.log('=== 메뉴 시트 생성 시작 ===');
  
  const result = createMenuSheet();
  
  if (result.success) {
    Logger.log('✅ 메뉴 시트 생성 성공!');
    Logger.log('Google Sheets로 이동하여 "메뉴" 시트를 확인하세요.');
    
    // 통계도 함께 업데이트
    const statsResult = updateMenuStats();
    Logger.log('통계 업데이트:', statsResult.success ? '✅ 성공' : '❌ 실패');
    
  } else {
    Logger.log('❌ 메뉴 시트 생성 실패:', result.message);
  }
  
  Logger.log('=== 메뉴 시트 생성 완료 ===');
  return result;
}

/**
 * 전체 시스템 초기화 실행용 래퍼  
 */
function runFullInitialization() {
  Logger.log('🚀 전체 시스템 초기화를 시작합니다...');
  
  const result = initializeFullSystem();
  
  if (result.success) {
    Logger.log('🎉 전체 시스템 초기화 완료!');
    Logger.log('📋 생성된 내용:');
    Logger.log('   • 메뉴 시트 (관리자 설정, 시트 관리, 통계)');
    Logger.log('   • 평가 시스템 시트들 (평가항목설정, 평가세부항목, 평가결과, 평가통계)');
    Logger.log('   • 샘플 데이터 및 포맷팅');
    Logger.log('');
    Logger.log('🔐 교사 로그인 정보:');
    Logger.log('   ID: admin (또는 teacher)');
    Logger.log('   비밀번호: teacher2025! (메뉴 시트에서 변경 가능)');
    Logger.log('');
    Logger.log('📝 다음 단계:');
    Logger.log('   1. Google Sheets로 이동');
    Logger.log('   2. "메뉴" 시트 확인');
    Logger.log('   3. 관리자 ID/비밀번호 필요시 수정');
    Logger.log('   4. 웹앱에서 교사 모드 테스트');
    
  } else {
    Logger.log('❌ 전체 시스템 초기화 실패:', result.message);
    Logger.log('오류 내용을 확인하고 다시 시도해주세요.');
  }
  
  return result;
}

/**
 * 시스템 상태 확인용 함수
 */
function checkSystemStatus() {
  Logger.log('=== 시스템 상태 확인 ===');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  Logger.log(`📊 총 시트 개수: ${sheets.length}`);
  Logger.log('📋 시트 목록:');
  
  const requiredSheets = ['메뉴', '학생명단_전체', '과제목록', '제출현황', '공개', '평가항목설정', '평가세부항목', '평가결과', '평가통계'];
  const existingSheets = sheets.map(sheet => sheet.getName());
  
  requiredSheets.forEach(sheetName => {
    const exists = existingSheets.includes(sheetName);
    Logger.log(`   ${exists ? '✅' : '❌'} ${sheetName}`);
  });
  
  // 통계 정보
  const stats = getSystemStats();
  Logger.log('\n📈 현재 통계:');
  Logger.log(`   • 학생 수: ${stats.totalStudents}`);
  Logger.log(`   • 과제 수: ${stats.totalAssignments}`);
  Logger.log(`   • 평가 수: ${stats.totalEvaluations}`);
  Logger.log(`   • 제출 수: ${stats.totalSubmissions}`);
  
  // 메뉴 시트 관리자 정보 확인
  const menuSheet = ss.getSheetByName('메뉴');
  if (menuSheet) {
    try {
      const adminId = menuSheet.getRange('B5').getValue();
      const adminPasswordSet = !!menuSheet.getRange('B6').getValue();
      Logger.log('\n🔐 관리자 정보:');
      Logger.log(`   • ID: ${adminId || '설정되지 않음'}`);
      Logger.log(`   • 비밀번호: ${adminPasswordSet ? '설정됨' : '설정되지 않음'}`);
    } catch (error) {
      Logger.log('⚠️ 메뉴 시트 관리자 정보 읽기 오류:', error.message);
    }
  }
  
  Logger.log('=== 상태 확인 완료 ===');
}

/**
 * 메뉴에서 시트로 이동하는 함수
 */
function navigateToSheet(sheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return {
        success: false,
        message: `시트 '${sheetName}'을 찾을 수 없습니다.`
      };
    }
    
    // 시트 활성화
    sheet.activate();
    
    return {
      success: true,
      message: `시트 '${sheetName}'로 이동했습니다.`
    };
    
  } catch (error) {
    Logger.log(`시트 이동 오류: ${error.message}`);
    return {
      success: false,
      message: '시트 이동 실패: ' + error.message
    };
  }
}

/**
 * 관리자 정보 조회 (교사용 로그인에서 사용)
 */
function getAdminCredentials() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const menuSheet = ss.getSheetByName('메뉴');
    
    if (!menuSheet) {
      return {
        success: false,
        message: '메뉴 시트를 찾을 수 없습니다.',
        credentials: null
      };
    }
    
    // 관리자 정보 읽기 (B5: ID, B6: Password)
    const adminId = menuSheet.getRange('B5').getValue() || 'admin';
    const adminPassword = menuSheet.getRange('B6').getValue() || 'teacher2025!';
    
    return {
      success: true,
      credentials: {
        id: adminId,
        password: adminPassword
      }
    };
    
  } catch (error) {
    Logger.log(`관리자 정보 조회 오류: ${error.message}`);
    return {
      success: false,
      message: '관리자 정보 조회 실패: ' + error.message,
      credentials: null
    };
  }
}

/**
 * 관리자 정보 업데이트
 */
function updateAdminCredentials(newId, newPassword) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const menuSheet = ss.getSheetByName('메뉴');
    
    if (!menuSheet) {
      return {
        success: false,
        message: '메뉴 시트를 찾을 수 없습니다.'
      };
    }
    
    // 관리자 정보 업데이트
    if (newId) {
      menuSheet.getRange('B5').setValue(newId);
      menuSheet.getRange('D5').setValue(new Date().toISOString().split('T')[0]);
    }
    
    if (newPassword) {
      menuSheet.getRange('B6').setValue(newPassword);
      menuSheet.getRange('D6').setValue(new Date().toISOString().split('T')[0]);
    }
    
    return {
      success: true,
      message: '관리자 정보가 업데이트되었습니다.'
    };
    
  } catch (error) {
    Logger.log(`관리자 정보 업데이트 오류: ${error.message}`);
    return {
      success: false,
      message: '관리자 정보 업데이트 실패: ' + error.message
    };
  }
}

/**
 * 전체 시스템 초기화 (메뉴에서 실행)
 */
function initializeFullSystem() {
  Logger.log('=== 전체 시스템 초기화 시작 ===');
  
  const results = [];
  
  try {
    // 1. 메뉴 시트 생성
    const menuResult = createMenuSheet();
    results.push(`메뉴 시트: ${menuResult.success ? '✅' : '❌'} ${menuResult.message}`);
    
    // 2. 평가 시스템 시트 생성
    const evalResult = createEvaluationSheets();
    results.push(`평가 시스템: ${evalResult.success ? '✅' : '❌'} ${evalResult.message}`);
    
    // 3. 통계 업데이트
    const statsResult = updateMenuStats();
    results.push(`통계 업데이트: ${statsResult.success ? '✅' : '❌'} ${statsResult.message}`);
    
    // 결과 로그 출력
    Logger.log('=== 전체 시스템 초기화 결과 ===');
    results.forEach(result => Logger.log(result));
    Logger.log('===========================');
    
    return {
      success: true,
      message: '전체 시스템 초기화가 완료되었습니다.',
      results: results
    };
    
  } catch (error) {
    Logger.log(`전체 시스템 초기화 오류: ${error.message}`);
    return {
      success: false,
      message: '전체 시스템 초기화 실패: ' + error.message,
      results: results
    };
  }
}

/**
 * 메뉴 시트의 통계 정보 업데이트
 */
function updateMenuStats() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const menuSheet = ss.getSheetByName('메뉴');
    
    if (!menuSheet) {
      return {
        success: false,
        message: '메뉴 시트를 찾을 수 없습니다.'
      };
    }
    
    // 새로운 통계 계산
    const stats = getSystemStats();
    const currentTime = new Date().toLocaleString('ko-KR');
    
    // 통계 업데이트
    menuSheet.getRange('B30').setValue(stats.totalStudents);
    menuSheet.getRange('C30').setValue(currentTime);
    
    menuSheet.getRange('B31').setValue(stats.totalAssignments);
    menuSheet.getRange('C31').setValue(currentTime);
    
    menuSheet.getRange('B32').setValue(stats.totalEvaluations);
    menuSheet.getRange('C32').setValue(currentTime);
    
    menuSheet.getRange('B33').setValue(stats.totalSubmissions);
    menuSheet.getRange('C33').setValue(currentTime);
    
    menuSheet.getRange('B34').setValue(stats.totalSheets);
    menuSheet.getRange('C34').setValue(currentTime);
    
    return {
      success: true,
      message: '통계가 업데이트되었습니다.'
    };
    
  } catch (error) {
    Logger.log(`통계 업데이트 오류: ${error.message}`);
    return {
      success: false,
      message: '통계 업데이트 실패: ' + error.message
    };
  }
}
