/**
 * 과제 목록 조회 API
 * GET /api/assignments?studentId={학번}
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
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: '학번을 입력해주세요.'
      });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 학생 정보 조회 (반 확인용)
    const studentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '학생명단_전체!A:C'
    });

    const studentData = studentResponse.data.values;
    if (!studentData || studentData.length < 2) {
      return res.status(404).json({
        success: false,
        message: '학생 정보를 찾을 수 없습니다.'
      });
    }

    const studentRow = studentData.find((row, idx) => idx > 0 && row[0] === studentId);
    if (!studentRow) {
      return res.status(404).json({
        success: false,
        message: '학생을 찾을 수 없습니다.'
      });
    }

    const studentClass = studentRow[1]; // 반

    // 과제설정 시트 읽기
    const assignmentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '과제설정!A:F'
    });

    const assignmentData = assignmentResponse.data.values;
    if (!assignmentData || assignmentData.length < 2) {
      return res.status(200).json({
        success: true,
        assignments: []
      });
    }

    const headers = assignmentData[0];
    const assignments = [];
    const today = new Date();

    // 각 과제 처리
    for (let i = 1; i < assignmentData.length; i++) {
      const row = assignmentData[i];

      // 공개 여부 확인 (체크박스: TRUE/FALSE 또는 Y/N)
      const isPublic = row[0] === true || row[0] === 'TRUE' || row[0] === 'Y';

      if (!isPublic) continue;

      const assignmentId = row[1];
      const assignmentName = row[2];
      const targetSheet = row[3];
      const startDate = row[4] ? new Date(row[4]) : null;
      const dueDate = row[5] ? new Date(row[5]) : null;

      // 날짜 범위 확인
      if (startDate && today < startDate) continue;
      if (dueDate && today > dueDate) continue;

      // 학생이 이미 제출했는지 확인
      let submitted = false;
      try {
        const targetResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${targetSheet}!A:A`
        });
        const targetData = targetResponse.data.values || [];
        submitted = targetData.some((row, idx) => idx > 0 && row[0] === studentId);
      } catch (error) {
        // 대상시트가 없으면 무시
        console.log(`Warning: ${targetSheet} not found`);
      }

      assignments.push({
        id: assignmentId,
        name: assignmentName,
        targetSheet: targetSheet,
        startDate: startDate ? startDate.toISOString().split('T')[0] : null,
        dueDate: dueDate ? dueDate.toISOString().split('T')[0] : null,
        submitted: submitted
      });
    }

    return res.status(200).json({
      success: true,
      assignments: assignments
    });

  } catch (error) {
    console.error('Assignments API error:', error);
    return res.status(500).json({
      success: false,
      message: '과제 목록 조회 실패: ' + error.message
    });
  }
};
