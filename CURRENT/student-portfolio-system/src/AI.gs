/**
 * =================================================================
 * AI Draft Generator Module (Refactored)
 * =================================================================
 * Google Sheets에서 Gemini API를 호출하여 학생 종합 의견 초안을 생성하는 모듈입니다.
 * 복잡한 데이터 취합 로직을 안정적으로 처리하기 위해 메뉴 기반/체크박스 기반 실행에 최적화되었습니다.
 */

// --- Firebase Global Variable Placeholder (GAS 환경에서는 사용되지 않으나, 플랫폼 일관성을 위해 유지) ---
const apiKey = ""; // API 키는 PropertiesService에서 관리됩니다.

/**
 * Google Sheets에 AI 기능 메뉴를 추가합니다.
 */
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('🤖 AI 기능')
      .addItem('📝 선택된 행 초안 생성 (수동)', 'generateAiSummaryManual')
      .addItem('🔑 AI API 키 설정', 'setApiKey')
      .addToUi();
}

/**
 * 사용자 속성에 Gemini API 키를 설정합니다.
 */
function setApiKey() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
      'Gemini API 키 설정', 
      'Google AI Studio에서 발급받은 API 키를 입력하세요:', 
      ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() == ui.Button.OK) {
    PropertiesService.getUserProperties().setProperty('GEMINI_API_KEY', response.getResponseText());
    ui.alert('✅ 성공', 'API 키가 저장되었습니다.', ui.ButtonSet.OK);
  }
}

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
    if (row < 2) throw new Error('데이터 행(2행 이상)을 선택해주세요.');

    // AI 기능 실행
    runAiGeneration(sheet, row);

  } catch (e) {
    ui.alert('❌ 수동 실행 실패', e.message, ui.ButtonSet.OK);
  }
}

/**
 * AI 초안 생성의 전체 과정을 조율하는 메인 함수입니다.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 현재 작업 중인 시트 객체
 * @param {number} row - AI 초안을 생성할 행 번호
 */
function runAiGeneration(sheet, row) {
  const ui = SpreadsheetApp.getUi();
  let draftCheckCell; // '초안생성' 체크박스 셀

  try {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const draftColIndex = headers.indexOf('초안생성');
    if (draftColIndex === -1) {
      Logger.log("컬럼 '초안생성'이 없어 작업을 건너뜁니다.");
      return;
    }
    draftCheckCell = sheet.getRange(row, draftColIndex + 1);

    const opinionColIndex = headers.indexOf('종합의견');
    if (opinionColIndex === -1) throw new Error("'종합의견' 컬럼을 찾을 수 없습니다.");
    const opinionCell = sheet.getRange(row, opinionColIndex + 1);

    // 덮어쓰기 확인 로직 (체크박스/수동 실행 모두 적용)
    if (opinionCell.getValue() && String(opinionCell.getValue()).trim() !== "") {
      const response = ui.alert('덮어쓰기 확인', '이미 작성된 종합의견이 있습니다. AI 초안으로 덮어쓰시겠습니까?', ui.ButtonSet.YES_NO);
      if (response !== ui.Button.YES) {
        if (draftCheckCell.isChecked()) draftCheckCell.uncheck();
        return;
      }
    }

    opinionCell.setValue("⏳ 데이터 수집 중...");
    SpreadsheetApp.flush();
    const aiData = getAiData(sheet, row, headers);

    opinionCell.setValue("🤖 AI가 초안을 작성 중입니다...");
    SpreadsheetApp.flush();
    
    // API 호출 및 결과 반환 (재시도 로직 추가)
    const summary = retryCallGeminiApi(aiData.prompt, 3);
    
    opinionCell.setValue(summary.trim());
    Logger.log(`AI 초안 생성 완료 - 학번: ${aiData.studentId}, 시트: ${sheet.getName()}`);

  } catch (e) {
    Logger.log(`❌ AI 초안 생성 실패 (시트: ${sheet.getName()}, 행: ${row}): ${e.message}\n${e.stack}`);
    ui.alert('❌ AI 초안 생성 실패', e.message, ui.ButtonSet.OK);
    // 실패 시 체크박스를 해제하여 재실행 방지
    if (draftCheckCell && draftCheckCell.isChecked()) {
      draftCheckCell.uncheck();
    }
    // 상태 셀 초기화 (에러 메시지로)
    opinionCell.setValue(`❌ 오류: ${e.message.split('\n')[0]}`);
  }
}

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

  // 1. 과제설정 시트에서 과제별 질문 목록 가져오기
  const assignmentSettingsSheet = ss.getSheetByName('과제설정');
  if (!assignmentSettingsSheet) throw new Error("'과제설정' 시트를 찾을 수 없습니다.");
  const assignmentData = assignmentSettingsSheet.getDataRange().getValues();
  const assignmentHeaders = assignmentData[0];
  const targetSheetCol = assignmentHeaders.indexOf('대상시트');
  const assignmentRow = assignmentData.find(r => r[targetSheetCol] === sheetName);
  
  // 2. 프롬프트 시트에서 AI 설정 값 가져오기
  const promptSheet = ss.getSheetByName('프롬프트');
  if (!promptSheet) throw new Error("'프롬프트' 시트를 찾을 수 없습니다.");
  const promptData = promptSheet.getDataRange().getValues();
  // 현재 시트명 또는 '종합의견'을 기준으로 프롬프트 로드
  const promptRow = promptData.find(r => r[0] === sheetName) || promptData.find(r => r[0] === '종합의견');
  if (!promptRow) throw new Error(`'프롬프트' 시트에서 '${sheetName}' 또는 '종합의견' 항목을 찾을 수 없습니다.`);
  const [ , persona, task, instructions] = promptRow;
  if (!persona || !task || !instructions) throw new Error(`'프롬프트' 시트의 '${promptRow[0]}' 항목 내용(페르소나/태스크/지시사항)이 비어있습니다.`);

  // 3. 학생 데이터 수집 및 컨텍스트 조립
  const studentRowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  let context = "";
  let lastQuestionIndex = -1;

  headers.forEach((header, index) => {
    const headerStr = String(header || '').trim();
    const cellValue = studentRowData[index];
    
    // '질문'으로 시작하고, 값이 비어있지 않은 경우
    if (headerStr.startsWith('질문') && cellValue && String(cellValue).trim() !== '') {
      lastQuestionIndex = index;
      let questionText = headerStr; // 기본값은 헤더 이름
      
      // '과제설정' 시트에서 실제 질문 내용 찾기
      if (assignmentRow) {
          const questionIndexInAssignment = assignmentHeaders.findIndex(h => h === headerStr);
          if (questionIndexInAssignment > -1) {
              questionText = assignmentRow[questionIndexInAssignment] || headerStr;
          }
      }
      
      context += `[질문: ${questionText}]\n- 학생 답변: ${cellValue}\n\n`;
    }
  });

  // 4. '질문'과 '초안생성' 사이의 '교사 추가 평가' 데이터 수집
  const draftColIndex = headers.indexOf('초안생성');
  if (lastQuestionIndex !== -1 && draftColIndex > lastQuestionIndex + 1) {
    let teacherFeedback = "";
    for (let j = lastQuestionIndex + 1; j < draftColIndex; j++) {
      // 교사 평가 헤더와 값이 존재하는 경우에만 포함
      if (studentRowData[j] && String(studentRowData[j]).trim() !== "") {
        teacherFeedback += `- ${headers[j]}: ${studentRowData[j]}\n`;
      }
    }
    if (teacherFeedback) context += `[교사 추가 평가]\n${teacherFeedback}\n\n`;
  }

  if (!context.trim()) throw new Error("요약할 학생의 답변 또는 평가 내용이 없습니다. '질문' 컬럼의 내용을 확인해주세요.");

  const studentIdIndex = headers.indexOf('학번');
  const studentId = studentIdIndex > -1 ? studentRowData[studentIdIndex] : '알 수 없음';
  
  // 5. 최종 프롬프트 구성
  const finalPrompt = 
      `${persona}\n\n` +
      `**주요 작업:** ${task}\n\n` +
      `## 학생 정보:\n- 학번: ${studentId}\n- 과제명: ${sheetName}\n\n` +
      `## 학생 제출 내용 및 교사 평가:\n${context.trim()}\n\n` +
      `## AI 초안 작성 지시사항:\n${instructions}`;

  Logger.log(`프롬프트 생성 완료 (학번: ${studentId}, 길이: ${finalPrompt.length})`);
  return { prompt: finalPrompt, studentId: studentId };
}


/**
 * Gemini API 호출을 재시도합니다. (최대 횟수: 3회)
 * @param {string} prompt - AI에게 보낼 최종 프롬프트
 * @param {number} maxRetries - 최대 재시도 횟수
 * @returns {string} AI가 생성한 텍스트
 */
function retryCallGeminiApi(prompt, maxRetries) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return callGeminiApi(prompt);
    } catch (e) {
      if (attempt < maxRetries - 1) {
        Logger.log(`API 호출 실패 (시도 ${attempt + 1}/${maxRetries}): ${e.message}. 2초 후 재시도...`);
        Utilities.sleep(2000 * (attempt + 1)); // 지수 백오프
        attempt++;
      } else {
        throw e; // 마지막 시도도 실패하면 최종 오류 발생
      }
    }
  }
  return ""; // Unreachable, but for type safety
}

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

  // 💡 Note: 더 복잡하고 긴 프롬프트 처리를 위해 'gemini-2.5-pro' 모델을 사용합니다.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
  const payload = { "contents": [{"parts": [{"text": prompt}]}] };
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true // HTTP 오류 시에도 응답 본문을 읽기 위해 설정
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode === 200) {
    const data = JSON.parse(responseBody);
    
    // 응답 텍스트를 안전하게 추출
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (text) {
      return text;
    } else {
      // API 호출 성공, 하지만 텍스트 응답이 비어있음 (e.g., 안전 필터링)
      throw new Error(`AI가 응답을 생성하지 않았습니다. (콘텐츠 필터링 가능성 또는 API 응답 구조 오류)\n응답: ${responseBody}`);
    }
  } else {
    // API 호출 자체가 실패한 경우
    let errorMessage = `AI API 호출에 실패했습니다. (HTTP ${responseCode})`;
    try {
      const errorData = JSON.parse(responseBody);
      errorMessage += `\n오류 상세: ${errorData.error.message || '알 수 없는 오류'}`;
    } catch {
      errorMessage += `\n오류 본문: ${responseBody}`;
    }
    throw new Error(errorMessage + "\n\nAPI 키가 유효한지 확인해주세요.");
  }
}
