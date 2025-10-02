/**
 * 내 기록 조회 API
 * GET /api/my-records?studentId={학번}
 *
 * "공개" 시트에서 체크된 시트만 조회
 * 각 시트에서 "공개컬럼"이 TRUE인 데이터만 반환
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

async function getAllSheetNames(sheets, spreadsheetId) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title'
  });

  return response.data.sheets.map(sheet => sheet.properties.title);
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

    // "공개" 시트 읽기 (공개여부, 시트이름만)
    const publicSheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '공개!A:B'
    });

    const publicSheetData = publicSheetResponse.data.values;
    if (!publicSheetData || publicSheetData.length < 2) {
      return res.status(200).json({
        success: true,
        records: []
      });
    }

    const records = [];

    // 각 공개된 시트 처리 (2행부터)
    for (let i = 1; i < publicSheetData.length; i++) {
      const row = publicSheetData[i];
      const isPublic = row[0] === true || row[0] === 'TRUE' || row[0] === 'Y';
      const sheetName = row[1];

      if (!isPublic || !sheetName) continue;

      // 시스템 시트 제외
      if (sheetName === '학생명단_전체' || sheetName === '과제설정' ||
          sheetName === '평가항목설정' || sheetName === '공개') continue;

      try {
        // 시트 데이터 읽기
        const sheetResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:Z`
        });

        const sheetData = sheetResponse.data.values;
        if (!sheetData || sheetData.length < 2) continue;

        const headers = sheetData[0];

        // 학번 컬럼 찾기
        const studentIdColIndex = headers.indexOf('학번');
        if (studentIdColIndex === -1) continue;

        // "공개컬럼" 컬럼 찾기
        const publicColumnIndex = headers.indexOf('공개컬럼');

        // 공개컬럼 수집
        const publicColumns = [];
        if (publicColumnIndex !== -1) {
          for (let rowIdx = 1; rowIdx < sheetData.length; rowIdx++) {
            const colValue = sheetData[rowIdx][publicColumnIndex];
            if (colValue && colValue.trim()) {
              publicColumns.push(colValue.trim());
            }
          }
        }

        // 학생 행 찾기
        const studentRow = sheetData.find((row, idx) => idx > 0 && row[studentIdColIndex] === studentId);
        if (!studentRow) continue;

        // 공개컬럼이 지정되지 않은 경우 학번/반/이름 제외한 모든 컬럼 표시
        let data = {};

        if (publicColumns.length === 0) {
          // 모든 데이터 컬럼 표시 (학번, 반, 이름, 학생피드백, 제출일시, 공개컬럼 제외)
          headers.forEach((header, index) => {
            if (header !== '학번' && header !== '반' && header !== '이름' &&
                header !== '학생피드백' && header !== '제출일시' && header !== '공개컬럼') {
              data[header] = studentRow[index] || '';
            }
          });
        } else {
          // 지정된 공개컬럼만 표시
          publicColumns.forEach(colName => {
            const colIndex = headers.indexOf(colName);
            if (colIndex !== -1) {
              data[colName] = studentRow[colIndex] || '';
            }
          });
        }

        // 학생피드백 확인
        const feedbackIndex = headers.indexOf('학생피드백');
        const hasFeedback = feedbackIndex !== -1;
        const feedbackValue = hasFeedback ? (studentRow[feedbackIndex] || '') : '';

        records.push({
          sheetName: sheetName,
          data: data,
          hasFeedback: hasFeedback,
          feedback: feedbackValue
        });

      } catch (error) {
        console.log(`Warning: Could not read sheet ${sheetName}:`, error.message);
        continue;
      }
    }

    return res.status(200).json({
      success: true,
      records: records
    });

  } catch (error) {
    console.error('My records API error:', error);
    return res.status(500).json({
      success: false,
      message: '내 기록 조회 실패: ' + error.message
    });
  }
};
