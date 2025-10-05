/**
 * 과제 목록 조회 API (v5 - 최종 날짜 처리 로직)
 * - 'YYYY.MM.DD', 'MM-DD' 등 다양한 날짜 형식을 모두 유연하게 처리
 * - 연도 생략 시 현재 연도를 기준으로 자동 계산
 */
const { google } = require('googleapis');

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
 * 매우 유연한 날짜 변환 함수 (최종 버전)
 * @param {string} dateString - '2025. 10. 1', '10-1' 등 다양한 형식의 날짜
 * @returns {Date|null}
 */
function parseFlexibleDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;

  // 'YYYY. MM. DD.' 같은 형식을 'YYYY-MM-DD'로 정규화
  const parts = dateString.replace(/\s/g, '').split(/[.\-]/).filter(p => p);
  
  let year, month, day;

  if (parts.length === 3) { // YYYY, MM, DD 형식이 모두 있을 경우
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else if (parts.length === 2) { // MM, DD 형식만 있을 경우 (연도 생략)
    year = new Date().getFullYear(); // 현재 연도를 사용
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
  } else {
    return null; // 유효하지 않은 형식
  }

  // 숫자가 아니거나 범위를 벗어나면 유효하지 않음
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  
  // JavaScript의 월은 0부터 시작하므로 1을 빼줌
  const date = new Date(year, month - 1, day);
  
  // 생성된 날짜가 유효한지 최종 확인 (예: 2월 30일 같은 경우 방지)
  if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
    return date;
  }
  
  return null;
}


module.exports = async (req, res) => {
  // CORS 헤더 및 기본 요청 처리
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ success: false, message: '학번을 입력해주세요.' });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: '과제설정!A:F' });
    const allRows = response.data.values;
    if (!allRows || allRows.length < 2) {
      return res.status(200).json({ success: true, assignments: [] });
    }

    const assignments = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 시간 부분을 제거하여 날짜만 비교

    allRows.slice(1).forEach((row) => {
      const isPublic = (row[0] || '').toString().toUpperCase() === 'TRUE';
      if (!isPublic) return;

      const startDateStr = row[4];
      const dueDateStr = row[5];
      
      const startDate = parseFlexibleDate(startDateStr);
      const dueDate = parseFlexibleDate(dueDateStr);

      if (startDate && today < startDate) return; // 과제 시작일 전
      if (dueDate && today > dueDate) return; // 과제 마감일 지남

      assignments.push({
        id: row[1],
        name: row[2],
        description: `제출 기한: ${dueDateStr || '기한 없음'}`,
        dueDate: dueDateStr || '기한 없음',
      });
    });
    
    return res.status(200).json({ success: true, assignments });

  } catch (error) {
    console.error('Assignments API 최종 오류:', error);
    return res.status(500).json({ success: false, message: '과제 목록 조회 중 서버 오류가 발생했습니다.' });
  }
};
