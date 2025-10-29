/**
 * 과제 상세 정보 및 질문 조회 API (v2 - 헤더 기반 동적 처리 리팩토링)
 * - '과제설정' 시트와 개별 과제 시트의 열 순서 변경에 대응할 수 있도록 개선되었습니다.
 * - 헤더 이름을 기반으로 필요한 모든 데이터의 위치를 동적으로 찾습니다.
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

    // ★★★ 핵심 변경점: '과제설정' 시트의 헤더 맵 생성 ★★★
    const assignmentHeaders = assignmentData[0];
    const assignmentHeaderMap = {};
    assignmentHeaders.forEach((h, i) => { assignmentHeaderMap[h.trim()] = i; });
    
    // '과제ID' 컬럼의 인덱스를 찾음
    const assignmentIdColIndex = assignmentHeaderMap['과제ID'];
    if (assignmentIdColIndex === undefined) {
        return res.status(500).json({ success: false, message: "'과제설정' 시트에서 '과제ID' 컬럼을 찾을 수 없습니다." });
    }

    // 해당 과제ID를 가진 행을 찾음
    const assignmentRow = assignmentData.find((row, idx) => idx > 0 && row[assignmentIdColIndex] === assignmentId);
    if (!assignmentRow) {
      return res.status(404).json({ success: false, message: '해당 과제를 찾을 수 없습니다.' });
    }

    // ★★★ 핵심 변경점: 헤더맵을 이용해 데이터 추출 ★★★
    const assignmentName = assignmentRow[assignmentHeaderMap['과제명']];
    const targetSheet = assignmentRow[assignmentHeaderMap['대상시트']];
    const startDate = assignmentRow[assignmentHeaderMap['시작일']];
    const dueDate = assignmentRow[assignmentHeaderMap['마감일']];

    // 시험 모드 플래그 추출 (있으면 사용, 없으면 false)
    const examModeColIndex = assignmentHeaderMap['시험모드'];
    const examMode = examModeColIndex !== undefined ?
        (assignmentRow[examModeColIndex] === 'TRUE' || assignmentRow[examModeColIndex] === true || assignmentRow[examModeColIndex] === 'true') :
        false;

    // 이탈허용횟수 추출
    const maxViolationsColIndex = assignmentHeaderMap["이탈허용횟수"];
    const maxViolations = maxViolationsColIndex !== undefined ? parseInt(assignmentRow[maxViolationsColIndex]) || 3 : 3;

    // 강제전체화면 추출
    const forceFullscreenColIndex = assignmentHeaderMap["강제전체화면"];
    const forceFullscreen = forceFullscreenColIndex !== undefined ?
        (assignmentRow[forceFullscreenColIndex] === "TRUE" || assignmentRow[forceFullscreenColIndex] === true || assignmentRow[forceFullscreenColIndex] === "true") :
        false;

    // '질문'으로 시작하는 모든 컬럼을 동적으로 추출
    const assignmentQuestions = [];
    assignmentHeaders.forEach((header, index) => {
        if (header.trim().startsWith('질문') && assignmentRow[index] && assignmentRow[index].trim()) {
            assignmentQuestions.push({
                questionText: assignmentRow[index].trim(), // 실제 질문 내용
                columnName: header.trim() // 헤더 이름 (예: '질문1')
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

    // ★★★ 핵심 변경점: 대상 시트의 헤더 맵 생성 ★★★
    const targetHeaders = targetSheetData[0];
    const targetHeaderMap = {};
    targetHeaders.forEach((h, i) => { targetHeaderMap[h.trim()] = i; });

    const studentIdColInTarget = targetHeaderMap['학번'];
    if (studentIdColInTarget === undefined) {
        return res.status(500).json({ success: false, message: `'${targetSheet}' 시트에서 '학번' 컬럼을 찾을 수 없습니다.` });
    }

    // 학생의 기존 답변 행 찾기
    const studentRow = targetSheetData.find((row, idx) => idx > 0 && row[studentIdColInTarget] === studentId);

    // 3. 질문과 답변 최종 구성
    const questions = assignmentQuestions.map(q => {
        const answerColumnIndex = targetHeaderMap[q.columnName];
        const answer = (studentRow && answerColumnIndex !== undefined) ? (studentRow[answerColumnIndex] || '') : '';

        return {
            column: q.columnName,   // 대상시트 컬럼명 (저장용)
            question: q.questionText, // 과제설정의 질문 (표시용)
            answer: answer
        };
    });

    const submitted = !!studentRow;
    const submittedAtIndex = targetHeaderMap['제출일시'];
    const submittedAt = (submitted && submittedAtIndex !== undefined) ? studentRow[submittedAtIndex] : null;

    return res.status(200).json({
      success: true,
      assignment: {
        id: assignmentId,
        name: assignmentName,
        targetSheet: targetSheet,
        startDate: startDate,
        dueDate: dueDate
      },
      questions: questions,
      submitted: submitted,
      submittedAt: submittedAt,
      examMode: examMode,
      maxViolations: maxViolations,
      forceFullscreen: forceFullscreen
    });

  } catch (error) {
    console.error('Assignment detail API error:', error);
    return res.status(500).json({
      success: false,
      message: '과제 상세 조회 실패: ' + error.message
    });
  }
};
