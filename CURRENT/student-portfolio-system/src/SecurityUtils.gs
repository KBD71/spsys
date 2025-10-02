/**
 * 보안 유틸리티 함수
 * 비밀번호 해싱, Rate Limiting, 인증 등 보안 관련 기능 제공
 */

/**
 * 비밀번호를 해싱하는 함수
 * SHA-256 알고리즘과 Salt를 사용하여 안전하게 해싱
 * @param {string} password - 평문 비밀번호
 * @returns {string} 해싱된 비밀번호 (Base64 인코딩)
 */
function hashPassword(password) {
  try {
    const salt = SECURITY_CONFIG.SALT;
    const rawHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      password + salt,
      Utilities.Charset.UTF_8
    );
    return Utilities.base64Encode(rawHash);
  } catch (error) {
    Logger.log(`비밀번호 해싱 오류: ${error.message}`);
    throw new Error('비밀번호 처리 중 오류가 발생했습니다.');
  }
}

/**
 * 평문 비밀번호와 해시를 비교하는 함수
 * @param {string} plainPassword - 평문 비밀번호
 * @param {string} hashedPassword - 해싱된 비밀번호
 * @returns {boolean} 일치 여부
 */
function verifyPassword(plainPassword, hashedPassword) {
  try {
    return hashPassword(plainPassword) === hashedPassword;
  } catch (error) {
    Logger.log(`비밀번호 검증 오류: ${error.message}`);
    return false;
  }
}

/**
 * Rate Limiting 체크 함수
 * @param {string} identifier - 식별자 (학번 등)
 * @param {string} action - 액션 타입 ('login' 또는 'password_change')
 * @returns {Object} {allowed: boolean, message: string, remainingAttempts: number}
 */
function checkRateLimit(identifier, action) {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const key = `ratelimit_${action}_${identifier}`;
    const attemptsData = scriptProperties.getProperty(key);

    const config = RATE_LIMIT_CONFIG;
    const maxAttempts = action === 'login'
      ? config.LOGIN_MAX_ATTEMPTS
      : config.PASSWORD_CHANGE_MAX_ATTEMPTS;
    const windowMinutes = config.WINDOW_MINUTES;

    const now = new Date().getTime();
    const windowStart = now - (windowMinutes * 60 * 1000);

    let recentAttempts = [];

    if (attemptsData) {
      const data = JSON.parse(attemptsData);
      // 시간 윈도우 내의 시도만 필터링
      recentAttempts = data.attempts.filter(timestamp => timestamp > windowStart);
    }

    if (recentAttempts.length >= maxAttempts) {
      const oldestAttempt = Math.min(...recentAttempts);
      const waitMinutes = Math.ceil((oldestAttempt + (windowMinutes * 60 * 1000) - now) / 60000);

      return {
        allowed: false,
        message: `너무 많은 시도가 있었습니다. ${waitMinutes}분 후 다시 시도하세요.`,
        remainingAttempts: 0
      };
    }

    // 새로운 시도 기록
    recentAttempts.push(now);
    scriptProperties.setProperty(key, JSON.stringify({ attempts: recentAttempts }));

    return {
      allowed: true,
      message: '허용됨',
      remainingAttempts: maxAttempts - recentAttempts.length
    };

  } catch (error) {
    Logger.log(`Rate Limit 체크 오류: ${error.message}`);
    // 오류 시 안전하게 차단
    return {
      allowed: false,
      message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도하세요.',
      remainingAttempts: 0
    };
  }
}

/**
 * Rate Limit 리셋 함수 (성공 시 호출)
 * @param {string} identifier - 식별자
 * @param {string} action - 액션 타입
 */
function resetRateLimit(identifier, action) {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const key = `ratelimit_${action}_${identifier}`;
    scriptProperties.deleteProperty(key);
  } catch (error) {
    Logger.log(`Rate Limit 리셋 오류: ${error.message}`);
  }
}

/**
 * 학생 인증 함수
 * @param {string} studentId - 학번
 * @param {string} password - 비밀번호
 * @returns {Object} {success: boolean, message: string, studentId: string, name: string, class: string}
 */
function authenticateStudent(studentId, password) {
  try {
    // Rate Limit 체크
    const rateLimitCheck = checkRateLimit(studentId, 'login');
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        message: rateLimitCheck.message
      };
    }

    // 입력 검증
    if (!studentId || !password) {
      return {
        success: false,
        message: '학번과 비밀번호를 입력해주세요.'
      };
    }

    // 학번 형식 검증
    if (!/^[0-9]{5}$/.test(studentId)) {
      return {
        success: false,
        message: '학번 형식이 올바르지 않습니다.'
      };
    }

    // 학생 데이터 조회
    const studentData = findStudentData(studentId);
    if (!studentData.found) {
      Logger.log(`인증 실패 - 학생을 찾을 수 없음: ${studentId.substring(0, 3)}**`);
      return {
        success: false,
        message: '학번 또는 비밀번호가 올바르지 않습니다.'
      };
    }

    // 비밀번호 검증
    if (!studentData.password) {
      return {
        success: false,
        message: '비밀번호가 설정되지 않았습니다. 관리자에게 문의하세요.'
      };
    }

    if (!verifyPassword(password, studentData.password)) {
      Logger.log(`인증 실패 - 비밀번호 불일치: ${studentId.substring(0, 3)}**`);
      return {
        success: false,
        message: '학번 또는 비밀번호가 올바르지 않습니다.'
      };
    }

    // 인증 성공 - Rate Limit 리셋
    resetRateLimit(studentId, 'login');

    Logger.log(`인증 성공: ${studentId.substring(0, 3)}**`);
    return {
      success: true,
      message: '로그인 성공',
      studentId: studentId,
      name: studentData.name,
      class: studentData.class || '-'
    };

  } catch (error) {
    Logger.log(`인증 오류: ${error.message}`);
    return {
      success: false,
      message: '로그인 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 안전한 로깅 함수 (PII 마스킹)
 * @param {string} message - 로그 메시지
 * @param {Object} data - 로그 데이터
 */
function safeLog(message, data = {}) {
  const sanitized = {};

  for (const key in data) {
    if (key === 'studentId') {
      sanitized[key] = data[key] ? data[key].substring(0, 3) + '**' : null;
    } else if (key === 'name') {
      sanitized[key] = data[key] ? data[key][0] + '**' : null;
    } else if (key === 'password' || key === 'newPassword' || key === 'currentPassword') {
      sanitized[key] = '***';
    } else {
      sanitized[key] = data[key];
    }
  }

  Logger.log(`${message} ${JSON.stringify(sanitized)}`);
}

/**
 * 표준 에러 응답 생성 함수
 * @param {Error} error - 에러 객체
 * @param {string} context - 에러 발생 컨텍스트
 * @param {boolean} failSafe - 안전 모드 (기본값: true)
 * @returns {Object} 표준화된 에러 응답
 */
function handleError(error, context, failSafe = true) {
  const errorId = Utilities.getUuid();
  Logger.log(`[${errorId}] ${context}: ${error.message}`);

  if (error.stack) {
    Logger.log(`[${errorId}] Stack: ${error.stack}`);
  }

  if (failSafe) {
    return {
      success: false,
      message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      errorId: errorId
    };
  } else {
    throw error;
  }
}

/**
 * 보안 테스트 함수
 */
function testSecurity() {
  Logger.log('=== 보안 기능 테스트 ===\n');

  // 1. 비밀번호 해싱 테스트
  Logger.log('1. 비밀번호 해싱 테스트:');
  const password = 'test1234';
  const hashed = hashPassword(password);
  Logger.log(`  원본: ${password}`);
  Logger.log(`  해시: ${hashed}`);
  Logger.log(`  검증: ${verifyPassword(password, hashed) ? '성공' : '실패'}\n`);

  // 2. Rate Limit 테스트
  Logger.log('2. Rate Limit 테스트:');
  const testId = '12345';
  for (let i = 0; i < 6; i++) {
    const result = checkRateLimit(testId, 'login');
    Logger.log(`  시도 ${i + 1}: ${result.allowed ? '허용' : '차단'} - ${result.message}`);
  }

  // Rate Limit 리셋
  resetRateLimit(testId, 'login');
  Logger.log('  Rate Limit 리셋 완료\n');

  Logger.log('=== 보안 기능 테스트 완료 ===');
}
