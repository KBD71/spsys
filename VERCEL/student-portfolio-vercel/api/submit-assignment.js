/**
 * 과제 제출 API (v4 - 헤더 기반 동적 처리 리팩토링)
 * 1. 관련된 모든 시트('학생명단_전체', '과제설정', 대상 과제 시트)의 헤더를 동적으로 분석합니다.
 * 2. 열 순서 변경에 관계없이 학생 정보와 답변을 정확한 컬럼에 저장합니다.
 * 3. '초안생성' 체크박스 UI 깨짐 방지 로직을 그대로 유지하여 안정성을 보장합니다.
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
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { studentId, assignmentId, answers } = req.body;
    if (!studentId || !assignmentId || !answers) {
      return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 1. 학생 정보 조회 (헤더 기반)
    const studentResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '학생명단_전체!A:Z' });
    const studentData = studentResponse.data.values;
    const studentHeaders = studentData[0];
    const studentHeaderMap = {};
    studentHeaders.forEach((h, i) => studentHeaderMap[h.trim()] = i);
    const studentIdCol = studentHeaderMap['학번'];

    const studentRowData = studentData.find((row, idx) => idx > 0 && row[studentIdCol] === studentId);
    if (!studentRowData) return res.status(404).json({ success: false, message: '학생을 찾을 수 없습니다.' });
    
    const studentClass = studentRowData[studentHeaderMap['반']];
    const studentName = studentRowData[studentHeaderMap['이름']];

    // 2. 과제 정보 조회 (헤더 기반)
    const assignmentResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '과제설정!A:Z' });
    const assignmentData = assignmentResponse.data.values;
    const assignmentHeaders = assignmentData[0];
    const assignmentHeaderMap = {};
    assignmentHeaders.forEach((h, i) => assignmentHeaderMap[h.trim()] = i);
    const assignmentIdCol = assignmentHeaderMap['과제ID'];

    const assignmentRowData = assignmentData.find((row, idx) => idx > 0 && row[assignmentIdCol] === assignmentId);
    if (!assignmentRowData) return res.status(404).json({ success: false, message: '과제를 찾을 수 없습니다.' });
    
    const targetSheet = assignmentRowData[assignmentHeaderMap['대상시트']];

    // 3. 대상 시트 정보 읽기 및 데이터 준비 (헤더 기반)
    const targetSheetResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${targetSheet}!A:Z` });
    const targetSheetData = targetSheetResponse.data.values || [];
    const targetHeaders = targetSheetData.length > 0 ? targetSheetData[0] : [];
    
    const newRow = targetHeaders.map((header) => {
        const trimmedHeader = header.trim();
        switch(trimmedHeader) {
            case '학번': return studentId;
            case '반': return studentClass;
            case '이름': return studentName;
            case '제출일시': return new Date().toISOString();
            case '초안생성': return false;
            default:
                return answers[trimmedHeader] || '';
        }
    });

    // 4. 학생 데이터 업데이트 또는 추가
    const studentIdColInTarget = targetHeaders.indexOf('학번');
    const existingRowIndex = targetSheetData.findIndex((row, idx) => idx > 0 && row[studentIdColInTarget] === studentId);
    let updatedRowIndex;

    if (existingRowIndex !== -1) {
      updatedRowIndex = existingRowIndex + 1;
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
      const match = updatedRange.match(/!A(\d+):/);
      if (match) updatedRowIndex = parseInt(match[1], 10);
    }

    // ★★★ 시작: 이전에 주석으로 생략되었던 부분입니다 ★★★
    // 5. '초안생성' 컬럼에 체크박스 UI 강제 적용 (안정성 확보)
    if (updatedRowIndex) {
        const draftColumnIndex = targetHeaders.indexOf('초안생성');
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
    // ★★★ 종료: 생략되었던 부분 끝 ★★★

    return res.status(200).json({ success: true, message: '과제가 제출되었습니다.' });

  } catch (error) {
    console.error('Submit assignment API error:', error);
    return res.status(500).json({ success: false, message: '과제 제출 실패: ' + error.message, stack: error.stack });
  }
};
