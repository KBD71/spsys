/**
 * 내 기록 조회 API (읽기 전용 데이터 열람)
 * '공개' 시트의 설정을 기반으로, 각 과제 시트의 '공개컬럼' 내용을 읽어옵니다.
 * 과제 시트에 '질문' 컬럼이 있으면 '교사코멘트'로, 없으면 '알림'으로 분류합니다.
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

// 반별 필터링 헬퍼 함수
function isClassAllowed(studentClass, targetClass) {
  if (!targetClass || targetClass === '전체') return true;
  if (targetClass.includes('학년')) {
    const targetGrade = targetClass.replace('학년', '');
    const studentGrade = studentClass.split('-')[0];
    return studentGrade === targetGrade;
  }
  const allowedClasses = targetClass.split(',').map(cls => cls.trim());
  return allowedClasses.includes(studentClass);
}

module.exports = async (req, res) => {
  // CORS 및 기본 요청 처리
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ success: false, message: '학번을 입력해주세요.' });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 1. 학생 정보 조회 (반 확인용)
    const studentResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '학생명단_전체!A:C' });
    const studentData = studentResponse.data.values;
    const studentRowData = studentData.find((row, idx) => idx > 0 && row[0] === studentId);
    if (!studentRowData) {
      return res.status(404).json({ success: false, message: '학생을 찾을 수 없습니다.' });
    }
    const studentClass = studentRowData[2]; // 학생 반 정보

    // 2. '공개' 시트 읽기
    const publicSheetResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '공개!A:C' });
    const publicSheetData = publicSheetResponse.data.values;
    if (!publicSheetData || publicSheetData.length < 2) {
      return res.status(200).json({ success: true, records: [] });
    }

    const records = [];
    const sheetDataCache = {}; // 시트 데이터 캐싱

    // 3. '공개' 시트의 각 행을 순회하며 처리
    for (let i = 1; i < publicSheetData.length; i++) {
      const publicRow = publicSheetData[i];
      const isPublic = publicRow[0] === true || publicRow[0] === 'TRUE' || publicRow[0] === 'Y';
      const targetSheetName = publicRow[1];
      const targetClass = publicRow[2] || '전체';

      if (!isPublic || !targetSheetName || !isClassAllowed(studentClass, targetClass)) {
        continue;
      }

      // 4. 대상 시트(과제 시트) 데이터 캐싱
      if (!sheetDataCache[targetSheetName]) {
        try {
          const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${targetSheetName}!A:Z` });
          sheetDataCache[targetSheetName] = response.data.values || null;
        } catch (e) {
          console.log(`Warning: Cannot read sheet ${targetSheetName}`);
          sheetDataCache[targetSheetName] = null;
        }
      }
      
      const targetSheetData = sheetDataCache[targetSheetName];
      if (!targetSheetData || targetSheetData.length < 2) continue;

      // 5. 대상 시트의 '공개컬럼' 읽기
      const headers = targetSheetData[0];
      const publicColumnIndex = headers.indexOf('공개컬럼');
      const studentIdIndex = headers.indexOf('학번');
      const hasQuestionColumn = headers.includes('질문'); // '질문' 컬럼 존재 여부 확인

      if (publicColumnIndex === -1 || studentIdIndex === -1) continue;

      // 6. 학생 행 찾기
      const studentRowInTarget = targetSheetData.find((r, idx) => idx > 0 && r[studentIdIndex] === studentId);
      if (!studentRowInTarget) continue;
      
      // 7. '공개컬럼'에 지정된 모든 항목에 대해 기록 생성
      for (let j = 1; j < targetSheetData.length; j++) {
        const publicColumnName = targetSheetData[j][publicColumnIndex];
        if (!publicColumnName) continue; // 공개할 컬럼 이름이 없으면 건너뜀

        const dataColumnIndex = headers.indexOf(publicColumnName);
        if (dataColumnIndex === -1) continue;

        records.push({
          sheetName: targetSheetName,
          label: publicColumnName,
          value: studentRowInTarget[dataColumnIndex] || '',
          type: hasQuestionColumn ? 'comment' : 'notification'
        });
      }
    }

    return res.status(200).json({ success: true, records: records });

  } catch (error) {
    console.error('My Records API error:', error);
    return res.status(500).json({ success: false, message: '내 기록 조회 실패: ' + error.message });
  }
};
