/**
 * 과제 목록 조회 API (v11 - 고교학점제 실제 반 매칭 지원)
 * - 학생명단_전체 시트에서 실제 '반' 이름을 읽어와서 대상반과 일치하는지 비교합니다.
 */
const { getCacheKey, getCache, setCache } = require('./cache');
const { getSheetsClient, createHeaderMap, setCorsHeaders, createSafeLog, createErrorResponse } = require('./utils');

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

    // 1. 학생의 실제 '반' 정보 가져오기 (고교학점제 대응)
    const studentListResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '학생명단_전체!A:E' });
    const studentData = studentListResponse.data.values || [];
    let actualStudentClass = null;
    
    if (studentData.length > 1) {
        const sHeaders = studentData[0];
        const studentIdIdx = sHeaders.indexOf('학번');
        const classIdx = sHeaders.indexOf('반');
        if (studentIdIdx !== -1 && classIdx !== -1) {
            const studentRow = studentData.find(row => row[studentIdIdx] === studentId);
            if (studentRow) {
                actualStudentClass = studentRow[classIdx];
                console.log(`[assignments] 학생 반 확인: ${studentId} -> ${actualStudentClass}`);
            }
        }
    }

    // 2. 과제 설정 가져오기
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: '과제설정!A:Z' });
    const allRows = response.data.values;
    if (!allRows || allRows.length < 2) {
      return res.status(200).json({ success: true, assignments: [] });
    }

    const headers = allRows[0];
    const headerMap = createHeaderMap(headers);

    const requiredColumns = ['과제ID', '과제명'];
    for (const col of requiredColumns) {
        if (headerMap[col] === undefined) {
            throw new Error(`'과제설정' 시트에서 '${col}' 컬럼을 찾을 수 없습니다.`);
        }
    }

    const validAssignments = [];
    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];

      const assignmentName = row[headerMap['과제명']];
      
      const targetClass = headerMap['대상반'] !== undefined ? row[headerMap['대상반']] : '전체';
      const target = (targetClass || '').trim();
      
      let isAllowed = false;
      if (!target || target === '전체') {
          isAllowed = true;
      } else if (actualStudentClass) {
          const allowedClasses = target.split(',').map(c => c.trim());
          if (allowedClasses.includes(actualStudentClass)) {
              isAllowed = true;
          }
      }

      if (!isAllowed) continue;

      validAssignments.push({
        id: row[headerMap['과제ID']],
        name: assignmentName,
        targetSheetName: assignmentName, // 대상시트 열이 사라졌으므로 과제명이 곧 대상시트명
        description: headerMap['설명'] !== undefined ? row[headerMap['설명']] : ''
      });
    }

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

          batchResponse.data.valueRanges.forEach((valueRange, index) => {
            const sheetName = uniqueSheetNames[index];
            allSheetDataCache[sheetName] = valueRange.values || [];
          });
        } catch (e) {
          console.error('[assignments] batchGet 오류:', e.message);
        }
      }
    }

    const assignments = validAssignments.map((assignment) => {
      let isSubmitted = false;
      if (assignment.targetSheetName && allSheetDataCache[assignment.targetSheetName]) {
          isSubmitted = allSheetDataCache[assignment.targetSheetName].some((r, idx) => idx > 0 && r[0] === studentId);
      }
      
      return {
        id: assignment.id,
        name: assignment.name,
        description: assignment.description,
        dueDate: '제한없음',
        submitted: isSubmitted,
        resubmissionAllowed: true
      };
    });

    const result = { success: true, assignments };
    await setCache(cacheKey, result, 60);
    console.log(createSafeLog('[assignments] 캐시 저장', { studentId }));
    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json(
      createErrorResponse(error, '과제 목록 조회 중 오류가 발생했습니다.')
    );
  }
};
