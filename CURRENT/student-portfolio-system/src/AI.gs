/**
 * ==============================================
 * AI.gs - AI 초안 생성 모듈 (v3.0 - 안정성 강화판)
 * ==============================================
 * Gemini API 연동 및 프롬프트 관리를 담당하는 독립 실행형 모듈입니다.
 * 안정성과 명확한 오류 처리에 중점을 두어 재설계되었습니다.
 */

// --- 메뉴 등록용 함수 ---

/**
 * 메뉴에서 수동으로 AI 초안 생성을 시작하는 함수입니다.
 */
function generateAiSummaryManual() {
  const ui = SpreadsheetApp.getUi();
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const activeCell = sheet.getActiveCell();

    if (!activeCell) throw new Error('셀을 선택해주세요.');
    const row = activeCell.getRow();
    if (row < 2) throw new Error('학생 데이터 행(2행 이상)을 선택해주세요.');

    // AI 기능 실행
    runAiGeneration(sheet, row);

  } catch (e) {
    // 🚨 FIX: ui.alert(title, prompt, buttons) 형식으로 수정
    ui.alert('❌ 수동 실행 실패', e.message, ui.ButtonSet.OK);
  }
}

/**
 * 사용자 속성에 Gemini API 키를 설정합니다.
 */
function setApiKey() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Gemini API 키 설정', 'Google AI Studio에서 발급받은 API 키를 입력하세요:', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() == ui.Button.OK) {
    PropertiesService.getUserProperties().setProperty('GEMINI_API_KEY', response.getResponseText());
    ui.alert('✅ 성공', 'API 키가 저장되었습니다.', ui.ButtonSet.OK);
  }
}

// --- 핵심 실행 로직 ---

/**
 * AI 초안 생성의 전체 과정을 조율하는 메인 함수입니다.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 현재 작업 중인 시트 객체
 * @param {number} row - AI 초안을 생성할 행 번호
 */
function runAiGeneration(sheet, row) {
  const ui = SpreadsheetApp.getUi();
  let draftCell;

  try {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const draftColIndex = headers.indexOf('초안생성');
    if (draftColIndex === -1) return;
    draftCell = sheet.getRange(row, draftColIndex + 1);

    const opinionColIndex = headers.indexOf('종합의견');
    if (opinionColIndex === -1) throw new Error("'종합의견' 컬럼을 찾을 수 없습니다.");
    const opinionCell = sheet.getRange(row, opinionColIndex + 1);

    if (opinionCell.getValue() && String(opinionCell.getValue()).trim() !== "") {
      const response = ui.alert('덮어쓰기 확인', '이미 작성된 종합의견이 있습니다. AI 초안으로 덮어쓰시겠습니까?', ui.ButtonSet.YES_NO);
      if (response !== ui.Button.YES) {
        if (draftCell.isChecked()) draftCell.uncheck();
        return;
      }
    }

    opinionCell.setValue("⏳ 데이터 수집 중...");
    SpreadsheetApp.flush();
    const aiData = getAiData(sheet, row, headers);

    opinionCell.setValue("🤖 AI가 초안을 작성 중입니다...");
    SpreadsheetApp.flush();
    const summary = callGeminiApi(aiData.prompt);
    
    opinionCell.setValue(summary.trim());
    Logger.log(`AI 초안 생성 완료 - 학번: ${aiData.studentId}, 시트: ${sheet.getName()}`);

  } catch (e) {
    Logger.log(`❌ AI 초안 생성 실패 (시트: ${sheet.getName()}, 행: ${row}): ${e.message}\n${e.stack}`);
    ui.alert('❌ AI 초안 생성 실패', e.message, ui.ButtonSet.OK);
    if (draftCell && draftCell.isChecked()) draftCell.uncheck();
  }
}

// --- 데이터 수집 및 가공 ---

/**
 * AI 호출에 필요한 모든 데이터를 수집하고 프롬프트를 구성합니다.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 현재 시트
 * @param {number} row - 대상 행 번호
 * @param {Array<string>} headers - 시트의 헤더 배열
 * @returns {{prompt: string, studentId: string}} 최종 프롬프트와 학생 ID
 */
function getAiData(sheet, row, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = sheet.getName();

  const assignmentSettingsSheet = ss.getSheetByName('과제설정');
  if (!assignmentSettingsSheet) throw new Error("'과제설정' 시트를 찾을 수 없습니다.");
  const assignmentData = assignmentSettingsSheet.getDataRange().getValues();
  const assignmentHeaders = assignmentData[0];
  const targetSheetCol = assignmentHeaders.indexOf('대상시트');
  const assignmentRow = assignmentData.find(r => r[targetSheetCol] === sheetName);
  if (!assignmentRow) throw new Error(`'과제설정' 시트에서 '${sheetName}' 과제를 찾을 수 없습니다.`);

  const promptSheet = ss.getSheetByName('프롬프트');
  if (!promptSheet) throw new Error("'프롬프트' 시트를 찾을 수 없습니다.");
  const promptData = promptSheet.getDataRange().getValues();
  const promptRow = promptData.find(r => r[0] === sheetName) || promptData.find(r => r[0] === '종합의견');
  if (!promptRow) throw new Error(`'프롬프트' 시트에서 '${sheetName}' 또는 '종합의견' 프롬프트를 찾을 수 없습니다.`);
  const [ , persona, task, instructions] = promptRow;
  if (!persona || !task || !instructions) throw new Error(`'프롬프트' 시트의 '${promptRow[0]}' 항목 내용이 비어있습니다.`);

  const studentRowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  let context = "";
  
  headers.forEach((header, index) => {
    const headerStr = String(header || '');
    const cellValue = studentRowData[index];
    if (headerStr.startsWith('질문') && cellValue) {
      const questionIndex = assignmentHeaders.indexOf(headerStr);
      const questionText = (questionIndex > -1 && assignmentRow[questionIndex]) ? assignmentRow[questionIndex] : headerStr;
      context += `[질문: ${questionText}]\n- 학생 답변: ${cellValue}\n\n`;
    }
  });

  const lastQuestionIndex = headers.reduce((acc, h, i) => (String(h).startsWith('질문') ? i : acc), -1);
  const draftColIndex = headers.indexOf('초안생성');
  if (lastQuestionIndex !== -1 && draftColIndex > lastQuestionIndex + 1) {
    let teacherFeedback = "";
    for (let j = lastQuestionIndex + 1; j < draftColIndex; j++) {
      if (studentRowData[j]) {
        teacherFeedback += `- ${headers[j]}: ${studentRowData[j]}\n`;
      }
    }
    if (teacherFeedback) context += `[교사 추가 평가]\n${teacherFeedback}\n`;
  }

  if (!context.trim()) throw new Error("요약할 학생의 답변 내용이 없습니다.");

  const studentIdIndex = headers.indexOf('학번');
  const studentId = studentIdIndex > -1 ? studentRowData[studentIdIndex] : '알 수 없음';

  const finalPrompt = `${persona}\n\n${task}\n\n` +
                    `## 학생 정보:\n- 학번: ${studentId}\n- 과제명: ${sheetName}\n\n` +
                    `## 학생 제출 내용 및 교사 평가:\n${context.trim()}\n\n` +
                    `## 지시사항:\n${instructions}`;

  Logger.log(`프롬프트 생성 완료 (학번: ${studentId}, 길이: ${finalPrompt.length})`);
  return { prompt: finalPrompt, studentId: studentId };
}

// --- API 호출 ---

/**
 * Gemini API를 호출하여 콘텐츠를 생성합니다.
 * @param {string} prompt - AI에게 보낼 최종 프롬프트
 * @returns {string} AI가 생성한 텍스트
 */
function callGeminiApi(prompt) {
  const apiKey = PropertiesService.getUserProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error("API 키가 설정되지 않았습니다.\n\n메뉴에서 '🤖 AI 기능 > 🔑 AI API 키 설정'을 실행해주세요.");
  }

  // 🚨 FIX: 모델 이름을 'gemini-1.5-pro-latest'로 변경
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
  const payload = { "contents": [{"parts": [{"text": prompt}]}] };
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode === 200) {
    const data = JSON.parse(responseBody);
    
    // 🚨 FIX: API 응답 구조를 안전하게 확인하여 'Cannot read properties of undefined' 오류 방지
    if (data && data.candidates && data.candidates.length > 0 &&
        data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0 &&
        data.candidates[0].content.parts[0].text) {
      return data.candidates[0].content.parts[0].text;
    } else {
      // API 호출은 성공했으나, 안전 필터링 등으로 응답이 비어있는 경우
      throw new Error("AI가 응답을 생성하지 않았습니다. (콘텐츠 필터링 가능성)\n\n응답 내용: " + responseBody);
    }
  } else {
    // API 호출 자체가 실패한 경우
    throw new Error(`AI API 호출에 실패했습니다. (HTTP ${responseCode})\n\nAPI 키가 유효한지 확인해주세요.\n오류: ${responseBody}`);
  }
}
