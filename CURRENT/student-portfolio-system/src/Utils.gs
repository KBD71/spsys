/**
 * 유틸리티 함수 모음
 * 공통으로 사용되는 헬퍼 함수들
 */

/**
 * 모든 캐시를 초기화하는 함수
 */
function clearAllCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll(cache.getKeys());
    Logger.log('모든 캐시가 초기화되었습니다.');
    return {
      success: true,
      message: '모든 캐시가 초기화되었습니다.'
    };
  } catch (error) {
    Logger.log(`캐시 초기화 오류: ${error.message}`);
    return {
      success: false,
      message: '캐시 초기화 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 모든 Rate Limit 초기화
 */
function clearAllRateLimits() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const allProperties = scriptProperties.getProperties();

    let count = 0;
    for (const key in allProperties) {
      if (key.startsWith('ratelimit_')) {
        scriptProperties.deleteProperty(key);
        count++;
      }
    }

    Logger.log(`${count}개의 Rate Limit 기록이 초기화되었습니다.`);
    return {
      success: true,
      message: `${count}개의 Rate Limit 기록이 초기화되었습니다.`,
      count: count
    };
  } catch (error) {
    Logger.log(`Rate Limit 초기화 오류: ${error.message}`);
    return {
      success: false,
      message: 'Rate Limit 초기화 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 학생 데이터 백업 함수
 * @returns {Object} 백업 결과
 */
function backupStudentData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);

    if (!sourceSheet) {
      return {
        success: false,
        message: `${SHEET_NAMES.STUDENTS} 시트를 찾을 수 없습니다.`
      };
    }

    // 백업 시트 이름 생성 (날짜 포함)
    const now = new Date();
    const dateStr = Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMdd_HHmmss');
    const backupSheetName = `백업_${dateStr}`;

    // 시트 복사
    const backupSheet = sourceSheet.copyTo(ss);
    backupSheet.setName(backupSheetName);

    // 백업 시트를 맨 뒤로 이동
    ss.moveActiveSheet(ss.getNumSheets());

    Logger.log(`백업 완료: ${backupSheetName}`);
    return {
      success: true,
      message: `백업이 완료되었습니다: ${backupSheetName}`,
      sheetName: backupSheetName,
      timestamp: now
    };

  } catch (error) {
    Logger.log(`백업 오류: ${error.message}`);
    return {
      success: false,
      message: '백업 중 오류가 발생했습니다.',
      error: error.message
    };
  }
}

/**
 * 오래된 백업 시트 삭제
 * @param {number} daysToKeep - 보관할 일수 (기본: 30일)
 * @returns {Object} 삭제 결과
 */
function deleteOldBackups(daysToKeep = 30) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let deletedCount = 0;
    const deletedSheets = [];

    sheets.forEach(sheet => {
      const sheetName = sheet.getName();

      // 백업 시트인지 확인
      if (sheetName.startsWith('백업_')) {
        try {
          // 날짜 추출 (백업_YYYYMMDD_HHMMSS)
          const dateStr = sheetName.replace('백업_', '').substring(0, 8);
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1;
          const day = parseInt(dateStr.substring(6, 8));
          const backupDate = new Date(year, month, day);

          if (backupDate < cutoffDate) {
            ss.deleteSheet(sheet);
            deletedSheets.push(sheetName);
            deletedCount++;
          }
        } catch (error) {
          Logger.log(`시트 날짜 파싱 오류: ${sheetName} - ${error.message}`);
        }
      }
    });

    const message = deletedCount > 0
      ? `${deletedCount}개의 오래된 백업이 삭제되었습니다.`
      : '삭제할 오래된 백업이 없습니다.';

    Logger.log(message);
    return {
      success: true,
      message: message,
      deletedCount: deletedCount,
      deletedSheets: deletedSheets
    };

  } catch (error) {
    Logger.log(`백업 삭제 오류: ${error.message}`);
    return {
      success: false,
      message: '백업 삭제 중 오류가 발생했습니다.',
      error: error.message
    };
  }
}

/**
 * 학생 검색 함수
 * @param {string} query - 검색어 (학번, 이름, 반)
 * @returns {Array} 검색 결과
 */
function searchStudents(query) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);

    if (!sheet) {
      return {
        success: false,
        message: `${SHEET_NAMES.STUDENTS} 시트를 찾을 수 없습니다.`,
        results: []
      };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return {
        success: true,
        message: '데이터가 없습니다.',
        results: []
      };
    }

    const headers = data[0];
    const cols = COLUMN_NAMES;

    const studentIdCol = headers.indexOf(cols.STUDENT_ID);
    const nameCol = headers.indexOf(cols.NAME);
    const classCol = headers.indexOf(cols.CLASS);

    const results = [];
    const queryLower = query.toLowerCase();

    // 헤더 제외하고 검색
    for (let i = 1; i < data.length; i++) {
      const studentId = String(data[i][studentIdCol] || '').toLowerCase();
      const name = String(data[i][nameCol] || '').toLowerCase();
      const studentClass = String(data[i][classCol] || '').toLowerCase();

      if (studentId.includes(queryLower) ||
          name.includes(queryLower) ||
          studentClass.includes(queryLower)) {

        results.push({
          row: i + 1,
          studentId: data[i][studentIdCol],
          name: data[i][nameCol],
          class: data[i][classCol]
        });
      }
    }

    return {
      success: true,
      message: `${results.length}명의 학생을 찾았습니다.`,
      results: results,
      count: results.length
    };

  } catch (error) {
    Logger.log(`학생 검색 오류: ${error.message}`);
    return {
      success: false,
      message: '학생 검색 중 오류가 발생했습니다.',
      results: [],
      error: error.message
    };
  }
}

/**
 * 비밀번호 변경 통계 조회
 * @returns {Object} 통계 정보
 */
function getPasswordChangeStats() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);

    if (!sheet) {
      return {
        success: false,
        message: `${SHEET_NAMES.STUDENTS} 시트를 찾을 수 없습니다.`
      };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return {
        success: true,
        message: '데이터가 없습니다.',
        stats: {}
      };
    }

    const headers = data[0];
    const changeCountCol = headers.indexOf(COLUMN_NAMES.CHANGE_COUNT);
    const lastChangeDateCol = headers.indexOf(COLUMN_NAMES.LAST_CHANGE_DATE);

    const stats = {
      totalStudents: data.length - 1,
      studentsWithChanges: 0,
      totalChanges: 0,
      neverChanged: 0,
      changedOnce: 0,
      changedMultiple: 0,
      lastChanges: []
    };

    for (let i = 1; i < data.length; i++) {
      const changeCount = Number(data[i][changeCountCol]) || 0;
      stats.totalChanges += changeCount;

      if (changeCount === 0) {
        stats.neverChanged++;
      } else if (changeCount === 1) {
        stats.changedOnce++;
        stats.studentsWithChanges++;
      } else {
        stats.changedMultiple++;
        stats.studentsWithChanges++;
      }

      // 최근 변경 기록
      if (lastChangeDateCol !== -1 && data[i][lastChangeDateCol]) {
        stats.lastChanges.push({
          studentId: data[i][headers.indexOf(COLUMN_NAMES.STUDENT_ID)],
          name: data[i][headers.indexOf(COLUMN_NAMES.NAME)],
          lastChangeDate: data[i][lastChangeDateCol],
          changeCount: changeCount
        });
      }
    }

    // 최근 변경 순으로 정렬
    stats.lastChanges.sort((a, b) => new Date(b.lastChangeDate) - new Date(a.lastChangeDate));
    stats.lastChanges = stats.lastChanges.slice(0, 10); // 최근 10개만

    stats.averageChanges = (stats.totalChanges / stats.totalStudents).toFixed(2);

    return {
      success: true,
      message: '통계 조회 성공',
      stats: stats
    };

  } catch (error) {
    Logger.log(`통계 조회 오류: ${error.message}`);
    return {
      success: false,
      message: '통계 조회 중 오류가 발생했습니다.',
      error: error.message
    };
  }
}

/**
 * 일괄 비밀번호 초기화 (신중하게 사용)
 * @param {string} defaultPassword - 초기 비밀번호
 * @param {Array} studentIds - 대상 학번 배열 (비어있으면 전체)
 * @returns {Object} 초기화 결과
 */
function bulkResetPasswords(defaultPassword, studentIds = []) {
  try {
    if (!defaultPassword || defaultPassword.length < PASSWORD_CONFIG.MIN_LENGTH) {
      return {
        success: false,
        message: `초기 비밀번호는 최소 ${PASSWORD_CONFIG.MIN_LENGTH}자 이상이어야 합니다.`
      };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);

    if (!sheet) {
      return {
        success: false,
        message: `${SHEET_NAMES.STUDENTS} 시트를 찾을 수 없습니다.`
      };
    }

    const hashedPassword = hashPassword(defaultPassword);
    let resetCount = 0;
    const errors = [];

    if (studentIds.length === 0) {
      // 전체 초기화 (매우 위험!)
      Logger.log('⚠️ 전체 학생 비밀번호 초기화 시작...');

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const studentIdCol = headers.indexOf(COLUMN_NAMES.STUDENT_ID);

      for (let i = 1; i < data.length; i++) {
        const studentId = data[i][studentIdCol];
        const studentData = findStudentData(studentId);

        if (studentData.found) {
          try {
            updatePassword(studentData.row, hashedPassword, 0);
            resetCount++;
          } catch (error) {
            errors.push({ studentId: studentId, error: error.message });
          }
        }
      }

    } else {
      // 특정 학생만 초기화
      studentIds.forEach(studentId => {
        const studentData = findStudentData(studentId);

        if (studentData.found) {
          try {
            updatePassword(studentData.row, hashedPassword, 0);
            resetCount++;
          } catch (error) {
            errors.push({ studentId: studentId, error: error.message });
          }
        } else {
          errors.push({ studentId: studentId, error: '학생을 찾을 수 없음' });
        }
      });
    }

    const message = `${resetCount}명의 비밀번호가 초기화되었습니다.`;
    Logger.log(message);

    return {
      success: true,
      message: message,
      resetCount: resetCount,
      errors: errors
    };

  } catch (error) {
    Logger.log(`일괄 초기화 오류: ${error.message}`);
    return {
      success: false,
      message: '일괄 초기화 중 오류가 발생했습니다.',
      error: error.message
    };
  }
}

/**
 * 시스템 상태 진단
 * @returns {Object} 진단 결과
 */
function diagnoseSystem() {
  Logger.log('=== 시스템 진단 시작 ===\n');

  const diagnosis = {
    timestamp: new Date(),
    checks: [],
    issues: [],
    recommendations: []
  };

  try {
    // 1. 스프레드시트 확인
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    diagnosis.checks.push({
      category: '스프레드시트',
      item: '접근 가능',
      status: 'OK',
      detail: `ID: ${ss.getId()}`
    });

    // 2. 시트 확인
    const sheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);
    if (sheet) {
      diagnosis.checks.push({
        category: '시트',
        item: SHEET_NAMES.STUDENTS,
        status: 'OK',
        detail: `${sheet.getLastRow() - 1}명의 학생 데이터`
      });
    } else {
      diagnosis.issues.push(`${SHEET_NAMES.STUDENTS} 시트가 없습니다.`);
    }

    // 3. 필수 컬럼 확인
    if (sheet) {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const requiredCols = ['학번', '비밀번호', '이름'];

      requiredCols.forEach(col => {
        if (headers.includes(col)) {
          diagnosis.checks.push({
            category: '컬럼',
            item: col,
            status: 'OK'
          });
        } else {
          diagnosis.issues.push(`필수 컬럼 '${col}'이 없습니다.`);
        }
      });
    }

    // 4. 보안 설정 확인
    if (SECURITY_CONFIG.SALT === 'CHANGE_THIS_TO_RANDOM_STRING_IN_PRODUCTION') {
      diagnosis.issues.push('기본 Salt를 사용 중입니다. 보안 위험!');
      diagnosis.recommendations.push('Config.gs에서 SALT를 변경하세요.');
    } else {
      diagnosis.checks.push({
        category: '보안',
        item: 'Salt',
        status: 'OK',
        detail: 'Salt가 변경되었습니다.'
      });
    }

    // 5. 캐시 서비스 확인
    try {
      const cache = CacheService.getScriptCache();
      cache.put('test', 'value', 1);
      diagnosis.checks.push({
        category: '캐시',
        item: 'CacheService',
        status: 'OK'
      });
    } catch (error) {
      diagnosis.issues.push(`캐시 서비스 오류: ${error.message}`);
    }

    // 6. Properties 서비스 확인
    try {
      const props = PropertiesService.getScriptProperties();
      props.setProperty('test', 'value');
      props.deleteProperty('test');
      diagnosis.checks.push({
        category: 'Properties',
        item: 'PropertiesService',
        status: 'OK'
      });
    } catch (error) {
      diagnosis.issues.push(`Properties 서비스 오류: ${error.message}`);
    }

    // 결과 출력
    Logger.log('✅ 정상 항목:');
    diagnosis.checks.forEach(check => {
      Logger.log(`  - ${check.category}: ${check.item} (${check.status})`);
    });

    if (diagnosis.issues.length > 0) {
      Logger.log('\n❌ 발견된 문제:');
      diagnosis.issues.forEach((issue, index) => {
        Logger.log(`  ${index + 1}. ${issue}`);
      });
    }

    if (diagnosis.recommendations.length > 0) {
      Logger.log('\n💡 권장사항:');
      diagnosis.recommendations.forEach((rec, index) => {
        Logger.log(`  ${index + 1}. ${rec}`);
      });
    }

  } catch (error) {
    diagnosis.issues.push(`진단 중 오류: ${error.message}`);
  }

  Logger.log('\n=== 시스템 진단 완료 ===');

  return {
    success: diagnosis.issues.length === 0,
    diagnosis: diagnosis
  };
}
