/**
 * 과제 목록 조회 API (v4 - 최종 안정화 버전)
 * - 다양한 날짜 형식('YYYY.MM.DD', 'YYYY-MM-DD' 등)을 모두 처리하도록 로직 강화
 * - 서버 로그에 각 과제 데이터의 처리 과정을 기록하여 디버깅 용이성 확보
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

// 더욱 유연한 날짜 변환 함수
function parseLenientDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  // 'YYYY. MM. DD.' 형식을 'YYYY-MM-DD'로 변환
  const formattedString = dateString.replace(/\.\s*/g, '-').replace(/-$/, '');
  const date = new Date(formattedString);
  return isNaN(date.getTime()) ? null : date;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });

  console.log("'/api/assignments' 요청 시작");

  try {
    const { studentId } = req.query;
    if (!studentId) {
      console.log("오류: 학번이 누락되었습니다.");
      return res.status(400).json({ success: false, message: '학번을 입력해주세요.' });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '과제설정!A:G'
    });
    const allRows = response.data.values;
    if (!allRows || allRows.length < 2) {
      console.log("'과제설정' 시트에 데이터가 없습니다.");
      return res.status(200).json({ success: true, assignments: [] });
    }

    const assignments = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`서버 기준 오늘 날짜: ${today.toISOString().split('T')[0]}`);

    // 헤더를 제외한 데이터 행만 처리
    allRows.slice(1).forEach((row, index) => {
      const isPublic = (row[0] || '').toString().toUpperCase() === 'TRUE';
      const assignmentName = row[2] || '이름 없음';
      const startDateStr = row[4];
      const dueDateStr = row[5];
      
      console.log(`\n[${index + 2}번 행 처리중] 과제명: ${assignmentName}`);
      console.log(`  - 공개 여부 (A열): ${row[0]} -> ${isPublic}`);
      
      if (!isPublic) {
        console.log("  - 결과: 비공개 과제이므로 건너뜁니다.");
        return;
      }

      const startDate = parseLenientDate(startDateStr);
      const dueDate = parseLenientDate(dueDateStr);

      console.log(`  - 시작일 (E열): "${startDateStr}" -> ${startDate ? startDate.toISOString().split('T')[0] : '유효하지 않음'}`);
      console.log(`  - 마감일 (F열): "${dueDateStr}" -> ${dueDate ? dueDate.toISOString().split('T')[0] : '유효하지 않음'}`);
      
      if (startDate && today < startDate) {
        console.log("  - 결과: 과제 시작 전이므로 건너뜁니다.");
        return;
      }
      if (dueDate && today > dueDate) {
        console.log("  - 결과: 과제 마감일이 지났으므로 건너뜁니다.");
        return;
      }

      console.log("  - 결과: 모든 조건을 만족하므로 목록에 추가합니다.");
      assignments.push({
        id: row[1],
        name: assignmentName,
        description: `제출 기한: ${dueDateStr || '기한 없음'}`,
        dueDate: dueDateStr || '기한 없음',
      });
    });
    
    console.log(`최종 처리 완료. ${assignments.length}개의 과제를 반환합니다.`);
    return res.status(200).json({ success: true, assignments });

  } catch (error) {
    console.error('Assignments API 심각한 오류:', error);
    return res.status(500).json({ success: false, message: '과제 목록 조회 중 서버 오류가 발생했습니다.' });
  }
};
