/**
 * 과제 제출 API
 * POST /api/submit-assignment
 *
 * Request body:
 * {
 *   "studentId": "10101",
 *   "assignmentId": "A001",
 *   "answers": {
 *     "자기소개": "안녕하세요...",
 *     "장래희망": "개발자",
 *     ...
 *   }
 * }
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
    const { studentId, assignmentId, answers } = req.body;

    if (!studentId || !assignmentId || !answers) {
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
    const studentRow = studentData.find((row, idx) => idx > 0 && row[0] === studentId);

    if (!studentRow) {
      return res.status(404).json({
        success: false,
        message: '학생을 찾을 수 없습니다.'
      });
    }

    const studentClass = studentRow[1]; // 반
    const studentName = studentRow[3];  // 이름

    // 2. 과제설정에서 대상시트 찾기
    const assignmentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '과제설정!A:F'
    });

    const assignmentData = assignmentResponse.data.values;
    const assignmentRow = assignmentData.find((row, idx) => idx > 0 && row[1] === assignmentId);

    if (!assignmentRow) {
      return res.status(404).json({
        success: false,
        message: '과제를 찾을 수 없습니다.'
      });
    }

    const targetSheet = assignmentRow[3];

    // 3. 대상시트의 헤더 읽기
    const targetHeaderResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${targetSheet}!1:1`
    });

    const headers = targetHeaderResponse.data.values ? targetHeaderResponse.data.values[0] : [];
    if (headers.length < 4) {
      return res.status(500).json({
        success: false,
        message: '대상시트의 형식이 올바르지 않습니다.'
      });
    }

    // 4. 기존 데이터 읽기
    const targetDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${targetSheet}!A:Z`
    });

    const targetData = targetDataResponse.data.values || [];
    const existingRowIndex = targetData.findIndex((row, idx) => idx > 0 && row[0] === studentId);

    // 5. 새 데이터 구성
    const now = new Date().toISOString();
    const newRow = [studentId, studentClass, studentName];

    // 답변 추가 (헤더 순서대로)
    for (let i = 3; i < headers.length; i++) {
      const columnName = headers[i];

      // 제출일시 컬럼은 자동으로 현재 시간
      if (columnName === '제출일시') {
        newRow.push(now);
      }
      // 학생피드백 컬럼은 유지 (있으면 기존 값)
      else if (columnName === '학생피드백') {
        const existingValue = (existingRowIndex >= 0 && targetData[existingRowIndex][i]) || '';
        newRow.push(existingValue);
      }
      // 답변 컬럼
      else {
        newRow.push(answers[columnName] || '');
      }
    }

    // 6. 업데이트 또는 추가
    if (existingRowIndex >= 0) {
      // 기존 행 업데이트
      const rowNumber = existingRowIndex + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${targetSheet}!A${rowNumber}:Z${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [newRow]
        }
      });
    } else {
      // 새 행 추가
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${targetSheet}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [newRow]
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: '과제가 제출되었습니다.',
      submittedAt: now
    });

  } catch (error) {
    console.error('Submit assignment API error:', error);
    return res.status(500).json({
      success: false,
      message: '과제 제출 실패: ' + error.message
    });
  }
};
