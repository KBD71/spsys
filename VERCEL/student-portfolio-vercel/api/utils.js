/**
 * 공통 유틸리티 함수 모듈
 * - Google Sheets 클라이언트 생성
 * - 헤더 맵 생성
 * - 민감정보 마스킹
 */

const { google } = require('googleapis');

/**
 * Google Sheets 인증 및 클라이언트 생성
 * @returns {Promise<sheets_v4.Sheets>} Google Sheets API 클라이언트
 */
async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

/**
 * 헤더 배열을 인덱스 맵으로 변환
 * @param {string[]} headers - 시트 헤더 배열
 * @returns {Object<string, number>} 헤더명을 키로, 인덱스를 값으로 하는 맵
 * @example
 * createHeaderMap(['학번', '이름', '반'])
 * // => { '학번': 0, '이름': 1, '반': 2 }
 */
function createHeaderMap(headers) {
  const headerMap = {};
  headers.forEach((header, index) => {
    headerMap[header.trim()] = index;
  });
  return headerMap;
}

/**
 * 학번 마스킹 (로그용)
 * @param {string} studentId - 학번 (5자리)
 * @returns {string} 마스킹된 학번
 * @example
 * maskStudentId('10101') // => '101**'
 */
function maskStudentId(studentId) {
  if (!studentId || studentId.length < 3) return '***';
  return studentId.substring(0, 3) + '**';
}

/**
 * 이름 마스킹 (로그용)
 * @param {string} name - 이름
 * @returns {string} 마스킹된 이름
 * @example
 * maskName('홍길동') // => '홍*동'
 * maskName('김철수') // => '김*수'
 */
function maskName(name) {
  if (!name || name.length < 2) return '*';
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

/**
 * 안전한 로그 메시지 생성 (민감정보 자동 마스킹)
 * @param {string} message - 로그 메시지
 * @param {Object} context - 컨텍스트 정보
 * @returns {string} 마스킹된 로그 메시지
 */
function createSafeLog(message, context = {}) {
  let safeMessage = message;

  if (context.studentId) {
    safeMessage += ` [학번: ${maskStudentId(context.studentId)}]`;
  }

  if (context.name) {
    safeMessage += ` [이름: ${maskName(context.name)}]`;
  }

  if (context.assignmentId) {
    safeMessage += ` [과제ID: ${context.assignmentId}]`;
  }

  return safeMessage;
}

/**
 * CORS 헤더 설정
 * @param {Object} res - Express response 객체
 */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * 에러 응답 생성 (민감정보 제외)
 * @param {Error} error - 에러 객체
 * @param {string} userMessage - 사용자에게 보여줄 메시지
 * @returns {Object} 에러 응답 객체
 */
function createErrorResponse(error, userMessage = '서버 오류가 발생했습니다.') {
  // 프로덕션 환경에서는 상세 스택 숨김
  const isProduction = process.env.NODE_ENV === 'production';

  console.error('[에러]', error.message, isProduction ? '' : error.stack);

  return {
    success: false,
    message: userMessage,
    ...(isProduction ? {} : { detail: error.message })
  };
}

module.exports = {
  getSheetsClient,
  createHeaderMap,
  maskStudentId,
  maskName,
  createSafeLog,
  setCorsHeaders,
  createErrorResponse
};
