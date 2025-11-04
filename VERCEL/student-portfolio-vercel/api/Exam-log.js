/**
 * 시험 로그 기록 API
 * POST /api/exam-log
 * - 학생의 화면 이탈, 전체화면 해제 등 시험 중 행동을 기록합니다.
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { studentId, assignmentId, eventType, duration, details } = req.body;

    if (!studentId || !assignmentId || !eventType) {
      return res.status(400).json({
        success: false,
        message: '필수 정보가 누락되었습니다.'
      });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 1. 학생 정보 조회
    const studentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '학생명단_전체!A:D'
    });

    const studentData = studentResponse.data.values;
    const studentHeaders = studentData[0];
    const studentIdColIndex = studentHeaders.indexOf('학번');
    const nameColIndex = studentHeaders.indexOf('이름');
    const classColIndex = studentHeaders.indexOf('반');

    const studentRow = studentData.find((row, idx) => 
      idx > 0 && row[studentIdColIndex] === studentId
    );

    if (!studentRow) {
      return res.status(404).json({
        success: false,
        message: '학생 정보를 찾을 수 없습니다.'
      });
    }

    const studentName = studentRow[nameColIndex];
    const studentClass = studentRow[classColIndex];

    // 2. 과제명 조회
    const assignmentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '과제설정!A:Z'
    });

    const assignmentData = assignmentResponse.data.values;
    const assignmentHeaders = assignmentData[0];
    const assignmentIdColIndex = assignmentHeaders.indexOf('과제ID');
    const assignmentNameColIndex = assignmentHeaders.indexOf('과제명');

    const assignmentRow = assignmentData.find((row, idx) => 
      idx > 0 && row[assignmentIdColIndex] === assignmentId
    );

    const assignmentName = assignmentRow ? 
      assignmentRow[assignmentNameColIndex] : assignmentId;

    // 3. 시험로그 시트에 기록
    const timestamp = new Date().toISOString();
    const logEntry = [
      timestamp,
      studentId,
      studentName,
      studentClass,
      assignmentId,
      assignmentName,
      eventType,
      duration || '',
      details || ''
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: '시험로그!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [logEntry]
      }
    });

    console.log(`시험 로그 기록: ${studentName}(${studentId}) - ${eventType}`);

    return res.status(200).json({
      success: true,
      message: '로그가 기록되었습니다.'
    });

  } catch (error) {
    console.error('Exam log API error:', error);
    return res.status(500).json({
      success: false,
      message: '시험 로그 기록 실패: ' + error.message
    });
  }
};
