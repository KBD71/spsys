/**
 * 과제 상세 정보 및 질문 조회 API
 * GET /api/assignment-detail?assignmentId={과제ID}&studentId={학번}
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
    const { assignmentId, studentId } = req.query;

    if (!assignmentId || !studentId) {
      return res.status(400).json({
        success: false,
        message: '과제ID와 학번을 입력해주세요.'
      });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 과제설정에서 과제 정보 가져오기 (질문1~5 포함)
    const assignmentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '과제설정!A:K'  // A부터 K까지 (질문1~5 포함)
    });

    const assignmentData = assignmentResponse.data.values;
    if (!assignmentData || assignmentData.length < 2) {
      return res.status(404).json({
        success: false,
        message: '과제를 찾을 수 없습니다.'
      });
    }

    // 과제 찾기
    const assignmentRow = assignmentData.find((row, idx) => idx > 0 && row[1] === assignmentId);
    if (!assignmentRow) {
      return res.status(404).json({
        success: false,
        message: '과제를 찾을 수 없습니다.'
      });
    }

    const assignmentName = assignmentRow[2];
    const targetSheet = assignmentRow[3];
    const startDate = assignmentRow[4];
    const dueDate = assignmentRow[5];

    // 질문1~5 추출 (과제설정 시트의 6~10번째 컬럼)
    const assignmentQuestions = [];
    for (let i = 6; i <= 10; i++) {
      if (assignmentRow[i] && assignmentRow[i].trim()) {
        assignmentQuestions.push(assignmentRow[i].trim());
      }
    }

    // 대상시트의 헤더 읽기
    const targetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${targetSheet}!1:1`
    });

    const headers = targetResponse.data.values ? targetResponse.data.values[0] : [];
    if (headers.length < 4) {
      return res.status(500).json({
        success: false,
        message: '대상시트의 형식이 올바르지 않습니다.'
      });
    }

    // 학생의 기존 답변 찾기
    const studentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${targetSheet}!A:Z`
    });

    const studentData = studentResponse.data.values || [];
    const studentRow = studentData.find((row, idx) => idx > 0 && row[0] === studentId);

    // 질문과 답변 구성 (과제설정의 질문 사용, 대상시트 헤더와 매핑)
    const questions = assignmentQuestions.map((question, index) => {
      const columnIndex = index + 3; // 대상시트의 4번째 컬럼부터 (학번, 반, 이름 다음)
      const columnName = headers[columnIndex] || `컬럼${index + 1}`;
      const answer = studentRow ? (studentRow[columnIndex] || '') : '';

      return {
        column: columnName,  // 대상시트 컬럼명 (저장용)
        question: question,   // 과제설정의 질문 (표시용)
        answer: answer
      };
    });

    const submitted = !!studentRow;
    const submittedAt = submitted && studentRow[headers.indexOf('제출일시')]
      ? studentRow[headers.indexOf('제출일시')]
      : null;

    return res.status(200).json({
      success: true,
      assignment: {
        id: assignmentId,
        name: assignmentName,
        targetSheet: targetSheet,
        startDate: startDate,
        dueDate: dueDate
      },
      questions: questions,
      submitted: submitted,
      submittedAt: submittedAt
    });

  } catch (error) {
    console.error('Assignment detail API error:', error);
    return res.status(500).json({
      success: false,
      message: '과제 상세 조회 실패: ' + error.message
    });
  }
};
