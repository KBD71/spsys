/**
 * 내 기록 조회 및 건의사항 저장 API (v6 - UI 개편 및 버그 수정 최종판)
 * GET: 학생의 반 정보를 정확히 조회하여 '대상반' 설정에 따라 기록을 완벽하게 필터링합니다.
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

// ★★★ 핵심 수정: 접근 제한 필터링 로직 강화 ★★★
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
  
  // '1-6,1-7' 또는 '1-6, 1-7' 과 같은 형식을 모두 처리
  const allowedClasses = trimmedTarget.split(',').map(cls => cls.trim());
  return allowedClasses.includes(studentClass);
}


// GET 요청 핸들러 (기록 조회)
async function handleGetRecords(req, res) {
  const { studentId } = req.query;
  if (!studentId) return res.status(400).json({ success: false, message: '학번이 필요합니다.' });

  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  // 학생 정보 (반) 조회 - A:B 범위로 수정
  const studentResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '학생명단_전체!A:B' });
  const studentData = (studentResponse.data.values || []);
  const studentRowData = studentData.find(row => row[0] === studentId);
  if (!studentRowData) return res.status(404).json({ success: false, message: '학생을 찾을 수 없습니다.' });
  
  // ★★★ 핵심 수정: 학생의 반 정보는 B열(인덱스 1)에 있습니다. ★★★
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
    const hasQuestionColumn = headers.some(h => (h || '').trim().startsWith('질문'));

    if (studentIdIndex === -1) continue;

    const studentRowInTarget = targetSheetData.find(r => r[studentIdIndex] === studentId);
    if (!studentRowInTarget) continue;
    
    // 공개된 시트의 모든 데이터를 순회하며 기록 생성
    for(let colIdx = 0; colIdx < headers.length; colIdx++) {
        const header = headers[colIdx];
        const value = studentRowInTarget[colIdx] || '';

        // 기본 정보 컬럼 및 빈 값은 건너뛰기
        if (!value || ['학번', '반', '이름', '제출일시', '초안생성', '건의사항'].indexOf(header) > -1) {
            continue;
        }
        
        records.push({
            sheetName: targetSheetName,
            label: header,
            value: value,
            type: hasQuestionColumn ? 'comment' : 'notification',
            hasSuggestion: suggestionIndex !== -1,
            suggestion: (suggestionIndex !== -1 && studentRowInTarget[suggestionIndex]) ? studentRowInTarget[suggestionIndex] : ''
        });
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

  const rowIndex = studentRowIndex + 1;
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
