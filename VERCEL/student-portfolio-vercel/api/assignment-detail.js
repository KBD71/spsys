/**
 * 과제 상세 정보 및 질문 조회 API (v3 - 복잡한 기능 제거 및 교사 피드백 추가)
 */

const { getCacheKey, getCache, setCache } = require('./cache');
const { getSheetsClient, createHeaderMap, setCorsHeaders, createSafeLog, createErrorResponse } = require('./utils');

module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { assignmentId, studentId } = req.query;
    if (!assignmentId || !studentId) {
      return res.status(400).json({ success: false, message: '과제ID와 학번을 입력해주세요.' });
    }

    const cacheKey = getCacheKey('assignmentDetail', { assignmentId, studentId });
    const cached = await getCache(cacheKey, 60000);
    if (cached) {
      console.log(createSafeLog('[assignment-detail] 캐시 HIT', { assignmentId, studentId }));
      return res.status(200).json(cached);
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 1. '과제설정' 시트에서 과제 정보 가져오기
    const assignmentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '과제설정!A:Z'
    });
    const assignmentData = assignmentResponse.data.values;
    if (!assignmentData || assignmentData.length < 2) {
      return res.status(404).json({ success: false, message: '과제를 찾을 수 없습니다.' });
    }

    const assignmentHeaders = assignmentData[0];
    const assignmentHeaderMap = createHeaderMap(assignmentHeaders);

    const assignmentIdColIndex = assignmentHeaderMap['과제ID'];
    if (assignmentIdColIndex === undefined) {
      return res.status(500).json({ success: false, message: "'과제설정' 시트에서 '과제ID' 컬럼을 찾을 수 없습니다." });
    }

    const assignmentRow = assignmentData.find((row, idx) => idx > 0 && row[assignmentIdColIndex] === assignmentId);
    if (!assignmentRow) {
      return res.status(404).json({ success: false, message: '해당 과제를 찾을 수 없습니다.' });
    }

    const assignmentName = assignmentRow[assignmentHeaderMap['과제명']];
    const targetSheet = assignmentName; // 대상시트 열이 삭제되었으므로 과제명을 그대로 시트명으로 사용
    const description = assignmentHeaderMap['설명'] !== undefined ? assignmentRow[assignmentHeaderMap['설명']] : '';

    // '질문'으로 시작하는 컬럼들을 추출
    const assignmentQuestions = [];
    assignmentHeaders.forEach((header, index) => {
      if (header.trim().startsWith('질문') && assignmentRow[index] && assignmentRow[index].trim()) {
        let questionText = assignmentRow[index].trim();
        let supplement = null;
        
        // 보조설명(교사기록) 파싱: "질문내용 [보조설명:문제변형]"
        const match = questionText.match(/\[보조설명:(.*?)\]$/);
        if (match) {
            supplement = match[1].trim();
            questionText = questionText.replace(match[0], '').trim();
        }

        assignmentQuestions.push({
          questionText: questionText,
          columnName: header.trim(),
          supplement: supplement
        });
      }
    });

    // 2. 대상 시트(학생 답변 시트) 정보 처리
    const targetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${targetSheet}!A:Z`
    });
    const targetSheetData = targetResponse.data.values || [];
    if (targetSheetData.length < 1) {
      return res.status(500).json({ success: false, message: '대상시트의 헤더를 읽을 수 없습니다.' });
    }

    const targetHeaders = targetSheetData[0];
    const targetHeaderMap = createHeaderMap(targetHeaders);

    const studentIdColInTarget = targetHeaderMap['학번'];
    if (studentIdColInTarget === undefined) {
      return res.status(500).json({ success: false, message: `'${targetSheet}' 시트에서 '학번' 컬럼을 찾을 수 없습니다.` });
    }

    const studentRow = targetSheetData.find((row, idx) => idx > 0 && row[studentIdColInTarget] === studentId);

    // 3. 질문과 학생 답변 및 교사 기록 매핑
    const questions = assignmentQuestions.map(q => {
      const answerColumnIndex = targetHeaderMap[q.columnName];
      const answer = (studentRow && answerColumnIndex !== undefined) ? (studentRow[answerColumnIndex] || '') : '';

      let teacherRecord = '';
      let teacherRecordName = '';
      if (q.supplement) {
          const supplementHeaderName = `${q.columnName}_교사기록_${q.supplement}`;
          const supplementIndex = targetHeaderMap[supplementHeaderName];
          if (supplementIndex !== undefined) {
              teacherRecord = studentRow && studentRow[supplementIndex] ? studentRow[supplementIndex] : '';
              teacherRecordName = q.supplement;
          }
      }

      return {
        column: q.columnName,
        question: q.questionText,
        answer: answer,
        teacherRecord: teacherRecord,
        teacherRecordName: teacherRecordName
      };
    });

    const submitted = !!studentRow;
    const submittedAtIndex = targetHeaderMap['제출일시'];
    const submittedAt = (submitted && submittedAtIndex !== undefined) ? studentRow[submittedAtIndex] : null;

    const result = {
      success: true,
      assignment: {
        id: assignmentId,
        name: assignmentName,
        targetSheet: targetSheet,
        description: description
      },
      questions: questions,
      submitted: submitted,
      submittedAt: submittedAt
    };

    const cacheTTL = submitted ? 90 : 60;
    await setCache(cacheKey, result, cacheTTL);
    console.log(createSafeLog('[assignment-detail] 캐시 저장', { assignmentId, studentId }));

    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json(
      createErrorResponse(error, '과제 상세 조회 중 오류가 발생했습니다.')
    );
  }
};
