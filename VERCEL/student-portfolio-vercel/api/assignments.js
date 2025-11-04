/**
 * 과제 목록 조회 API (v9 - 시험모드 정보 추가 + 캐싱)
 * - 학생의 과제별 제출 여부(submitted)를 확인합니다.
 * - 교사가 설정한 재제출 허용 여부(resubmissionAllowed)를 확인합니다.
 * - 시험모드 관련 설정(examMode, maxViolations, forceFullscreen)을 포함합니다.
 * - 30초 캐싱으로 동시 접속 성능 향상
 */
const { google } = require('googleapis');
const { getCacheKey, getCache, setCache } = require('./cache');

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

function isClassAllowed(studentId, targetClass) {
  const target = (targetClass || '').trim();
  if (!target || target.toLowerCase() === '전체') return true;
  if (!studentId || studentId.length < 3) return false;
  const studentPrefix = studentId.substring(0, 3);
  const allowedPrefixes = target.split(',').map(prefix => prefix.trim());
  return allowedPrefixes.includes(studentPrefix);
}

function parseFlexibleDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;
    const parts = dateString.replace(/\s/g, '').split(/[.\-]/).filter(p => p);
    let year, month, day;
    if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
    } else if (parts.length === 2) {
        year = new Date().getFullYear();
        month = parseInt(parts[0], 10);
        day = parseInt(parts[1], 10);
    } else {
        return null;
    }
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return date;
    }
    return null;
}

module.exports = async (req, res) => {
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

    const cacheKey = getCacheKey('assignments', { studentId });
    const cached = getCache(cacheKey, 30000);
    if (cached) {
      console.log(`[assignments] 캐시 HIT - 학번: ${studentId}`);
      return res.status(200).json(cached);
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: '과제설정!A:Z' });
    const allRows = response.data.values;
    if (!allRows || allRows.length < 2) {
      return res.status(200).json({ success: true, assignments: [] });
    }

    const headers = allRows[0];
    const headerMap = {};
    headers.forEach((header, index) => {
        headerMap[header.trim()] = index;
    });

    const requiredColumns = ['공개', '과제ID', '과제명', '대상시트'];
    for (const col of requiredColumns) {
        if (headerMap[col] === undefined) {
            throw new Error(`'과제설정' 시트에서 '${col}' 컬럼을 찾을 수 없습니다.`);
        }
    }
    
    const publicSheetResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '공개!A:C' });
    const publicSheetData = publicSheetResponse.data.values || [];
    const publicSettingsMap = {};
    for (let i = 1; i < publicSheetData.length; i++) {
        const publicRow = publicSheetData[i];
        const isPublic = publicRow[0] === true || publicRow[0] === 'TRUE';
        const sheetName = publicRow[1];
        const targetClass = publicRow[2] || '전체';
        if (isPublic && sheetName) {
            publicSettingsMap[sheetName] = targetClass;
        }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allSheetDataCache = {}; 

    const assignmentsPromises = allRows.slice(1).map(async (row) => {
      const isPublic = (row[headerMap['공개']] || '').toString().toUpperCase() === 'TRUE';
      if (!isPublic) return null;

      const assignmentName = row[headerMap['과제명']];
      const targetSheetName = row[headerMap['대상시트']];
      
      const targetClass = publicSettingsMap[targetSheetName];
      if (targetClass === undefined) return null;
      if (!isClassAllowed(studentId, targetClass)) return null;

      const startDateStr = headerMap['시작일'] !== undefined ? row[headerMap['시작일']] : null;
      const dueDateStr = headerMap['마감일'] !== undefined ? row[headerMap['마감일']] : null;

      const startDate = parseFlexibleDate(startDateStr);
      const dueDate = parseFlexibleDate(dueDateStr);

      if (startDate && today < startDate) return null;
      if (dueDate && today > dueDate) return null;
      
      let isSubmitted = false;
      if (targetSheetName) {
          if (!allSheetDataCache[targetSheetName]) {
              try {
                  const sheetDataResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${targetSheetName}!A:A` });
                  allSheetDataCache[targetSheetName] = sheetDataResponse.data.values || [];
              } catch (e) {
                  allSheetDataCache[targetSheetName] = [];
              }
          }
          isSubmitted = allSheetDataCache[targetSheetName].some((r, idx) => idx > 0 && r[0] === studentId);
      }
      
      const resubmissionAllowed = (headerMap['재제출허용'] !== undefined && row[headerMap['재제출허용']] || '').toString().toUpperCase() === 'TRUE';
      
      // ★★★ 시험모드 관련 정보 추가 ★★★
      const examMode = (headerMap['시험모드'] !== undefined && row[headerMap['시험모드']] || '').toString().toUpperCase() === 'TRUE';
      const maxViolations = headerMap['이탈허용횟수'] !== undefined ? parseInt(row[headerMap['이탈허용횟수']]) || 3 : 3;
      const forceFullscreen = (headerMap['강제전체화면'] !== undefined && row[headerMap['강제전체화면']] || '').toString().toUpperCase() === 'TRUE';

      return {
        id: row[headerMap['과제ID']],
        name: assignmentName,
        dueDate: dueDateStr || '기한 없음',
        submitted: isSubmitted,
        resubmissionAllowed: resubmissionAllowed,
        // ★★★ 시험모드 정보 포함 ★★★
        examMode: examMode,
        maxViolations: maxViolations,
        forceFullscreen: forceFullscreen
      };
    });
    
    const assignmentsWithNull = await Promise.all(assignmentsPromises);
    const assignments = assignmentsWithNull.filter(a => a !== null);

    const result = { success: true, assignments };
    setCache(cacheKey, result);
    console.log(`[assignments] 캐시 저장 - 학번: ${studentId}, 과제 수: ${assignments.length}`);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Assignments API 최종 오류:', error);
    return res.status(500).json({ success: false, message: '과제 목록 조회 중 서버 오류가 발생했습니다: ' + error.message });
  }
};
