/**
 * 관리자 유틸리티 함수
 * 시스템 초기 설정 및 관리자 전용 기능 제공
 */

/**
 * 학생명단 시트에 비밀번호 관련 컬럼을 자동으로 추가하는 함수
 * 이미 존재하는 컬럼은 건너뛰고, 없는 컬럼만 추가
 */
function setupPasswordColumns() {
  try {
    Logger.log('=== 비밀번호 컬럼 설정 시작 ===');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);

    if (!sheet) {
      Logger.log(`오류: '${SHEET_NAMES.STUDENTS}' 시트를 찾을 수 없습니다.`);
      return;
    }

    const lastColumn = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

    Logger.log(`현재 컬럼 수: ${lastColumn}`);
    Logger.log(`현재 헤더: ${headers.join(', ')}`);

    // 추가할 컬럼 목록
    const columnsToAdd = [
      { name: '비밀번호변경일', description: '마지막 비밀번호 변경 일시' },
      { name: '변경횟수', description: '비밀번호 변경 총 횟수' }
    ];

    let addedCount = 0;

    columnsToAdd.forEach(column => {
      const columnIndex = headers.indexOf(column.name);

      if (columnIndex === -1) {
        // 컬럼이 없으면 추가
        const newColumnIndex = lastColumn + addedCount + 1;
        sheet.getRange(1, newColumnIndex).setValue(column.name);

        // 헤더 스타일 적용
        const headerCell = sheet.getRange(1, newColumnIndex);
        headerCell.setBackground('#667eea');
        headerCell.setFontColor('#ffffff');
        headerCell.setFontWeight('bold');
        headerCell.setHorizontalAlignment('center');

        Logger.log(`✓ '${column.name}' 컬럼 추가됨 (${column.description})`);
        addedCount++;
      } else {
        Logger.log(`- '${column.name}' 컬럼은 이미 존재함 (위치: ${columnIndex + 1})`);
      }
    });

    if (addedCount > 0) {
      Logger.log(`\n총 ${addedCount}개의 컬럼이 추가되었습니다.`);
    } else {
      Logger.log('\n필요한 모든 컬럼이 이미 존재합니다.');
    }

    Logger.log('=== 비밀번호 컬럼 설정 완료 ===');

  } catch (error) {
    Logger.log(`비밀번호 컬럼 설정 오류: ${error.message}`);
    throw error;
  }
}

/**
 * 관리자용 비밀번호 초기화 함수
 * 24시간 제한을 무시하고 강제로 비밀번호를 변경
 * @param {string} studentId - 학번
 * @param {string} newPassword - 새 비밀번호
 * @returns {Object} {success: boolean, message: string}
 */
function resetStudentPassword(studentId, newPassword) {
  try {
    Logger.log(`=== 관리자 비밀번호 초기화 시작 ===`);
    Logger.log(`학번: ${studentId}`);

    // 입력 검증
    if (!studentId || !newPassword) {
      return {
        success: false,
        message: '학번과 새 비밀번호를 입력해주세요.'
      };
    }

    const trimmedPassword = newPassword.trim();

    // 비밀번호 길이 검증
    if (trimmedPassword.length < PASSWORD_CONFIG.MIN_LENGTH) {
      return {
        success: false,
        message: `비밀번호는 최소 ${PASSWORD_CONFIG.MIN_LENGTH}자 이상이어야 합니다.`
      };
    }

    if (trimmedPassword.length > PASSWORD_CONFIG.MAX_LENGTH) {
      return {
        success: false,
        message: `비밀번호는 최대 ${PASSWORD_CONFIG.MAX_LENGTH}자까지 가능합니다.`
      };
    }

    // 학생 찾기
    const studentData = findStudentData(studentId);
    if (!studentData.found) {
      Logger.log(`학생을 찾을 수 없음 - 학번: ${studentId}`);
      return {
        success: false,
        message: '학생 정보를 찾을 수 없습니다.'
      };
    }

    // 비밀번호 업데이트 (제한 무시)
    updatePassword(studentData.row, trimmedPassword, studentData.changeCount);

    Logger.log(`비밀번호 초기화 성공 - 학번: ${studentId}, 학생: ${studentData.name}`);
    Logger.log('=== 관리자 비밀번호 초기화 완료 ===');

    return {
      success: true,
      message: `${studentData.name} 학생의 비밀번호가 초기화되었습니다.`
    };

  } catch (error) {
    Logger.log(`비밀번호 초기화 오류: ${error.message}`);
    return {
      success: false,
      message: '비밀번호 초기화 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 시스템 정보를 출력하는 함수
 * 학생 수, 컬럼 구조, 설정 정보 등을 로그로 출력
 */
function getSystemInfo() {
  try {
    Logger.log('=== 시스템 정보 ===\n');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);

    if (!sheet) {
      Logger.log(`오류: '${SHEET_NAMES.STUDENTS}' 시트를 찾을 수 없습니다.`);
      return;
    }

    // 기본 정보
    Logger.log('📊 기본 정보:');
    Logger.log(`  - 스프레드시트 이름: ${ss.getName()}`);
    Logger.log(`  - 스프레드시트 ID: ${ss.getId()}`);
    Logger.log(`  - 시트 이름: ${sheet.getName()}\n`);

    // 학생 데이터 정보
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    const studentCount = lastRow - 1; // 헤더 제외

    Logger.log('👥 학생 데이터:');
    Logger.log(`  - 총 학생 수: ${studentCount}명`);
    Logger.log(`  - 총 행 수: ${lastRow}행 (헤더 포함)`);
    Logger.log(`  - 총 컬럼 수: ${lastColumn}개\n`);

    // 컬럼 구조
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    Logger.log('📋 컬럼 구조:');
    headers.forEach((header, index) => {
      if (header) {
        Logger.log(`  ${index + 1}. ${header}`);
      }
    });
    Logger.log('');

    // 비밀번호 관련 컬럼 확인
    Logger.log('🔑 비밀번호 관련 컬럼:');
    const passwordCol = headers.indexOf('비밀번호');
    const lastChangeDateCol = headers.indexOf('비밀번호변경일');
    const changeCountCol = headers.indexOf('변경횟수');

    Logger.log(`  - 비밀번호: ${passwordCol !== -1 ? '✓ 존재' : '✗ 없음'} (위치: ${passwordCol + 1})`);
    Logger.log(`  - 비밀번호변경일: ${lastChangeDateCol !== -1 ? '✓ 존재' : '✗ 없음'} (위치: ${lastChangeDateCol + 1})`);
    Logger.log(`  - 변경횟수: ${changeCountCol !== -1 ? '✓ 존재' : '✗ 없음'} (위치: ${changeCountCol + 1})\n`);

    // 시스템 설정
    Logger.log('⚙️ 시스템 설정:');
    Logger.log(`  - 최소 비밀번호 길이: ${PASSWORD_CONFIG.MIN_LENGTH}자`);
    Logger.log(`  - 최대 비밀번호 길이: ${PASSWORD_CONFIG.MAX_LENGTH}자`);
    Logger.log(`  - 변경 제한 시간: ${PASSWORD_CONFIG.CHANGE_LIMIT_HOURS}시간`);
    Logger.log(`  - 타임존: ${SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone()}\n`);

    // 비밀번호 변경 통계
    if (changeCountCol !== -1 && studentCount > 0) {
      const changeCountData = sheet.getRange(2, changeCountCol + 1, studentCount, 1).getValues();
      let totalChanges = 0;
      let studentsWithChanges = 0;

      changeCountData.forEach(row => {
        const count = row[0] || 0;
        totalChanges += count;
        if (count > 0) studentsWithChanges++;
      });

      Logger.log('📈 비밀번호 변경 통계:');
      Logger.log(`  - 총 변경 횟수: ${totalChanges}회`);
      Logger.log(`  - 변경한 학생 수: ${studentsWithChanges}명`);
      Logger.log(`  - 평균 변경 횟수: ${(totalChanges / studentCount).toFixed(2)}회/학생\n`);
    }

    Logger.log('=== 시스템 정보 출력 완료 ===');

  } catch (error) {
    Logger.log(`시스템 정보 출력 오류: ${error.message}`);
  }
}

/**
 * 모든 관리 함수를 한 번에 실행하는 테스트 함수
 */
function runAdminTests() {
  Logger.log('=== 관리자 유틸리티 테스트 시작 ===\n');

  // 1. 시스템 정보 출력
  getSystemInfo();

  Logger.log('\n' + '='.repeat(50) + '\n');

  // 2. 비밀번호 컬럼 설정
  setupPasswordColumns();

  Logger.log('\n=== 관리자 유틸리티 테스트 완료 ===');
}
