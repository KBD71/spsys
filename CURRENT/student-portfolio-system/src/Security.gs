/**
 * 보안 관련 추가 기능
 * Salt 생성, 보안 감사, IP 차단 등
 */

/**
 * 랜덤 Salt 생성 함수
 * @returns {string} 생성된 Salt
 */
function generateRandomSalt() {
  const uuid1 = Utilities.getUuid();
  const uuid2 = Utilities.getUuid();
  const timestamp = new Date().getTime();

  const salt = uuid1 + uuid2 + timestamp;

  Logger.log('=== 새로운 Salt 생성 ===');
  Logger.log('생성된 Salt:');
  Logger.log(salt);
  Logger.log('\n⚠️ 중요: 이 Salt를 Config.gs의 SECURITY_CONFIG.SALT에 복사하세요!');
  Logger.log('⚠️ Salt 변경 후에는 절대 다시 변경하지 마세요!');
  Logger.log('======================');

  return salt;
}

/**
 * 보안 감사 로그 기록
 * @param {string} eventType - 이벤트 타입
 * @param {Object} details - 상세 정보
 */
function logSecurityEvent(eventType, details = {}) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let auditSheet = ss.getSheetByName('보안감사로그');

    // 감사 로그 시트가 없으면 생성
    if (!auditSheet) {
      auditSheet = ss.insertSheet('보안감사로그');

      // 헤더 설정
      const headers = ['타임스탬프', '이벤트 타입', '사용자', '학번', '상세내용', 'IP 주소'];
      auditSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // 헤더 스타일
      auditSheet.getRange(1, 1, 1, headers.length)
        .setBackground('#667eea')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
    }

    // 로그 추가
    const timestamp = new Date();
    const user = Session.getActiveUser().getEmail();
    const studentId = details.studentId || '-';
    const detailsStr = JSON.stringify(details);
    const ipAddress = '-'; // Apps Script에서는 직접 IP 조회 불가

    auditSheet.appendRow([
      timestamp,
      eventType,
      user,
      studentId,
      detailsStr,
      ipAddress
    ]);

    // 자동 정렬 (최신 순)
    const lastRow = auditSheet.getLastRow();
    if (lastRow > 1) {
      auditSheet.getRange(2, 1, lastRow - 1, 6).sort({ column: 1, ascending: false });
    }

  } catch (error) {
    Logger.log(`보안 감사 로그 기록 오류: ${error.message}`);
  }
}

/**
 * 의심스러운 활동 감지
 * @param {string} studentId - 학번
 * @param {string} activityType - 활동 타입
 * @returns {Object} 감지 결과
 */
function detectSuspiciousActivity(studentId, activityType) {
  try {
    const cache = CacheService.getScriptCache();
    const key = `suspicious_${activityType}_${studentId}`;

    const recent = cache.get(key);
    const attempts = recent ? JSON.parse(recent) : [];
    const now = new Date().getTime();

    // 최근 1시간 내 시도 필터링
    const recentAttempts = attempts.filter(time => now - time < 3600000);
    recentAttempts.push(now);

    cache.put(key, JSON.stringify(recentAttempts), 3600);

    // 의심스러운 활동 기준
    const thresholds = {
      'login_failure': 10,      // 1시간 내 10회 실패
      'password_change': 5,     // 1시간 내 5회 시도
      'rapid_access': 30        // 1시간 내 30회 접근
    };

    const threshold = thresholds[activityType] || 20;

    if (recentAttempts.length >= threshold) {
      // 보안 감사 로그 기록
      logSecurityEvent('SUSPICIOUS_ACTIVITY', {
        studentId: studentId,
        activityType: activityType,
        attemptCount: recentAttempts.length,
        timeWindow: '1 hour'
      });

      return {
        suspicious: true,
        message: '의심스러운 활동이 감지되었습니다.',
        attemptCount: recentAttempts.length
      };
    }

    return {
      suspicious: false,
      attemptCount: recentAttempts.length
    };

  } catch (error) {
    Logger.log(`의심 활동 감지 오류: ${error.message}`);
    return { suspicious: false };
  }
}

/**
 * 비밀번호 강도 검사
 * @param {string} password - 검사할 비밀번호
 * @returns {Object} 강도 검사 결과
 */
function checkPasswordStrength(password) {
  const result = {
    score: 0,
    strength: 'weak',
    suggestions: []
  };

  if (!password) {
    result.suggestions.push('비밀번호를 입력하세요.');
    return result;
  }

  // 길이 체크
  if (password.length >= 8) {
    result.score += 2;
  } else if (password.length >= 6) {
    result.score += 1;
  } else {
    result.suggestions.push('8자 이상 권장합니다.');
  }

  // 숫자 포함
  if (/\d/.test(password)) {
    result.score += 1;
  } else {
    result.suggestions.push('숫자를 포함하세요.');
  }

  // 영문 소문자 포함
  if (/[a-z]/.test(password)) {
    result.score += 1;
  }

  // 영문 대문자 포함
  if (/[A-Z]/.test(password)) {
    result.score += 1;
  } else {
    result.suggestions.push('대문자를 포함하면 더 안전합니다.');
  }

  // 특수문자 포함
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.score += 2;
  } else {
    result.suggestions.push('특수문자를 포함하면 더 안전합니다.');
  }

  // 연속된 문자 체크
  if (/(.)\1{2,}/.test(password)) {
    result.score -= 1;
    result.suggestions.push('연속된 문자를 피하세요.');
  }

  // 일반적인 패턴 체크
  const commonPatterns = ['1234', 'abcd', 'password', 'qwerty'];
  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    result.score -= 2;
    result.suggestions.push('일반적인 패턴을 피하세요.');
  }

  // 강도 판정
  if (result.score >= 6) {
    result.strength = 'strong';
  } else if (result.score >= 4) {
    result.strength = 'medium';
  } else {
    result.strength = 'weak';
  }

  return result;
}

/**
 * 세션 토큰 생성
 * @param {string} studentId - 학번
 * @returns {string} 세션 토큰
 */
function generateSessionToken(studentId) {
  const timestamp = new Date().getTime();
  const random = Utilities.getUuid();
  const data = `${studentId}:${timestamp}:${random}`;

  return Utilities.base64Encode(data);
}

/**
 * 세션 토큰 검증
 * @param {string} token - 검증할 토큰
 * @param {number} maxAgeMinutes - 최대 유효 시간 (분)
 * @returns {Object} 검증 결과
 */
function validateSessionToken(token, maxAgeMinutes = 60) {
  try {
    const decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    const parts = decoded.split(':');

    if (parts.length !== 3) {
      return { valid: false, message: '잘못된 토큰 형식' };
    }

    const studentId = parts[0];
    const timestamp = parseInt(parts[1]);
    const now = new Date().getTime();

    // 토큰 유효 기간 확인
    const ageMinutes = (now - timestamp) / 60000;
    if (ageMinutes > maxAgeMinutes) {
      return {
        valid: false,
        message: '토큰이 만료되었습니다.',
        expired: true
      };
    }

    return {
      valid: true,
      studentId: studentId,
      age: ageMinutes
    };

  } catch (error) {
    Logger.log(`토큰 검증 오류: ${error.message}`);
    return { valid: false, message: '토큰 검증 실패' };
  }
}

/**
 * 보안 헤더 설정
 * @returns {Object} 보안 헤더
 */
function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline';"
  };
}

/**
 * 입력값 Sanitize
 * @param {string} input - 입력값
 * @returns {string} Sanitize된 입력값
 */
function sanitizeInput(input) {
  if (!input) return '';

  // HTML 태그 제거
  let sanitized = String(input).replace(/<[^>]*>/g, '');

  // 특수 문자 이스케이프
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized.trim();
}

/**
 * SQL Injection 패턴 감지
 * @param {string} input - 검사할 입력값
 * @returns {boolean} 위험 여부
 */
function detectSQLInjection(input) {
  if (!input) return false;

  const sqlPatterns = [
    /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b)/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(--|\#|\/\*|\*\/)/,
    /(\bOR\b.*=.*\bOR\b|\bAND\b.*=.*\bAND\b)/i,
    /[;'"]/
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * XSS 패턴 감지
 * @param {string} input - 검사할 입력값
 * @returns {boolean} 위험 여부
 */
function detectXSS(input) {
  if (!input) return false;

  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=\s*["'][^"']*["']/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * 보안 검증 통합 함수
 * @param {string} input - 검증할 입력값
 * @param {string} type - 입력 타입 ('studentId', 'password', 'general')
 * @returns {Object} 검증 결과
 */
function validateSecureInput(input, type = 'general') {
  const result = {
    valid: true,
    sanitized: '',
    warnings: []
  };

  // SQL Injection 검사
  if (detectSQLInjection(input)) {
    result.valid = false;
    result.warnings.push('SQL Injection 패턴 감지');
    logSecurityEvent('SQL_INJECTION_ATTEMPT', { input: input });
  }

  // XSS 검사
  if (detectXSS(input)) {
    result.valid = false;
    result.warnings.push('XSS 패턴 감지');
    logSecurityEvent('XSS_ATTEMPT', { input: input });
  }

  // Sanitize
  result.sanitized = sanitizeInput(input);

  // 타입별 추가 검증
  if (type === 'studentId') {
    if (!/^[0-9]{5}$/.test(input)) {
      result.valid = false;
      result.warnings.push('잘못된 학번 형식');
    }
  }

  return result;
}

/**
 * 보안 테스트 실행
 */
function runSecurityTests() {
  Logger.log('=== 보안 테스트 시작 ===\n');

  // 1. Salt 생성 테스트
  Logger.log('1. Salt 생성 테스트:');
  const salt = generateRandomSalt();
  Logger.log('');

  // 2. 비밀번호 강도 테스트
  Logger.log('2. 비밀번호 강도 테스트:');
  const testPasswords = ['1234', 'password', 'Pass123!', 'MySecureP@ssw0rd'];

  testPasswords.forEach(pw => {
    const strength = checkPasswordStrength(pw);
    Logger.log(`  "${pw}": ${strength.strength} (점수: ${strength.score})`);
    if (strength.suggestions.length > 0) {
      Logger.log(`    제안: ${strength.suggestions.join(', ')}`);
    }
  });
  Logger.log('');

  // 3. 입력 검증 테스트
  Logger.log('3. 입력 검증 테스트:');
  const testInputs = [
    { value: '20240101', type: 'studentId' },
    { value: '<script>alert("xss")</script>', type: 'general' },
    { value: "1' OR '1'='1", type: 'general' }
  ];

  testInputs.forEach(test => {
    const validation = validateSecureInput(test.value, test.type);
    Logger.log(`  입력: "${test.value}"`);
    Logger.log(`  유효: ${validation.valid}`);
    if (validation.warnings.length > 0) {
      Logger.log(`  경고: ${validation.warnings.join(', ')}`);
    }
    Logger.log(`  Sanitized: "${validation.sanitized}"\n`);
  });

  // 4. 세션 토큰 테스트
  Logger.log('4. 세션 토큰 테스트:');
  const token = generateSessionToken('20240101');
  Logger.log(`  생성된 토큰: ${token}`);

  const validation = validateSessionToken(token);
  Logger.log(`  토큰 유효: ${validation.valid}`);
  if (validation.valid) {
    Logger.log(`  학번: ${validation.studentId}`);
    Logger.log(`  유효 기간: ${validation.age.toFixed(2)}분`);
  }

  Logger.log('\n=== 보안 테스트 완료 ===');
}
