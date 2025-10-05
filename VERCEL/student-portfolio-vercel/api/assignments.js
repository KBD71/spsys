/**
 * 과제 목록 조회 API (v3 - 날짜 형식 처리 강화)
 * 'YYYY. MM. DD' 형식의 날짜를 인식하도록 수정하여 날짜 비교 오류를 해결합니다.
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
 * 'YYYY. MM. DD' 형식의 날짜 문자열을 Date 객체로 변환하는 함수
 * @param {string} dateString - '2025. 10. 1'과 같은 형식의 날짜 문자열
 * @returns {Date|null} 변환된 Date 객체 또는 null
 */
function parseCustomDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  
  const parts = dateString.split('.').map(part => part.trim());
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JavaScript의 월은 0부터 시작
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }
  // 표준 형식도 시도
  const standardDate = new Date(dateString);
  if (!isNaN(standardDate.getTime())) {
      return standardDate;
  }
  
  return null;
}

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ success: false, message: '학번을 입력해주세요.' });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // '과제설정' 시트 읽기
    const assignmentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '과제설정!A:G' // 질문1까지 읽도록 범위 확장
    });
    const assignmentData = assignmentResponse.data.values;
    if (!assignmentData || assignmentData.length < 2) {
      return res.status(200).json({ success: true, assignments: [] });
    }

    const assignments = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 시간 부분을 제거하여 날짜만 비교

    for (let i = 1; i < assignmentData.length; i++) {
      const row = assignmentData[i];
      const isPublic = row[0] === true || row[0] === 'TRUE' || row[0] === 'Y';
      
      if (!isPublic) continue;

      const startDateStr = row[4];
      const dueDateStr = row[5];
      
      // ⭐ 수정된 날짜 처리 로직 ⭐
      const startDate = parseCustomDate(startDateStr);
      const dueDate = parseCustomDate(dueDateStr);

      // 날짜 비교
      if (startDate && today < startDate) {
        continue; // 과제 시작일 전
      }
      if (dueDate && today > dueDate) {
        continue; // 과제 마감일 지남
      }

      assignments.push({
        id: row[1],
        name: row[2],
        description: `제출 기한: ${dueDateStr || '기한 없음'}`,
        dueDate: dueDateStr || '기한 없음',
      });
    }

    return res.status(200).json({ success: true, assignments: assignments });

  } catch (error) {
    console.error('Assignments API error:', error);
    return res.status(500).json({ success: false, message: '과제 목록 조회 실패: ' + error.message });
  }
};
