/**
 * 내 기록 조회 및 건의사항 저장 API (v6 - UI 개편 최종판)
 * GET: '질문' 컬럼 존재 여부에 따라 'comment'와 'notification' 타입을 명확히 구분하여 반환합니다.
 * POST: 학생이 작성한 건의사항을 해당 시트의 '건의사항' 컬럼에 정확히 저장합니다.
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

// 반별 접근 권한 확인 함수
function isClassAllowed(studentClass, targetClass) {
  const trimmedTarget = (targetClass || '').trim();
  if (!trimmedTarget || trimmedTarget === '전체' || trimmedTarget === '전체반') {
    return true;
  }
  if (!studentClass) return false;
  if (trimmedTarget.includes('학년')) {
    const targetGrade = trimmedTarget.replace('학년', '').trim();
    const studentGrade = (studentClass || '').split('-')[0];
    return studentGrade === targetGrade;
  }
  const allowedClasses = trimmedTarget.split(',').map(cls => cls.trim());
  return allowedClasses.includes(studentClass);
}

// GET 요청 핸들러 (기록 조회)
async function handleGetRecords(req, res) {
  const { studentId } = req.query;
  if (!studentId) return res.status(400).json({ success: false, message: '학번이 필요합니다.' });

  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  // 학생 정보 (반) 조회
  const studentResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '학생명단_전체!A:B' });
  const studentData = (studentResponse.data.values || []);
  const studentRowData = studentData.find(row => row[0] === studentId);
  if (!studentRowData) return res.status(404).json({ success: false, message: '학생을 찾을 수 없습니다.' });
  const studentClass = studentRowData[1];

  // '공개' 시트 읽기
  const publicSheetResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '공개!A:C' });
  const publicSheetData = publicSheetResponse.data.values || [];
  if (publicSheetData.length < 2) return res.status(200).json({ success: true, records: [] });

  const records = [];
  const sheetDataCache = {};

  for (let i = 1; i < publicSheetData.length; i++) {
    const publicRow = publicSheetData[i];
    const isPublic = publicRow[0] === true || publicRow[0] === 'TRUE';
    const targetSheetName = publicRow[1];
    const targetClass = publicRow[2] || '전체';

    if (!isPublic || !targetSheetName || !isClassAllowed(studentClass, targetClass)) {
      continue;
    }

    if (!sheetDataCache[targetSheetName]) {
      try {
        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${targetSheetName}!A:Z` });
        sheetDataCache[targetSheetName] = response.data.values || null;
      } catch (e) { sheetDataCache[targetSheetName] = null; }
    }
    
    const targetSheetData = sheetDataCache[targetSheetName];
    if (!targetSheetData || targetSheetData.length < 2) continue;

    const headers = targetSheetData[0];
    const studentIdIndex = headers.indexOf('학번');
    const suggestionIndex = headers.indexOf('건의사항');
    
    // ★★★ 핵심 수정: '질문'으로 시작하는 헤더가 있는지 명확히 확인 ★★★
    const hasQuestionColumn = headers.some(h => (h || '').trim().startsWith('질문'));

    if (studentIdIndex === -1) continue;

    const studentRowInTarget = targetSheetData.find(r => r[studentIdIndex] === studentId);
    if (!studentRowInTarget) continue;
    
    // 공개할 컬럼 목록 가져오기 (A열부터 순회)
    for(let colIdx = 0; colIdx < headers.length; colIdx++) {
        // '공개' 시트의 '시트이름'과 '대상반'은 공개 대상이 아님
        if (headers[colIdx] === '시트이름' || headers[colIdx] === '대상반' || headers[colIdx] === '학번' || headers[colIdx] === '이름' || headers[colIdx] === '반') continue;
        
        // '공개' 시트의 '공개' 체크박스(A열)가 TRUE인 행의 '시트이름'(B열)에 해당하는 시트의 모든 컬럼을 공개 대상으로 간주
        // (단, 위에서 제외한 기본 정보 컬럼 제외)
        // 이 부분은 교사의 설정 의도에 따라 변경될 수 있음. 현재는 '공개'된 시트의 모든 유의미한 데이터를 보여주는 것으로 해석.
        if (headers[colIdx] && studentRowInTarget[colIdx]) {
             records.push({
                sheetName: targetSheetName,
                label: headers[colIdx],
                value: studentRowInTarget[colIdx] || '',
                // ★★★ 핵심 수정: 확인된 값을 기준으로 타입을 명확히 할당 ★★★
                type: hasQuestionColumn ? 'comment' : 'notification',
                hasSuggestion: suggestionIndex !== -1,
                suggestion: (suggestionIndex !== -1 && studentRowInTarget[suggestionIndex]) ? studentRowInTarget[suggestionIndex] : ''
            });
        }
    }
  }
  return res.status(200).json({ success: true, records: records });
}

// POST 요청 핸들러 (건의사항 저장)
async function handleSaveSuggestion(req, res) {
  const { studentId, sheetName, suggestion } = req.body;
  if (!studentId || !sheetName || suggestion === undefined) {
    return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
  }

  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const sheetResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A:Z` });
  const sheetData = sheetResponse.data.values;
  if (!sheetData || sheetData.length < 2) {
    return res.status(404).json({ success: false, message: '시트 데이터를 찾을 수 없습니다.' });
  }

  const headers = sheetData[0];
  const studentIdColIndex = headers.indexOf('학번');
  const suggestionColIndex = headers.indexOf('건의사항');

  if (studentIdColIndex === -1) return res.status(404).json({ success: false, message: "'학번' 컬럼을 찾을 수 없습니다." });
  if (suggestionColIndex === -1) return res.status(404).json({ success: false, message: "'건의사항' 컬럼이 해당 시트에 존재하지 않습니다." });

  const studentRowIndex = sheetData.findIndex((row, idx) => idx > 0 && row[studentIdColIndex] === studentId);
  if (studentRowIndex === -1) {
    return res.status(404).json({ success: false, message: '해당 시트에서 학생 데이터를 찾을 수 없습니다.' });
  }

  const rowIndex = studentRowIndex + 1; // 1-based index
  const colLetter = String.fromCharCode(65 + suggestionColIndex);
  const range = `${sheetName}!${colLetter}${rowIndex}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[suggestion]] }
  });

  return res.status(200).json({ success: true, message: '건의사항이 저장되었습니다.' });
}

// API 라우터
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      return await handleGetRecords(req, res);
    } else if (req.method === 'POST') {
      return await handleSaveSuggestion(req, res);
    } else {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error in my-records:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다: ' + error.message });
  }
};
