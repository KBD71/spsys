/**
 * 학생 비밀번호 관리 시스템 (개선 버전)
 * Google Sheets 기반 비밀번호 변경 및 관리 기능 제공
 * - 비밀번호 해싱
 * - Race Condition 방지
 * - 캐싱 최적화
 * - 개선된 에러 처리
 */

/**
 * 학생 비밀번호를 변경하는 메인 함수
 * @param {string} studentId - 학번
 * @param {string} currentPassword - 현재 비밀번호
 * @param {string} newPassword - 새 비밀번호
 * @returns {Object} {success: boolean, message: string}
 */
function changeStudentPassword(studentId, currentPassword, newPassword) {
  // LockService를 사용하여 Race Condition 방지
  const lock = LockService.getScriptLock();

  try {
    // 최대 30초 대기, 10초 동안 락 유지
    const hasLock = lock.tryLock(SECURITY_CONFIG.LOCK_TIMEOUT_MS);

    if (!hasLock) {
      return {
        success: false,
        message: '서버가 바쁩니다. 잠시 후 다시 시도해주세요.'
      };
    }

    try {
      safeLog('비밀번호 변경 시도', { studentId: studentId });

      // Rate Limit 체크
      const rateLimitCheck = checkRateLimit(studentId, 'password_change');
      if (!rateLimitCheck.allowed) {
        return { success: false, message: rateLimitCheck.message };
      }

      // 1. 입력 검증
      const validation = validatePasswordInput(currentPassword, newPassword);
      if (!validation.isValid) {
        return { success: false, message: validation.message };
      }

      // 2. 학생 데이터 찾기 (캐싱 사용)
      const studentData = findStudentDataOptimized(studentId);
      if (!studentData.found) {
        safeLog('학생을 찾을 수 없음', { studentId: studentId });
        return { success: false, message: '학생 정보를 찾을 수 없습니다.' };
      }

      // 3. 비밀번호 존재 확인
      if (!studentData.password) {
        return {
          success: false,
          message: '비밀번호가 설정되지 않았습니다. 관리자에게 문의하세요.'
        };
      }

      // 4. 현재 비밀번호 검증
      if (!verifyPassword(currentPassword, studentData.password)) {
        safeLog('비밀번호 불일치', { studentId: studentId });
        return { success: false, message: '현재 비밀번호가 올바르지 않습니다.' };
      }

      // 5. 새 비밀번호가 현재와 같은지 확인
      if (verifyPassword(newPassword, studentData.password)) {
        return { success: false, message: '새 비밀번호는 현재 비밀번호와 달라야 합니다.' };
      }

      // 6. 24시간 변경 제한 확인
      const limitCheck = checkChangeLimit(studentData.lastChangeDate);
      if (!limitCheck.allowed) {
        return { success: false, message: limitCheck.message };
      }

      // 7. 비밀번호 해싱 후 업데이트
      const hashedPassword = hashPassword(newPassword);
      updatePassword(studentData.row, hashedPassword, studentData.changeCount);

      // 8. 캐시 무효화
      clearStudentCache(studentId);

      // 9. Rate Limit 리셋 (성공 시)
      resetRateLimit(studentId, 'password_change');

      safeLog('비밀번호 변경 성공', { studentId: studentId, name: studentData.name });
      return {
        success: true,
        message: '비밀번호가 성공적으로 변경되었습니다.'
      };

    } catch (error) {
      return handleError(error, '비밀번호 변경', true);
    } finally {
      lock.releaseLock();
    }

  } catch (error) {
    Logger.log(`락 획득 실패: ${error.message}`);
    return {
      success: false,
      message: '서버가 바쁩니다. 잠시 후 다시 시도해주세요.'
    };
  }
}

/**
 * 비밀번호 입력값을 검증하는 함수
 * @param {string} currentPassword - 현재 비밀번호
 * @param {string} newPassword - 새 비밀번호
 * @returns {Object} {isValid: boolean, message: string}
 */
function validatePasswordInput(currentPassword, newPassword) {
  // 빈 값 체크
  if (!currentPassword || !newPassword) {
    return {
      isValid: false,
      message: '비밀번호를 입력해주세요.'
    };
  }

  // 공백 제거 후 체크
  const trimmedNew = newPassword.trim();
  const trimmedCurrent = currentPassword.trim();

  if (!trimmedCurrent || !trimmedNew) {
    return {
      isValid: false,
      message: '비밀번호는 공백만으로 구성될 수 없습니다.'
    };
  }

  // 길이 체크 (최소 4자, 최대 20자)
  if (trimmedNew.length < PASSWORD_CONFIG.MIN_LENGTH) {
    return {
      isValid: false,
      message: `새 비밀번호는 최소 ${PASSWORD_CONFIG.MIN_LENGTH}자 이상이어야 합니다.`
    };
  }

  if (trimmedNew.length > PASSWORD_CONFIG.MAX_LENGTH) {
    return {
      isValid: false,
      message: `새 비밀번호는 최대 ${PASSWORD_CONFIG.MAX_LENGTH}자까지 가능합니다.`
    };
  }

  return {
    isValid: true,
    message: '검증 성공'
  };
}

/**
 * 학생 데이터를 시트에서 찾는 함수 (기본 버전)
 * @param {string} studentId - 학번
 * @returns {Object} {found: boolean, row: number, password: string, name: string, class: string, lastChangeDate: Date, changeCount: number}
 */
function findStudentData(studentId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);

    if (!sheet) {
      Logger.log(`${SHEET_NAMES.STUDENTS} 시트를 찾을 수 없습니다.`);
      return { found: false };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      Logger.log('시트에 데이터가 없습니다.');
      return { found: false };
    }

    const headers = data[0];
    const cols = COLUMN_NAMES;

    // 컬럼 인덱스 동적 처리
    const studentIdCol = headers.indexOf(cols.STUDENT_ID);
    const passwordCol = headers.indexOf(cols.PASSWORD);
    const nameCol = headers.indexOf(cols.NAME);
    const classCol = headers.indexOf(cols.CLASS);
    const lastChangeDateCol = headers.indexOf(cols.LAST_CHANGE_DATE);
    const changeCountCol = headers.indexOf(cols.CHANGE_COUNT);

    // 필수 컬럼 확인
    if (studentIdCol === -1 || passwordCol === -1) {
      Logger.log('필수 컬럼을 찾을 수 없습니다.');
      return { found: false };
    }

    // 학생 찾기 (헤더 제외, strict equality 사용)
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][studentIdCol]).trim() === String(studentId).trim()) {
        return {
          found: true,
          row: i + 1, // 시트는 1부터 시작
          password: data[i][passwordCol] ? String(data[i][passwordCol]).trim() : null,
          name: nameCol !== -1 ? String(data[i][nameCol] || '') : '',
          class: classCol !== -1 ? String(data[i][classCol] || '') : '',
          lastChangeDate: lastChangeDateCol !== -1 ? data[i][lastChangeDateCol] : null,
          changeCount: changeCountCol !== -1 ? (Number(data[i][changeCountCol]) || 0) : 0
        };
      }
    }

    return { found: false };

  } catch (error) {
    Logger.log(`학생 데이터 검색 오류: ${error.message}`);
    return { found: false };
  }
}

/**
 * 학생 데이터를 찾는 최적화된 함수 (캐싱 사용)
 * @param {string} studentId - 학번
 * @returns {Object} 학생 데이터
 */
function findStudentDataOptimized(studentId) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `student_row_${studentId}`;

  try {
    // 캐시 확인
    const cachedRow = cache.get(cacheKey);
    if (cachedRow) {
      const row = parseInt(cachedRow);
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);

      if (sheet) {
        const headers = getHeadersCached(sheet);
        const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

        const studentIdCol = headers.indexOf(COLUMN_NAMES.STUDENT_ID);

        // 캐시된 행이 여전히 유효한지 확인
        if (String(rowData[studentIdCol]).trim() === String(studentId).trim()) {
          return buildStudentDataObject(rowData, headers, row);
        }
      }
    }

    // 캐시 미스 - 전체 검색 수행
    const result = findStudentData(studentId);

    // 결과를 캐시에 저장
    if (result.found) {
      cache.put(cacheKey, result.row.toString(), SECURITY_CONFIG.CACHE_DURATION_SECONDS);
    }

    return result;

  } catch (error) {
    Logger.log(`최적화된 학생 검색 오류: ${error.message}`);
    // 캐시 오류 시 기본 검색으로 폴백
    return findStudentData(studentId);
  }
}

/**
 * 헤더를 캐싱하여 가져오는 함수
 * @param {Sheet} sheet - 시트 객체
 * @returns {Array} 헤더 배열
 */
function getHeadersCached(sheet) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `headers_${sheet.getName()}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  cache.put(cacheKey, JSON.stringify(headers), SECURITY_CONFIG.CACHE_DURATION_SECONDS);

  return headers;
}

/**
 * 행 데이터로부터 학생 객체를 생성하는 함수
 * @param {Array} rowData - 행 데이터
 * @param {Array} headers - 헤더 배열
 * @param {number} row - 행 번호
 * @returns {Object} 학생 데이터 객체
 */
function buildStudentDataObject(rowData, headers, row) {
  const cols = COLUMN_NAMES;

  const passwordCol = headers.indexOf(cols.PASSWORD);
  const nameCol = headers.indexOf(cols.NAME);
  const classCol = headers.indexOf(cols.CLASS);
  const lastChangeDateCol = headers.indexOf(cols.LAST_CHANGE_DATE);
  const changeCountCol = headers.indexOf(cols.CHANGE_COUNT);

  return {
    found: true,
    row: row,
    password: passwordCol !== -1 && rowData[passwordCol] ? String(rowData[passwordCol]).trim() : null,
    name: nameCol !== -1 ? String(rowData[nameCol] || '') : '',
    class: classCol !== -1 ? String(rowData[classCol] || '') : '',
    lastChangeDate: lastChangeDateCol !== -1 ? rowData[lastChangeDateCol] : null,
    changeCount: changeCountCol !== -1 ? (Number(rowData[changeCountCol]) || 0) : 0
  };
}

/**
 * 학생 캐시를 무효화하는 함수
 * @param {string} studentId - 학번
 */
function clearStudentCache(studentId) {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(`student_row_${studentId}`);
  } catch (error) {
    Logger.log(`캐시 무효화 오류: ${error.message}`);
  }
}

/**
 * 헤더 캐시를 무효화하는 함수
 * @param {string} sheetName - 시트 이름
 */
function clearHeaderCache(sheetName) {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(`headers_${sheetName}`);
  } catch (error) {
    Logger.log(`헤더 캐시 무효화 오류: ${error.message}`);
  }
}

/**
 * 24시간 변경 제한을 확인하는 함수 (개선 버전)
 * @param {Date} lastChangeDate - 마지막 변경일
 * @returns {Object} {allowed: boolean, message: string}
 */
function checkChangeLimit(lastChangeDate) {
  // 변경 이력이 없으면 허용
  if (!lastChangeDate) {
    return {
      allowed: true,
      message: '변경 가능'
    };
  }

  try {
    const now = new Date();
    const lastChange = new Date(lastChangeDate);

    // 날짜 객체 유효성 검증
    if (isNaN(lastChange.getTime())) {
      Logger.log('잘못된 날짜 형식 - 변경 허용');
      return {
        allowed: true,
        message: '변경 가능'
      };
    }

    // 타임존 고려한 날짜 비교
    const timeZone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    const nowStr = Utilities.formatDate(now, timeZone, 'yyyy-MM-dd HH:mm:ss');
    const lastChangeStr = Utilities.formatDate(lastChange, timeZone, 'yyyy-MM-dd HH:mm:ss');

    const millisDiff = new Date(nowStr) - new Date(lastChangeStr);
    const hoursDiff = millisDiff / (1000 * 60 * 60);

    // 24시간(1일) 체크
    if (hoursDiff < PASSWORD_CONFIG.CHANGE_LIMIT_HOURS) {
      const remainingHours = Math.ceil(PASSWORD_CONFIG.CHANGE_LIMIT_HOURS - hoursDiff);
      return {
        allowed: false,
        message: `비밀번호는 24시간에 1회만 변경 가능합니다. (${remainingHours}시간 후 변경 가능)`
      };
    }

    return {
      allowed: true,
      message: '변경 가능'
    };

  } catch (error) {
    Logger.log(`변경 제한 확인 오류: ${error.message}`);
    // 오류 시 안전하게 차단 (Fail Closed)
    return {
      allowed: false,
      message: '변경 제한 확인 중 오류가 발생했습니다. 관리자에게 문의하세요.'
    };
  }
}

/**
 * 실제로 비밀번호를 업데이트하는 함수 (배치 처리)
 * @param {number} row - 행 번호
 * @param {string} hashedPassword - 해싱된 새 비밀번호
 * @param {number} currentCount - 현재 변경 횟수
 */
function updatePassword(row, hashedPassword, currentCount) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);

    if (!sheet) {
      throw new Error(`${SHEET_NAMES.STUDENTS} 시트를 찾을 수 없습니다.`);
    }

    const headers = getHeadersCached(sheet);
    const cols = COLUMN_NAMES;

    // 컬럼 인덱스 찾기 (1-based)
    const passwordCol = headers.indexOf(cols.PASSWORD) + 1;
    const lastChangeDateCol = headers.indexOf(cols.LAST_CHANGE_DATE) + 1;
    const changeCountCol = headers.indexOf(cols.CHANGE_COUNT) + 1;

    // 업데이트할 데이터 준비
    const updates = [];

    if (passwordCol > 0) {
      updates.push({ col: passwordCol, value: hashedPassword });
    }

    if (lastChangeDateCol > 0) {
      updates.push({ col: lastChangeDateCol, value: new Date() });
    }

    if (changeCountCol > 0) {
      updates.push({ col: changeCountCol, value: (currentCount || 0) + 1 });
    }

    // 배치 업데이트 실행
    if (updates.length > 0) {
      updates.forEach(update => {
        sheet.getRange(row, update.col).setValue(update.value);
      });

      Logger.log(`비밀번호 업데이트 완료 - 행: ${row}, ${updates.length}개 필드`);
    }

  } catch (error) {
    Logger.log(`비밀번호 업데이트 오류: ${error.message}`);
    throw error;
  }
}

/**
 * 비밀번호 변경 테스트 함수
 * 실제 운영 환경에서는 주석 처리할 것
 */
function testPasswordChange() {
  Logger.log('=== 비밀번호 변경 테스트 ===\n');

  // 테스트 데이터
  const testStudentId = '20240101';
  const testCurrentPassword = '1234';
  const testNewPassword = 'newpass123';

  Logger.log(`학번: ${testStudentId}`);
  Logger.log(`현재 비밀번호: ${testCurrentPassword}`);
  Logger.log(`새 비밀번호: ${testNewPassword}\n`);

  const result = changeStudentPassword(testStudentId, testCurrentPassword, testNewPassword);

  Logger.log('테스트 결과:');
  Logger.log(JSON.stringify(result, null, 2));

  Logger.log('\n=== 테스트 완료 ===');
}
