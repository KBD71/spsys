/**
 * 내 기록 조회 및 건의사항 저장 API (v8 - 단순 학번 Prefix 비교 최종판)
 * GET: '대상반'에 입력된 '101, 106'과 같은 값을 학생 학번 앞 3자리와 직접 비교하여 필터링합니다.
 * POST: 건의사항을 저장합니다.
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

// ★★★ 핵심 수정: 요청하신 단순 학번 Prefix 비교 로직 ★★★
function isClassAllowed(studentId, targetClass) {
  const target = (targetClass || '').trim();
  // 규칙 1: '전체'이거나 값이 없으면 무조건 허용
  if (!target || target.toLowerCase() === '전체') {
    return true;
  }
  
  // 규칙 2: 학생 학번이 없거나 너무 짧으면 거부
  if (!studentId || studentId.length < 3) {
    return false;
  }

  // 학생 학번 앞 3자리를 가져옴 (예: '10101' -> '101')
  const studentPrefix = studentId.substring(0, 3);

  // '대상반' 값을 Prefix 목록으로 변환 (예: '101, 106' -> ['101', '106'])
  // 쉼표 뒤 공백을 허용하고, 각 항목의 앞뒤 공백을 제거
  const allowedPrefixes = target.split(',').map(prefix => prefix.trim());

  // 학생의 학번 Prefix가 허용된 Prefix 목록에 있는지 확인
  return allowedPrefixes.includes(studentPrefix);
}


// GET 요청 핸들러 (기록 조회)
async function handleGetRecords(req, res) {
  const { studentId } = req.query;
  if (!studentId) return res.status(400).json({ success: false, message: '학번이 필요합니다.' });

  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.SPREADSHEET_ID;

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

    // ★★★ 핵심 수정: isClassAllowed 함수에 'studentId'를 전달하여 필터링 ★★★
    if (!isPublic || !targetSheetName || !isClassAllowed(studentId, targetClass)) {
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
    const publicColumnIndex = headers.indexOf('공개컬럼');
    const hasQuestionColumn = headers.some(h => (h || '').trim().startsWith('질문'));

    if (studentIdIndex === -1) continue;

    const studentRowInTarget = targetSheetData.find(r => r[studentIdIndex] === studentId);
    if (!studentRowInTarget) continue;

    // 과제 시트의 '공개컬럼' 값 읽기 (모든 학생에게 동일하게 적용)
    // 2행부터 여러 행에 걸쳐 입력된 공개할 컬럼명들을 수집
    const allowedColumns = [];
    if (publicColumnIndex !== -1) {
      for (let rowIdx = 1; rowIdx < targetSheetData.length; rowIdx++) {
        const colValue = targetSheetData[rowIdx][publicColumnIndex];
        if (colValue && String(colValue).trim() !== '') {
          allowedColumns.push(String(colValue).trim());
        }
      }
    }

    for(let colIdx = 0; colIdx < headers.length; colIdx++) {
        const header = headers[colIdx];
        const value = studentRowInTarget[colIdx] || '';

        // 제외할 컬럼 리스트 (시스템 컬럼, 질문 컬럼)
        const excludedColumns = ['학번', '반', '이름', '제출일시', '초안생성', '건의사항', '공개컬럼'];

        // 값이 없거나, 제외 대상 컬럼이거나, '질문'으로 시작하는 컬럼은 건너뛰기
        if (!value ||
            excludedColumns.indexOf(header) > -1 ||
            (header && header.toString().trim().startsWith('질문'))) {
            continue;
        }

        // ★★★ 핵심 로직: '공개컬럼'이 지정되어 있으면 해당 컬럼만 표시 ★★★
        if (allowedColumns.length > 0 && !allowedColumns.includes(header)) {
            continue;
        }

        // '종합의견' 등 교사가 작성한 평가 컬럼만 표시
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
