/**
 * 과제 제출 API (v3 - 체크박스 유효성 검사 오류 최종 해결)
 * 1. '초안생성' 열에 빈 텍스트('') 대신 boolean(false) 값을 명시적으로 저장합니다.
 * 2. 행 추가 후, 해당 셀에 체크박스 유효성 검사를 강제로 다시 적용하여 UI가 깨지지 않도록 보장합니다.
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
  // CORS 헤더 및 기본 요청 처리
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { studentId, assignmentId, answers } = req.body;
    if (!studentId || !assignmentId || !answers) {
      return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 1. 학생 및 과제 정보 조회
    const studentResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '학생명단_전체!A:D' });
    const studentData = studentResponse.data.values;
    const studentRowData = studentData.find((row, idx) => idx > 0 && row[0] === studentId);
    if (!studentRowData) return res.status(404).json({ success: false, message: '학생을 찾을 수 없습니다.' });
    const [ , studentClass, , studentName] = studentRowData;

    const assignmentResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '과제설정!A:F' });
    const assignmentData = assignmentResponse.data.values;
    const assignmentRowData = assignmentData.find((row, idx) => idx > 0 && row[1] === assignmentId);
    if (!assignmentRowData) return res.status(404).json({ success: false, message: '과제를 찾을 수 없습니다.' });
    const targetSheet = assignmentRowData[3];

    // 2. 대상 시트 정보 읽기 및 데이터 준비
    const targetSheetResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${targetSheet}!A:Z` });
    const targetSheetData = targetSheetResponse.data.values || [];
    const headers = targetSheetData[0] || [];
    const studentIdColIndex = headers.indexOf('학번');

    // ★★★ 핵심 수정: 헤더 순서에 맞춰 새 행을 만들고 '초안생성'에 false 값 명시 ★★★
    const newRow = headers.map((header) => {
        switch(header) {
            case '학번': return studentId;
            case '반': return studentClass;
            case '이름': return studentName;
            case '제출일시': return new Date().toISOString();
            case '초안생성': return false; // 빈 텍스트 대신 boolean false 값 사용
            default: return answers[header] || '';
        }
    });

    // 3. 학생 데이터 업데이트 또는 추가
    const existingRowIndex = targetSheetData.findIndex((row, idx) => idx > 0 && row[studentIdColIndex] === studentId);
    let updatedRowIndex;

    if (existingRowIndex !== -1) {
      updatedRowIndex = existingRowIndex + 1; // 1-based index
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${targetSheet}!A${updatedRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRow] }
      });
    } else {
      const appendResult = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${targetSheet}!A:A`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRow] }
      });
      const updatedRange = appendResult.data.updates.updatedRange;
      // 정규식으로 추가된 행의 인덱스 추출
      const match = updatedRange.match(/!A(\d+):/);
      if (match) updatedRowIndex = parseInt(match[1], 10);
    }

    // 4. '초안생성' 컬럼에 체크박스 UI 강제 적용 (안정성 확보)
    if (updatedRowIndex) {
        const draftColumnIndex = headers.indexOf('초안생성');
        if (draftColumnIndex !== -1) {
            const sheetIdResponse = await sheets.spreadsheets.get({ spreadsheetId });
            const sheet = sheetIdResponse.data.sheets.find(s => s.properties.title === targetSheet);
            if (sheet) {
                const sheetId = sheet.properties.sheetId;
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [{
                            setDataValidation: {
                                range: {
                                    sheetId: sheetId,
                                    startRowIndex: updatedRowIndex - 1,
                                    endRowIndex: updatedRowIndex,
                                    startColumnIndex: draftColumnIndex,
                                    endColumnIndex: draftColumnIndex + 1
                                },
                                rule: {
                                    condition: { type: 'BOOLEAN' },
                                    strict: true
                                }
                            }
                        }]
                    }
                });
            }
        }
    }

    return res.status(200).json({ success: true, message: '과제가 제출되었습니다.' });

  } catch (error) {
    console.error('Submit assignment API error:', error);
    return res.status(500).json({ success: false, message: '과제 제출 실패: ' + error.message, stack: error.stack });
  }
};
