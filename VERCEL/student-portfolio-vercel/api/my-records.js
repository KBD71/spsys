/**
 * 내 기록 조회 및 건의사항 저장 API (v5 - 20251005 버그 수정 최종판)
 * GET: 학생이 열람할 기록을 조회합니다.
 * POST: 학생이 작성한 건의사항을 시트에 저장합니다.
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

// ==============================================
// ★★★ 핵심 수정: 접근 제한 필터링 로직 수정 ★★★
// ==============================================
function isClassAllowed(studentClass, targetClass) {
  const trimmedTarget = (targetClass || '').trim();
  // 1. '전체' 이거나 값이 없으면 무조건 허용
  if (!trimmedTarget || trimmedTarget === '전체' || trimmedTarget === '전체반') {
    return true;
  }
  
  // 2. 학생의 반 정보가 없으면 무조건 거부
  if (!studentClass) {
    return false;
  }

  // 3. '1학년' 과 같은 형식 처리
  if (trimmedTarget.includes('학년')) {
    const targetGrade = trimmedTarget.replace('학년', '').trim();
    const studentGrade = (studentClass || '').split('-')[0];
    return studentGrade === targetGrade;
  }
  
  // 4. '1-6,1-7' 과 같은 형식 처리 (쉼표 기준 분리)
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
  const studentResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '학생명단_전체!A:C' });
  const studentData = studentResponse.data.values;
  if (!studentData) return res.status(404).json({ success: false, message: '학생 명단 시트를 찾을 수 없습니다.'});

  const studentRowData = studentData.find((row, idx) => idx > 0 && row[0] === studentId);
  if (!studentRowData) return res.status(404).json({ success: false, message: '학생을 찾을 수 없습니다.' });
  
  // ★★★ 핵심 수정: 학생의 반 정보는 B열(인덱스 1)에 있습니다. ★★★
  const studentClass = studentRowData[1]; 

  // '공개' 시트 읽기
  const publicSheetResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '공개!A:C' });
  const publicSheetData = publicSheetResponse.data.values;
  if (!publicSheetData || publicSheetData.length < 2) return res.status(200).json({ success: true, records: [] });

  const records = [];
  const sheetDataCache = {};

  for (let i = 1; i < publicSheetData.length; i++) {
    const publicRow = publicSheetData[i];
    const isPublic = publicRow[0] === true || publicRow[0] === 'TRUE' || publicRow[0] === 'Y';
    const targetSheetName = publicRow[1];
    const targetClass = publicRow[2] || '전체'; // C열(인덱스 2)의 대상반 정보

    // ★★★ 핵심 수정: isClassAllowed 함수를 사용하여 여기서 필터링합니다. ★★★
    if (!isPublic || !targetSheetName || !isClassAllowed(studentClass, targetClass)) {
      continue;
    }

    if (!sheetDataCache[targetSheetName]) {
      try {
        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${targetSheetName}!A:Z` });
        sheetDataCache[targetSheetName] = response.data.values || null;
      } catch (e) { 
        sheetDataCache[targetSheetName] = null; 
      }
    }
    
    const targetSheetData = sheetDataCache[targetSheetName];
    if (!targetSheetData || targetSheetData.length < 2) continue;

    const headers = targetSheetData[0];
    const publicColumnIndex = headers.indexOf('공개컬럼');
    const studentIdIndex = headers.indexOf('학번');
    const suggestionIndex = headers.indexOf('건의사항');
    const questionIndex = headers.findIndex(h => (h || '').trim().startsWith('질문'));
    
    if (publicColumnIndex === -1 || studentIdIndex === -1) continue;

    const studentRowInTarget = targetSheetData.find((r, idx) => idx > 0 && r[studentIdIndex] === studentId);
    if (!studentRowInTarget) continue;
    
    // 공개할 컬럼 목록 가져오기
    const publicColumns = [];
    // '공개' 시트가 아닌, 대상 시트의 '공개컬럼'을 기준으로 공개할 데이터를 찾습니다.
    for (let j = 1; j < targetSheetData.length; j++) {
        if(targetSheetData[j][publicColumnIndex]) {
            publicColumns.push(targetSheetData[j][publicColumnIndex]);
        }
    }
    
    // 학생 데이터에서 공개할 컬럼의 값만 추출하여 records 배열에 추가
    for (const publicColumnName of publicColumns) {
        const dataColumnIndex = headers.indexOf(publicColumnName);
        if (dataColumnIndex === -1) continue;

        let recordType = questionIndex !== -1 ? 'comment' : 'notification';
        let questionText = null;

        // 질문 내용 찾기
        if(recordType === 'comment') {
            const questionHeader = headers[questionIndex];
            const qResponse = await sheets.spreadsheets.values.get({spreadsheetId, range: `과제설정!A:K`});
            const qData = qResponse.data.values || [];
            const qHeaders = qData[0] || [];
            const qTargetSheetCol = qHeaders.indexOf('대상시트');
            const qCol = qHeaders.indexOf(questionHeader);

            if(qTargetSheetCol > -1 && qCol > -1) {
                const qRow = qData.find(r => r[qTargetSheetCol] === targetSheetName);
                if(qRow) questionText = qRow[qCol];
            }
        }
        
        records.push({
            sheetName: targetSheetName,
            label: publicColumnName,
            value: studentRowInTarget[dataColumnIndex] || '',
            type: recordType,
            question: questionText,
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

  if (studentIdColIndex === -1) return res.status(404).json({ success: false, message: '학번 컬럼을 찾을 수 없습니다.' });
  if (suggestionColIndex === -1) return res.status(404).json({ success: false, message: "'건의사항' 컬럼이 해당 시트에 존재하지 않습니다." });

  const studentRowIndex = sheetData.findIndex((row, idx) => idx > 0 && row[studentIdColIndex] === studentId);
  if (studentRowIndex === -1) {
    return res.status(404).json({ success: false, message: '학생 데이터를 찾을 수 없습니다.' });
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
