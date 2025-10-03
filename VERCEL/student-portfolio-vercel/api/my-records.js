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

/**
 * 반별 접근 권한 확인
 * @param {string} studentClass - 학생의 반 (예: "1-1", "2-3")
 * @param {string} targetClass - 대상반 설정 (예: "전체", "1학년", "1-1,1-2")
 * @returns {boolean} 접근 가능 여부
 */
function isClassAllowed(studentClass, targetClass) {
  if (!targetClass || targetClass === '전체') {
    return true; // 전체 공개
  }

  // 학년별 필터링 (예: "1학년", "2학년")
  if (targetClass.includes('학년')) {
    const targetGrade = targetClass.replace('학년', '');
    const studentGrade = studentClass.split('-')[0];
    return studentGrade === targetGrade;
  }

  // 특정 반 목록 (예: "1-1,1-2,2-1")
  const allowedClasses = targetClass.split(',').map(cls => cls.trim());
  return allowedClasses.includes(studentClass);
}

module.exports = async (req, res) => {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return handleGetRecords(req, res);
  }

  if (req.method === 'POST') {
    return handleSaveSuggestion(req, res);
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
}

async function handleGetRecords(req, res) {
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

    // "공개" 시트 읽기 (공개여부, 시트이름, 대상반)
    const publicSheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '공개!A:C'
    });

    const publicSheetData = publicSheetResponse.data.values;
    if (!publicSheetData || publicSheetData.length < 2) {
      return res.status(200).json({
        success: true,
        records: []
      });
    }

    // 학생의 반 정보 조회
    const studentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '학생명단_전체!A:C'
    });

    const studentData = studentResponse.data.values;
    const student = studentData.find(row => row[0] === studentId);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: '학생을 찾을 수 없습니다.'
      });
    }

    const studentClass = student[2]; // 학생의 반 정보

    const records = [];

    // 각 공개된 시트 처리 (2행부터)
    for (let i = 1; i < publicSheetData.length; i++) {
      const row = publicSheetData[i];
      const isPublic = row[0] === true || row[0] === 'TRUE' || row[0] === 'Y';
      const sheetName = row[1];
      const targetClass = row[2] || '전체'; // 대상반 (기본값: 전체)

      if (!isPublic || !sheetName) continue;

      // 반별 필터링 체크
      if (!isClassAllowed(studentClass, targetClass)) continue;

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

        // 건의사항 확인
        const suggestionIndex = headers.indexOf('건의사항');
        const hasSuggestion = suggestionIndex !== -1;
        const suggestionValue = hasSuggestion ? (studentRow[suggestionIndex] || '') : '';

        records.push({
          sheetName: sheetName,
          data: data,
          hasFeedback: hasFeedback,
          feedback: feedbackValue,
          hasSuggestion: hasSuggestion,
          suggestion: suggestionValue
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
}

async function handleSaveSuggestion(req, res) {
  try {
    const { studentId, sheetName, suggestion } = req.body;

    if (!studentId || !sheetName || suggestion === undefined) {
      return res.status(400).json({
        success: false,
        message: '필수 파라미터가 누락되었습니다.'
      });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 시트 데이터 읽기
    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`
    });

    const sheetData = sheetResponse.data.values;
    if (!sheetData || sheetData.length < 2) {
      return res.status(404).json({
        success: false,
        message: '시트 데이터를 찾을 수 없습니다.'
      });
    }

    const headers = sheetData[0];

    // 학번 컬럼과 건의사항 컬럼 찾기
    const studentIdColIndex = headers.indexOf('학번');
    const suggestionColIndex = headers.indexOf('건의사항');

    if (studentIdColIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '학번 컬럼을 찾을 수 없습니다.'
      });
    }

    if (suggestionColIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '건의사항 컬럼을 찾을 수 없습니다.'
      });
    }

    // 학생 행 찾기
    let studentRowIndex = -1;
    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][studentIdColIndex] === studentId) {
        studentRowIndex = i + 1; // 1-based index for Google Sheets
        break;
      }
    }

    if (studentRowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '학생 데이터를 찾을 수 없습니다.'
      });
    }

    // 건의사항 업데이트
    const range = `${sheetName}!${String.fromCharCode(65 + suggestionColIndex)}${studentRowIndex}`;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[suggestion]]
      }
    });

    return res.status(200).json({
      success: true,
      message: '건의사항이 저장되었습니다.'
    });

  } catch (error) {
    console.error('Save suggestion API error:', error);
    return res.status(500).json({
      success: false,
      message: '건의사항 저장 실패: ' + error.message
    });
  }
};
