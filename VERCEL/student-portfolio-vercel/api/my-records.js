/**
 * 내 기록 조회 및 건의사항 저장 API (v13 - 알림과 코멘트 동시 표시)
 * GET: 학생의 기록(교사 코멘트) 및 알림을 조회합니다.
 * - 알림: 알림메시지가 있으면 항상 표시 (의견공개 상태 무관)
 * - 교사 코멘트: 의견공개=TRUE일 때 과제 시트의 교사 평가 표시
 * - 둘 다 동시에 표시 가능 (알림메시지 + 의견공개 체크 시)
 * - '공개' 시트가 없거나 구조가 잘못되어도 에러 대신 빈 배열 반환
 * POST: 건의사항을 저장합니다.
 *
 * v2 구조: [과제공개, 대상시트, 대상반, 의견공개, 알림메시지]
 * v1 구조 폴백: [공개, 시트이름, 대상반]
 * 10초 캐싱으로 Google Sheets 변경 빠른 반영
 */
const { google } = require('googleapis');
const { getCacheKey, getCache, setCache, clearCache } = require('./cache');

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


// GET 요청 핸들러 (기록 조회 - 캐싱 임시 비활성화)
async function handleGetRecords(req, res) {
  const { studentId } = req.query;
  if (!studentId) return res.status(400).json({ success: false, message: '학번이 필요합니다.' });

  const cacheKey = getCacheKey('myRecords', { studentId });
  const cached = await getCache(cacheKey, 10000);
  if (cached) {
    console.log(`[my-records] 캐시 HIT - 학번: ${studentId}`);
    return res.status(200).json(cached);
  }

  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  // ★★★ v2 구조 호환: 5개 컬럼 조회 ★★★
  let publicSheetData = [];
  try {
    const publicSheetResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '공개!A:E' });
    publicSheetData = publicSheetResponse.data.values || [];
  } catch (e) {
    // '공개' 시트가 없거나 접근할 수 없는 경우 빈 결과 반환
    console.log(`[my-records] '공개' 시트 조회 실패: ${e.message} - 빈 결과 반환`);
    return res.status(200).json({ success: true, records: [] });
  }

  if (publicSheetData.length < 2) {
    // 데이터가 없으면 빈 결과 반환 (에러가 아님)
    console.log('[my-records] 공개 시트에 데이터가 없음 - 빈 결과 반환');
    return res.status(200).json({ success: true, records: [] });
  }

  // ★★★ v2 구조 지원: [과제공개, 대상시트, 대상반, 의견공개, 알림메시지] ★★★
  // v1 구조 폴백: [공개, 시트이름, 대상반]
  const publicHeaders = publicSheetData[0] || [];
  const publicHeaderMap = {};
  publicHeaders.forEach((h, i) => {
    if (h && typeof h === 'string') {
      publicHeaderMap[h.trim()] = i;
    }
  });

  // 컬럼 인덱스 찾기 (v2 우선, v1 폴백)
  const isPublicIdx = publicHeaderMap['과제공개'] !== undefined ? publicHeaderMap['과제공개'] : publicHeaderMap['공개'];
  const sheetNameIdx = publicHeaderMap['대상시트'] !== undefined ? publicHeaderMap['대상시트'] : publicHeaderMap['시트이름'];
  const targetClassIdx = publicHeaderMap['대상반'];
  const opinionPublicIdx = publicHeaderMap['의견공개']; // v2 only
  const notificationMessageIdx = publicHeaderMap['알림메시지']; // v2 only

  if (isPublicIdx === undefined || sheetNameIdx === undefined) {
    // 구조를 인식할 수 없어도 에러가 아니라 빈 결과 반환
    console.log('[my-records] 공개 시트 구조 인식 실패 (헤더:', publicHeaders, ') - 빈 결과 반환');
    return res.status(200).json({ success: true, records: [] });
  }

  const records = [];
  const sheetDataCache = {};

  for (let i = 1; i < publicSheetData.length; i++) {
    const publicRow = publicSheetData[i];
    const isPublic = publicRow[isPublicIdx] === true || publicRow[isPublicIdx] === 'TRUE';
    const targetSheetName = publicRow[sheetNameIdx];
    const targetClass = publicRow[targetClassIdx] || '전체';
    const opinionPublic = opinionPublicIdx !== undefined ? (publicRow[opinionPublicIdx] === true || publicRow[opinionPublicIdx] === 'TRUE') : true; // v2: 의견공개 플래그, v1: 기본 true
    const notificationMessage = notificationMessageIdx !== undefined ? (publicRow[notificationMessageIdx] || '').trim() : ''; // v2: 알림메시지

    // ★★★ 대상반 필터링: 과제공개가 되어 있고, 대상반에 해당하는 경우만 처리 ★★★
    if (!isPublic || !targetSheetName || !isClassAllowed(studentId, targetClass)) {
      continue;
    }

    // ★★★ v2 알림 로직: 알림메시지가 있으면 항상 표시 (의견공개 상태 무관) ★★★
    if (notificationMessage) {
      records.push({
        sheetName: targetSheetName,
        label: '알림',
        value: notificationMessage,
        type: 'notification',
        hasSuggestion: false,
        suggestion: ''
      });
    }

    // ★★★ 교사 코멘트 로직: 의견공개가 TRUE인 경우에만 과제 시트의 교사 의견 표시 ★★★
    if (opinionPublic) {
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
              type: 'comment',
              hasSuggestion: suggestionIndex !== -1,
              suggestion: (suggestionIndex !== -1 && studentRowInTarget[suggestionIndex]) ? studentRowInTarget[suggestionIndex] : ''
          });
      }
    }
  }

  const result = { success: true, records: records };
  await setCache(cacheKey, result, 10);
  console.log(`[my-records] 캐시 저장 - 학번: ${studentId}, 기록 수: ${records.length}`);
  return res.status(200).json(result);
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

  const recordsCacheKey = getCacheKey('myRecords', { studentId });
  clearCache(recordsCacheKey);
  console.log(`[my-records] 캐시 무효화 - 학번: ${studentId}`);

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
