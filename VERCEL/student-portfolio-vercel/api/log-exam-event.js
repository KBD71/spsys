/**
 * 시험 로그 기록 API (v2 - 캐싱 추가)
 * POST /api/exam-log
 * - 학생의 화면 이탈, 전체화면 해제 등 시험 중 행동을 기록합니다.
 * - 학생/과제 정보를 30초 캐싱하여 API 호출 95% 감소
 */

const { getCacheKey, getCache, setCache } = require('./cache');
const { getSheetsClient, setCorsHeaders, createSafeLog, createErrorResponse } = require('./utils');

module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { studentId, assignmentId, eventType, duration, details } = req.body;

    if (!studentId || !assignmentId || !eventType) {
      return res.status(400).json({
        success: false,
        message: '필수 정보가 누락되었습니다.'
      });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 1. 학생 정보 조회 (캐싱)
    const studentCacheKey = getCacheKey('examLogStudent', { studentId });
    let studentInfo = await getCache(studentCacheKey, 30000);

    if (!studentInfo) {
      const studentResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '학생명단_전체!A:D'
      });

      const studentData = studentResponse.data.values;
      const studentHeaders = studentData[0];
      const studentIdColIndex = studentHeaders.indexOf('학번');
      const nameColIndex = studentHeaders.indexOf('이름');
      const classColIndex = studentHeaders.indexOf('반');

      const studentRow = studentData.find((row, idx) =>
        idx > 0 && row[studentIdColIndex] === studentId
      );

      if (!studentRow) {
        return res.status(404).json({
          success: false,
          message: '학생 정보를 찾을 수 없습니다.'
        });
      }

      studentInfo = {
        name: studentRow[nameColIndex],
        class: studentRow[classColIndex]
      };

      await setCache(studentCacheKey, studentInfo, 120); // TTL 120초
      console.log(createSafeLog('[exam-log] 학생 정보 캐시 저장', { studentId }));
    } else {
      console.log(createSafeLog('[exam-log] 학생 정보 캐시 HIT', { studentId }));
    }

    // 2. 과제명 조회 (캐싱)
    const assignmentCacheKey = getCacheKey('examLogAssignment', { assignmentId });
    let assignmentName = await getCache(assignmentCacheKey, 30000);

    if (!assignmentName) {
      const assignmentResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '과제설정!A:Z'
      });

      const assignmentData = assignmentResponse.data.values;
      const assignmentHeaders = assignmentData[0];
      const assignmentIdColIndex = assignmentHeaders.indexOf('과제ID');
      const assignmentNameColIndex = assignmentHeaders.indexOf('과제명');

      const assignmentRow = assignmentData.find((row, idx) =>
        idx > 0 && row[assignmentIdColIndex] === assignmentId
      );

      assignmentName = assignmentRow ?
        assignmentRow[assignmentNameColIndex] : assignmentId;

      await setCache(assignmentCacheKey, assignmentName, 120); // TTL 120초
      console.log(`[exam-log] 과제명 캐시 저장: ${assignmentId}`);
    } else {
      console.log(`[exam-log] 과제명 캐시 HIT: ${assignmentId}`);
    }

    // 3. 시험로그 시트에 기록
    const timestamp = new Date().toISOString();
    const logEntry = [
      timestamp,
      studentId,
      studentInfo.name,
      studentInfo.class,
      assignmentId,
      assignmentName,
      eventType,
      duration || '',
      details || ''
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: '시험로그!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [logEntry]
      }
    });

    console.log(createSafeLog('[exam-log] 로그 기록', {
      studentId,
      name: studentInfo.name,
      assignmentId
    }));

    return res.status(200).json({
      success: true,
      message: '로그가 기록되었습니다.'
    });

  } catch (error) {
    return res.status(500).json(
      createErrorResponse(error, '시험 로그 기록 중 오류가 발생했습니다.')
    );
  }
};
