/**
 * 과제 제출 API (v4 - 헤더 기반 동적 처리 리팩토링 + 캐시 무효화)
 * 1. 관련된 모든 시트('학생명단_전체', '과제설정', 대상 과제 시트)의 헤더를 동적으로 분석합니다.
 * 2. 열 순서 변경에 관계없이 학생 정보와 답변을 정확한 컬럼에 저장합니다.
 * 3. '초안생성' 체크박스 UI 깨짐 방지 로직을 그대로 유지하여 안정성을 보장합니다.
 * 4. 제출 후 관련 캐시를 무효화하여 최신 데이터를 보장합니다.
 */
const { getCacheKey, clearCache } = require('./cache');
const { getSheetsClient, createHeaderMap, setCorsHeaders, createSafeLog, createErrorResponse } = require('./utils');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { studentId, assignmentId, answers, questionColumn, answer, mode } = req.body;

    // mode가 'single'이면 개별 질문 저장, 없거나 'full'이면 전체 제출
    const isSingleQuestion = mode === 'single';

    if (!studentId || !assignmentId) {
      return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
    }

    if (isSingleQuestion && !questionColumn) {
      return res.status(400).json({ success: false, message: '질문 컬럼 정보가 누락되었습니다.' });
    }

    if (!isSingleQuestion && !answers) {
      return res.status(400).json({ success: false, message: '답변 정보가 누락되었습니다.' });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 1. 학생 정보 조회 (헤더 기반)
    const studentResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '학생명단_전체!A:Z' });
    const studentData = studentResponse.data.values;
    const studentHeaders = studentData[0];
    const studentHeaderMap = createHeaderMap(studentHeaders);
    const studentIdCol = studentHeaderMap['학번'];

    const studentRowData = studentData.find((row, idx) => idx > 0 && row[studentIdCol] === studentId);
    if (!studentRowData) return res.status(404).json({ success: false, message: '학생을 찾을 수 없습니다.' });

    const studentClass = studentRowData[studentHeaderMap['반']];
    const studentName = studentRowData[studentHeaderMap['이름']];

    // 2. 과제 정보 조회 (헤더 기반)
    const assignmentResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: '과제설정!A:Z' });
    const assignmentData = assignmentResponse.data.values;
    const assignmentHeaders = assignmentData[0];
    const assignmentHeaderMap = createHeaderMap(assignmentHeaders);
    const assignmentIdCol = assignmentHeaderMap['과제ID'];

    const assignmentRowData = assignmentData.find((row, idx) => idx > 0 && row[assignmentIdCol] === assignmentId);
    if (!assignmentRowData) return res.status(404).json({ success: false, message: '과제를 찾을 수 없습니다.' });

    const targetSheet = assignmentRowData[assignmentHeaderMap['대상시트']];

    // 3. 대상 시트 정보 읽기 및 데이터 준비 (헤더 기반)
    const targetSheetResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${targetSheet}!A:Z` });
    const targetSheetData = targetSheetResponse.data.values || [];
    const targetHeaders = targetSheetData.length > 0 ? targetSheetData[0] : [];

    const studentIdColInTarget = targetHeaders.indexOf('학번');
    const existingRowIndex = targetSheetData.findIndex((row, idx) => idx > 0 && row[studentIdColInTarget] === studentId);
    let updatedRowIndex;

    // 4-1. 개별 질문 저장 모드
    if (isSingleQuestion) {
      let questionColIndex = targetHeaders.indexOf(questionColumn);

      // ★★★ Fallback: 정확한 컬럼이 없으면 '_답' 컬럼을 찾아봄 (단일 UI -> 분리 시트 저장 지원) ★★★
      if (questionColIndex === -1) {
        questionColIndex = targetHeaders.indexOf(questionColumn + '_답');
      }

      if (questionColIndex === -1) {
        return res.status(404).json({ success: false, message: '질문 컬럼을 찾을 수 없습니다.' });
      }

      if (existingRowIndex !== -1) {
        // 기존 행이 있으면 해당 셀만 업데이트
        updatedRowIndex = existingRowIndex + 1;
        const columnLetter = String.fromCharCode(65 + questionColIndex);
        const cellRange = `${targetSheet}!${columnLetter}${updatedRowIndex}`;

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: cellRange,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[answer || '']] }
        });

        // 제출일시도 업데이트
        const submitDateColIndex = targetHeaders.indexOf('제출일시');
        if (submitDateColIndex !== -1) {
          const submitDateColumnLetter = String.fromCharCode(65 + submitDateColIndex);
          const submitDateCellRange = `${targetSheet}!${submitDateColumnLetter}${updatedRowIndex}`;
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: submitDateCellRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[new Date().toISOString()]] }
          });
        }
      } else {
        // 새 행 생성
        const newRow = targetHeaders.map((header) => {
          const trimmedHeader = header.trim();
          switch (trimmedHeader) {
            case '학번': return studentId;
            case '반': return studentClass;
            case '이름': return studentName;
            case '제출일시': return new Date().toISOString();
            case '초안생성': return false;
            default:
              return trimmedHeader === questionColumn ? (answer || '') : '';
          }
        });

        const appendResult = await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${targetSheet}!A:A`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [newRow] }
        });

        const updatedRange = appendResult.data.updates.updatedRange;
        const match = updatedRange.match(/!A(\d+):/);
        if (match) updatedRowIndex = parseInt(match[1], 10);
      }
    }
    // 4-2. 전체 제출 모드
    else {
      // 기존 데이터가 있다면 가져오기 (컬럼 보존을 위해)
      const existingRowData = existingRowIndex !== -1 ? targetSheetData[existingRowIndex] : [];

      const newRow = targetHeaders.map((header, index) => {
        const trimmedHeader = header.trim();
        switch (trimmedHeader) {
          case '학번': return studentId;
          case '반': return studentClass;
          case '이름': return studentName;
          case '제출일시': return new Date().toISOString();
          case '초안생성': return false;
          default:
            // 제공된 답변이 있으면 사용, 없으면 기존 데이터 유지 (교사 메모 등 보존)
            if (answers[trimmedHeader] !== undefined) {
              return answers[trimmedHeader];
            }
            return existingRowData[index] || '';
        }
      });

      if (existingRowIndex !== -1) {
        updatedRowIndex = existingRowIndex + 1;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${targetSheet}!A${updatedRowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [newRow] }
        });
      } else {
        const appendResult = await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${targetSheet}!A:A`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [newRow] }
        });
        const updatedRange = appendResult.data.updates.updatedRange;
        const match = updatedRange.match(/!A(\d+):/);
        if (match) updatedRowIndex = parseInt(match[1], 10);
      }
    }

    // ★★★ 시작: 이전에 주석으로 생략되었던 부분입니다 ★★★
    // 5. '초안생성' 컬럼에 체크박스 UI 강제 적용 (안정성 확보)
    if (updatedRowIndex) {
      const draftColumnIndex = targetHeaders.indexOf('초안생성');
      if (draftColumnIndex !== -1) {
        const sheetIdResponse = await sheets.spreadsheets.get({ spreadsheetId });
        const sheet = sheetIdResponse.data.sheets.find(s => s.properties.title === targetSheet);
        if (sheet) {
          const sheetId = sheet.properties.sheetId;
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [{
                setDataValidation: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: updatedRowIndex - 1,
                    endRowIndex: updatedRowIndex,
                    startColumnIndex: draftColumnIndex,
                    endColumnIndex: draftColumnIndex + 1
                  },
                  rule: {
                    condition: { type: 'BOOLEAN' },
                    strict: true
                  }
                }
              }]
            }
          });
        }
      }
    }
    // ★★★ 종료: 생략되었던 부분 끝 ★★★

    // 제출 성공 후 관련 캐시 무효화
    const assignmentCacheKey = getCacheKey('assignments', { studentId });
    const assignmentDetailCacheKey = getCacheKey('assignmentDetail', { assignmentId, studentId });
    await clearCache(assignmentCacheKey);
    await clearCache(assignmentDetailCacheKey);
    console.log(createSafeLog('[submit-assignment] 캐시 무효화', { studentId, assignmentId }));

    // 전체 제출인 경우 내 기록 캐시도 무효화
    if (!isSingleQuestion) {
      const recordsCacheKey = getCacheKey('myRecords', { studentId });
      await clearCache(recordsCacheKey);
    }

    const successMessage = isSingleQuestion ? '답변이 저장되었습니다.' : '과제가 제출되었습니다.';
    return res.status(200).json({ success: true, message: successMessage });

  } catch (error) {
    return res.status(500).json(
      createErrorResponse(error, '과제 제출 중 오류가 발생했습니다.')
    );
  }
};
