/**
 * 시스템 설정 파일
 * 비밀번호 규칙, 시트 이름 등 전역 설정 관리
 */

/**
 * 비밀번호 설정
 */
const PASSWORD_CONFIG = {
  MIN_LENGTH: 4,
  MAX_LENGTH: 20,
  CHANGE_LIMIT_HOURS: 24
};

/**
 * 시트 이름 설정
 */
const SHEET_NAMES = {
  STUDENTS: '학생명단_전체',
  ASSIGNMENTS: '과제설정',
  EVALUATION: '평가항목설정'
};

/**
 * 컬럼 이름 설정
 */
const COLUMN_NAMES = {
  STUDENT_ID: '학번',
  PASSWORD: '비밀번호',
  NAME: '이름',
  CLASS: '반',
  LAST_CHANGE_DATE: '비밀번호변경일',
  CHANGE_COUNT: '변경횟수'
};

/**
 * Rate Limiting 설정
 */
const RATE_LIMIT_CONFIG = {
  LOGIN_MAX_ATTEMPTS: 5,
  PASSWORD_CHANGE_MAX_ATTEMPTS: 3,
  WINDOW_MINUTES: 15
};

/**
 * 보안 설정 (실제 배포 시 변경 필요)
 */
const SECURITY_CONFIG = {
  SALT: 'CHANGE_THIS_TO_RANDOM_STRING_IN_PRODUCTION',
  CACHE_DURATION_SECONDS: 3600,
  LOCK_TIMEOUT_MS: 30000
};

/**
 * 배포 설정
 */
const DEPLOYMENT_CONFIG = {
  PLATFORM: 'vercel',  // 또는 'github-pages', 'netlify'
  ACCESS: 'public',    // 개인 접근 허용
  DOMAIN: ''           // 커스텀 도메인 (선택)
};

/**
 * 비밀번호 설정을 반환하는 함수
 * @returns {Object} 비밀번호 설정 객체
 */
function getPasswordConfig() {
  return PASSWORD_CONFIG;
}

/**
 * 시트 이름 설정을 반환하는 함수
 * @returns {Object} 시트 이름 설정 객체
 */
function getSheetNames() {
  return SHEET_NAMES;
}

/**
 * 컬럼 이름 설정을 반환하는 함수
 * @returns {Object} 컬럼 이름 설정 객체
 */
function getColumnNames() {
  return COLUMN_NAMES;
}

/**
 * Rate Limiting 설정을 반환하는 함수
 * @returns {Object} Rate Limiting 설정 객체
 */
function getRateLimitConfig() {
  return RATE_LIMIT_CONFIG;
}

/**
 * 보안 설정을 반환하는 함수
 * @returns {Object} 보안 설정 객체
 */
function getSecurityConfig() {
  return SECURITY_CONFIG;
}

/**
 * 설정 테스트 함수
 */
function testConfig() {
  Logger.log('=== 시스템 설정 ===');
  Logger.log('비밀번호 설정:');
  Logger.log(JSON.stringify(PASSWORD_CONFIG, null, 2));
  Logger.log('\n시트 이름 설정:');
  Logger.log(JSON.stringify(SHEET_NAMES, null, 2));
  Logger.log('\n컬럼 이름 설정:');
  Logger.log(JSON.stringify(COLUMN_NAMES, null, 2));
  Logger.log('\nRate Limiting 설정:');
  Logger.log(JSON.stringify(RATE_LIMIT_CONFIG, null, 2));
}
