/**
 * 과제 목록 조회 API (학생 답변 입력용)
 * '과제설정' 시트의 '공개' 여부와 날짜를 기준으로 학생이 "응답해야 할" 과제 목록을 반환합니다.
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
      range: '과제설정!A:F'
    });
    const assignmentData = assignmentResponse.data.values;
    if (!assignmentData || assignmentData.length < 2) {
      return res.status(200).json({ success: true, assignments: [] });
    }

    const assignments = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i < assignmentData.length; i++) {
      const row = assignmentData[i];
      const isPublic = row[0] === true || row[0] === 'TRUE' || row[0] === 'Y';
      
      if (!isPublic) continue;

      const startDateStr = row[4];
      const dueDateStr = row[5];
      const startDate = startDateStr ? new Date(startDateStr) : null;
      const dueDate = dueDateStr ? new Date(dueDateStr) : null;
      if (startDate) startDate.setHours(0, 0, 0, 0);
      if (dueDate) dueDate.setHours(0, 0, 0, 0);

      if ((startDate && today < startDate) || (dueDate && today > dueDate)) {
        continue;
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
