/**
 * 과제 목록 조회 API (v9 - 시험모드 정보 추가 + 캐싱)
 * - 학생의 과제별 제출 여부(submitted)를 확인합니다.
 * - 교사가 설정한 재제출 허용 여부(resubmissionAllowed)를 확인합니다.
 * - 시험모드 관련 설정(examMode, maxViolations, forceFullscreen)을 포함합니다.
 * - 30초 캐싱으로 동시 접속 성능 향상
 */
const { getCacheKey, getCache, setCache } = require('./cache');
const { getSheetsClient, createHeaderMap, setCorsHeaders, createSafeLog, createErrorResponse } = require('./utils');

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
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ success: false, message: '학번을 입력해주세요.' });
    }

    const cacheKey = getCacheKey('assignments', { studentId });
    const cached = await getCache(cacheKey, 30000);
    if (cached) {
      console.log(createSafeLog('[assignments] 캐시 HIT', { studentId }));
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
    const headerMap = createHeaderMap(headers);

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

    // ★★★ 성능 개선: 먼저 모든 대상 시트 이름을 수집 ★★★
    const validAssignments = [];
    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      const isPublic = (row[headerMap['공개']] || '').toString().toUpperCase() === 'TRUE';
      if (!isPublic) continue;

      const assignmentName = row[headerMap['과제명']];
      const targetSheetName = row[headerMap['대상시트']];

      const targetClass = publicSettingsMap[targetSheetName];
      if (targetClass === undefined) continue;
      if (!isClassAllowed(studentId, targetClass)) continue;

      const startDateStr = headerMap['시작일'] !== undefined ? row[headerMap['시작일']] : null;
      const dueDateStr = headerMap['마감일'] !== undefined ? row[headerMap['마감일']] : null;

      const startDate = parseFlexibleDate(startDateStr);
      const dueDate = parseFlexibleDate(dueDateStr);

      if (startDate && today < startDate) continue;
      if (dueDate && today > dueDate) continue;

      validAssignments.push({
        row,
        assignmentName,
        targetSheetName,
        startDateStr,
        dueDateStr
      });
    }

    // ★★★ 성능 개선: 모든 시트를 한 번의 batchGet 호출로 가져오기 ★★★
    const allSheetDataCache = {};
    if (validAssignments.length > 0) {
      const uniqueSheetNames = [...new Set(validAssignments.map(a => a.targetSheetName).filter(Boolean))];

      if (uniqueSheetNames.length > 0) {
        try {
          const ranges = uniqueSheetNames.map(name => `${name}!A:A`);
          const batchResponse = await sheets.spreadsheets.values.batchGet({
            spreadsheetId,
            ranges: ranges
          });

          // 결과를 캐시에 저장
          batchResponse.data.valueRanges.forEach((valueRange, index) => {
            const sheetName = uniqueSheetNames[index];
            allSheetDataCache[sheetName] = valueRange.values || [];
          });

          console.log(`[assignments] batchGet 성능 개선: ${uniqueSheetNames.length}개 시트를 1회 호출로 가져옴 (기존 방식: ${uniqueSheetNames.length}회 호출)`);
        } catch (e) {
          console.error('[assignments] batchGet 오류:', e.message);
          // 오류 발생 시 빈 캐시로 처리
        }
      }
    }

    // ★★★ 캐시된 데이터로 과제 목록 생성 ★★★
    const assignments = validAssignments.map((assignment) => {
      const { row, assignmentName, targetSheetName, startDateStr, dueDateStr } = assignment;

      let isSubmitted = false;
      if (targetSheetName && allSheetDataCache[targetSheetName]) {
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

    const result = { success: true, assignments };
    await setCache(cacheKey, result, 30); // TTL 30초
    console.log(createSafeLog('[assignments] 캐시 저장', { studentId }));
    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json(
      createErrorResponse(error, '과제 목록 조회 중 오류가 발생했습니다.')
    );
  }
};
