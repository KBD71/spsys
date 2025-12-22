/**
 * =================================================================
 * AI Draft Generator & Detector Module (v3.2 - 2025 모델 업데이트)
 * =================================================================
 * 1. (기존) 학생 종합 의견 초안을 생성합니다.
 * 2. (기존) 학생의 답변이 AI에 의해 작성되었는지 검사하는 기능을 제공합니다.
 * 3. (수정) gemini-pro, gemini-flash, claude4.5 중 AI 제공자를 선택할 수 있습니다.
 */

// API 키는 PropertiesService에서 관리됩니다.
// 지원하는 AI 제공자: 'gemini-3-pro-preview', 'gemini-3-flash-preview', 'claude-sonnet-4-5-20250929'

/**
 * 사용자 속성에 Gemini API 키를 설정합니다.
 */
function setGeminiApiKey() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Gemini API 키 설정",
    "Google AI Studio에서 발급받은 API 키를 입력하세요:",
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() == ui.Button.OK) {
    PropertiesService.getUserProperties().setProperty(
      "GEMINI_API_KEY",
      response.getResponseText()
    );
    ui.alert("✅ 성공", "Gemini API 키가 저장되었습니다.", ui.ButtonSet.OK);
  }
}

/**
 * 사용자 속성에 Claude API 키를 설정합니다.
 */
function setClaudeApiKey() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Claude API 키 설정",
    "Anthropic Console에서 발급받은 API 키를 입력하세요:",
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() == ui.Button.OK) {
    PropertiesService.getUserProperties().setProperty(
      "CLAUDE_API_KEY",
      response.getResponseText()
    );
    ui.alert("✅ 성공", "Claude API 키가 저장되었습니다.", ui.ButtonSet.OK);
  }
}

/**
 * ★★★ 수정된 함수 (v2.5) ★★★
 * AI 제공자를 선택합니다 (gemini-pro, gemini-flash, claude4.5).
 */
function selectAiProvider() {
  const ui = SpreadsheetApp.getUi();
  const properties = PropertiesService.getUserProperties();
  const currentProvider = properties.getProperty("AI_PROVIDER") || "gemini-3-flash-preview"; // 새 기본값

  // ★★★ 수정: 요청하신 3가지 모델명으로 프롬프트 변경 ★★★
  const message = `현재 모델: ${currentProvider}\n\n` +
    `사용할 AI 모델의 번호를 입력하세요:\n\n` +
    `  1: gemini-pro (gemini-3-pro-preview)\n` +
    `  2: gemini-flash (gemini-3-flash-preview)\n` +
    `  3: claude4.5 (claude-sonnet-4-5-20250929)\n`;

  const response = ui.prompt("AI 모델 선택", message, ui.ButtonSet.OK_CANCEL);

  if (response.getSelectedButton() == ui.Button.OK) {
    const choice = response.getResponseText().trim();
    let newProvider = "";
    let providerName = "";

    if (choice === "1") {
      newProvider = "gemini-3-pro-preview";
      providerName = "gemini-pro";
    } else if (choice === "2") {
      newProvider = "gemini-3-flash-preview";
      providerName = "gemini-flash";
    } else if (choice === "3") {
      newProvider = "claude-sonnet-4-5-20250929";
      providerName = "claude4.5";
    } else {
      ui.alert("❌ 잘못된 입력", "1, 2, 3 중 하나를 입력해야 합니다.", ui.ButtonSet.OK);
      return;
    }
    
    properties.setProperty("AI_PROVIDER", newProvider);
    ui.alert("✅ 설정 완료", `기본 AI가 [${providerName}] (으)로 설정되었습니다.`, ui.ButtonSet.OK);
  }
}

/**
 * ★★★ 수정된 함수 (v2.5) ★★★
 * 현재 설정된 AI 제공자(모델명)를 반환합니다.
 */
function getAiProvider() {
  // ★★★ 수정: 기본값을 새 Flash 모델로 변경 ★★★
  return PropertiesService.getUserProperties().getProperty("AI_PROVIDER") || "gemini-3-flash-preview";
}

// ================================================================
// 기능 1: 종합의견 초안 생성
// ================================================================

/**
 * 메뉴에서 수동으로 AI 초안 생성을 시작하는 함수입니다.
 */
function generateAiSummaryManual() {
  const ui = SpreadsheetApp.getUi();
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const activeCell = sheet.getActiveCell();

    if (!activeCell) throw new Error("셀을 선택해주세요.");
    const row = activeCell.getRow();
    if (row < 2) throw new Error("데이터 행(2행 이상)을 선택해주세요.");

    runAiGeneration(sheet, row);
  } catch (e) {
    ui.alert("❌ 수동 실행 실패", e.message, ui.ButtonSet.OK);
  }
}

/**
 * 미작성 학생 일괄 AI 초안 생성
 */
function generateAiBatchForUnwritten() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  try {
    // 1. 헤더 확인
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const opinionColIndex = headers.indexOf('종합의견');
    const draftColIndex = headers.indexOf('초안생성');

    if (opinionColIndex === -1) {
      ui.alert('❌ 오류', '이 시트에는 "종합의견" 컬럼이 없습니다.', ui.ButtonSet.OK);
      return;
    }

    if (draftColIndex === -1) {
      ui.alert('❌ 오류', '이 시트에는 "초안생성" 컬럼이 없습니다.', ui.ButtonSet.OK);
      return;
    }

    // 2. 미작성 행 찾기
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      ui.alert('ℹ️ 알림', '데이터가 없습니다.', ui.ButtonSet.OK);
      return;
    }

    const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    const unwrittenRows = [];
    data.forEach((row, index) => {
      const opinion = row[opinionColIndex];
      if (!opinion || String(opinion).trim() === '') {
        unwrittenRows.push(index + 2); // 실제 행 번호
      }
    });
    if (unwrittenRows.length === 0) {
      ui.alert('✅ 완료', '모든 학생의 종합의견이 이미 작성되었습니다.', ui.ButtonSet.OK);
      return;
    }

    // 3. 사용자 확인
    const response = ui.alert(
      '🤖 AI 일괄 초안 생성',
      `${unwrittenRows.length}명의 미작성 학생에 대해 AI 초안을 생성합니다.\n\n` +
      `예상 소요 시간: 약 ${Math.ceil(unwrittenRows.length * 10 / 60)}분\n\n계속하시겠습니까?`,
      ui.ButtonSet.YES_NO
    );
    if (response !== ui.Button.YES) {
      return;
    }

    // 4. 일괄 생성 실행
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `${unwrittenRows.length}명의 AI 초안을 생성 중입니다...`,
      '🚀 시작',
      -1
    );
    let successCount = 0;
    let failCount = 0;

    unwrittenRows.forEach((rowNum, index) => {
      try {
        SpreadsheetApp.getActiveSpreadsheet().toast(
          `진행 중: ${index + 1}/${unwrittenRows.length}명`,
          '🤖 AI 생성 중',
          3
        );

        runAiGeneration(sheet, rowNum);
        successCount++;

        // Rate Limit 방지를 위해 각 호출 사이 2초 대기
        if (index < unwrittenRows.length - 1) {
          Utilities.sleep(2000);
        }
      } catch (e) {
        Logger.log(`[AI 일괄생성] 실패 - 행 ${rowNum}: ${e.message}`);
        failCount++;
      }
    });
    // 5. 결과 보고
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `성공: ${successCount}명, 실패: ${failCount}명`,
      '✅ 일괄 생성 완료',
      10
    );
    ui.alert(
      '✅ AI 일괄 초안 생성 완료',
      `성공: ${successCount}명\n실패: ${failCount}명\n\n` +
      (failCount > 0 ? '실패한 행은 로그(보기 > 로그)를 확인하세요.' : '모든 초안이 성공적으로 생성되었습니다.'),
      ui.ButtonSet.OK
    );
  } catch (e) {
    Logger.log(`[AI 일괄생성] 오류: ${e.message}\n${e.stack}`);
    ui.alert('❌ 오류', `AI 일괄 생성 중 오류가 발생했습니다:\n${e.message}`, ui.ButtonSet.OK);
  }
}

/**
 * AI 초안 생성의 전체 과정을 조율하는 메인 함수입니다.
 */
function runAiGeneration(sheet, row) {
  const ui = SpreadsheetApp.getUi();
  let draftCheckCell, opinionCell;
  try {
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    const draftColIndex = headers.indexOf("초안생성");
    if (draftColIndex === -1) {
      Logger.log("컬럼 '초안생성'이 없어 작업을 건너뜁니다.");
      return;
    }
    draftCheckCell = sheet.getRange(row, draftColIndex + 1);

    const opinionColIndex = headers.indexOf("종합의견");
    if (opinionColIndex === -1)
      throw new Error("'종합의견' 컬럼을 찾을 수 없습니다.");
    opinionCell = sheet.getRange(row, opinionColIndex + 1);

    if (
      opinionCell.getValue() &&
      String(opinionCell.getValue()).trim() !== ""
    ) {
      const response = ui.alert(
        "덮어쓰기 확인",
        "이미 작성된 종합의견이 있습니다. AI 초안으로 덮어쓰시겠습니까?",
        ui.ButtonSet.YES_NO
      );
      if (response !== ui.Button.YES) {
        if (draftCheckCell.isChecked()) draftCheckCell.uncheck();
        return;
      }
    }

    opinionCell
      .setValue("⏳ 데이터 수집 중...")
      .setHorizontalAlignment("center");
    SpreadsheetApp.flush();
    const aiData = getAiDataForSummary(sheet, row, headers);

    const provider = getAiProvider(); // 예: "gemini-3-flash-preview"
    opinionCell.setValue(`🤖 [${provider}] 초안 작성 중...`);
    SpreadsheetApp.flush();

    const summary = retryCallAiApi(provider, aiData.prompt, 3);

    opinionCell.setValue(summary.trim()).setHorizontalAlignment("left");
    Logger.log(createSafeLog(`[AI 초안] 생성 완료 - 시트: ${sheet.getName()}`, { studentId: aiData.studentId }));
  } catch (e) {
    Logger.log(
      `❌ AI 초안 생성 실패 (시트: ${sheet.getName()}, 행: ${row}): ${
        e.message
      }\n${e.stack}`
    );
    if (opinionCell)
      opinionCell
        .setValue(`❌ 오류: ${e.message.split("\n")[0]}`)
        .setHorizontalAlignment("left");
    if (draftCheckCell && draftCheckCell.isChecked()) draftCheckCell.uncheck();
    ui.alert("❌ AI 초안 생성 실패", e.message, ui.ButtonSet.OK);
  }
}

/**
 * AI 초안 생성에 필요한 데이터를 수집하고 프롬프트를 구성합니다.
 */
/**
 * AI 초안 생성에 필요한 데이터를 수집하고 프롬프트를 구성합니다.
 * (v3.3: 종합 데이터 시트 지원 추가)
 */
function getAiDataForSummary(sheet, row, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = sheet.getName();
  const assignmentSettingsSheet = ss.getSheetByName("과제설정");
  
  // 1. 과제 설정 확인
  let isAssignmentSheet = false;
  let assignmentRow = null;
  let assignmentHeaders = [];
  
  if (assignmentSettingsSheet) {
    const assignmentData = assignmentSettingsSheet.getDataRange().getValues();
    assignmentHeaders = assignmentData[0];
    const targetSheetCol = assignmentHeaders.indexOf("대상시트");
    if (targetSheetCol > -1) {
      assignmentRow = assignmentData.find((r) => r[targetSheetCol] === sheetName);
      if (assignmentRow) isAssignmentSheet = true;
    }
  }

  // 2. 프롬프트 데이터 가져오기
  const promptSheet = ss.getSheetByName("프롬프트");
  if (!promptSheet) throw new Error("'프롬프트' 시트를 찾을 수 없습니다.");
  const promptData = promptSheet.getDataRange().getValues();
  
  // 과제 이름으로 찾거나, 없으면 '종합의견' 기본 프롬프트 사용
  const promptRow =
    promptData.find((r) => r[0] === sheetName) ||
    promptData.find((r) => r[0] === "종합의견"); // 종합 데이터 시트도 '종합의견' 프롬프트 사용

  if (!promptRow)
    throw new Error(
      `'프롬프트' 시트에서 '${sheetName}' 또는 '종합의견' 항목을 찾을 수 없습니다.`
    );
  const [, persona, task, instructions] = promptRow;
  if (!persona || !task || !instructions)
    throw new Error(
      `'프롬프트' 시트의 '${promptRow[0]}' 항목 내용(페르소나/태스크/지시사항)이 비어있습니다.`
    );

  const studentRowData = sheet
    .getRange(row, 1, 1, headers.length)
    .getValues()[0];
  let context = "";
    
  // 3. 데이터 수집 로직 (과제 시트 vs 종합 시트)
  if (isAssignmentSheet) {
      // [기존 로직] 과제 시트: '질문'으로 시작하는 컬럼만 수집
      let lastQuestionIndex = -1;
      headers.forEach((header, index) => {
        const headerStr = String(header || "").trim();
        const cellValue = studentRowData[index];
        if (
          headerStr.startsWith("질문") &&
          cellValue &&
          String(cellValue).trim() !== ""
        ) {
          lastQuestionIndex = index;
          let questionText = headerStr;
          // 과제 설정에서 실제 질문 텍스트 찾기
          if (assignmentRow) {
            const questionIndexInAssignment = assignmentHeaders.findIndex(
               (h) => h === headerStr
            );
            if (questionIndexInAssignment > -1) {
              questionText = assignmentRow[questionIndexInAssignment] || headerStr;
            }
          }
          context += `[질문: ${questionText}]\n- 학생 답변: ${cellValue}\n\n`;
        }
      });
      
      // 교사 추가 평가 (질문 뒤 ~ 초안생성 앞 사이의 컬럼)
      const draftColIndex = headers.indexOf("초안생성");
      if (lastQuestionIndex !== -1 && draftColIndex > lastQuestionIndex + 1) {
        let teacherFeedback = "";
        for (let j = lastQuestionIndex + 1; j < draftColIndex; j++) {
          if (studentRowData[j] && String(studentRowData[j]).trim() !== "") {
            teacherFeedback += `- ${headers[j]}: ${studentRowData[j]}\n`;
          }
        }
        if (teacherFeedback) context += `[교사 추가 평가]\n${teacherFeedback}\n\n`;
      }

  } else {
      // [신규 로직] 종합 데이터 시트: 시스템 컬럼 제외 나머지 모든 데이터 수집
      const systemColumns = ["학번", "이름", "반", "번호", "종합의견", "초안생성", "AI 검사 결과"];
      
      headers.forEach((header, index) => {
          const headerStr = String(header || "").trim();
          if (systemColumns.includes(headerStr)) return; // 시스템 컬럼 제외
          
          const cellValue = studentRowData[index];
          if (cellValue && String(cellValue).trim() !== "") {
              context += `[${headerStr}]\n${cellValue}\n\n`;
          }
      });
  }

  if (!context.trim())
    throw new Error(
      "요약할 데이터가 없습니다. 학생의 답변이나 수집된 데이터가 비어있는지 확인해주세요."
    );

  const studentIdIndex = headers.indexOf("학번");
  const studentId =
    studentIdIndex > -1 ? studentRowData[studentIdIndex] : "알 수 없음";
  const finalPrompt =
    `${persona}\n\n` +
    `**주요 작업:** ${task}\n\n` +
    `## 학생 정보:\n- 학번: ${studentId}\n- 시트명: ${sheetName}\n\n` +
    `## 수집된 학생 데이터:\n${context.trim()}\n\n` +
    `## AI 초안 작성 지시사항:\n${instructions}`;
  Logger.log(createSafeLog(`[AI 초안] 프롬프트 생성 완료 (길이: ${finalPrompt.length})`, { studentId }));
  return { prompt: finalPrompt, studentId: studentId };
}

// ================================================================
// 기능 2: AI 사용 검사
// ================================================================

/**
 * 메뉴에서 수동으로 AI 사용 검사를 시작하는 함수입니다.
 */
function runAiDetectionManual() {
  const ui = SpreadsheetApp.getUi();
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const activeCell = sheet.getActiveCell();

    if (!activeCell) throw new Error("셀을 선택해주세요.");
    const row = activeCell.getRow();
    if (row < 2) throw new Error("데이터 행(2행 이상)을 선택해주세요.");

    runAiDetection(sheet, row);
  } catch (e) {
    ui.alert("❌ AI 검사 실패", e.message, ui.ButtonSet.OK);
  }
}

/**
 * AI 사용 검사의 전체 과정을 조율하는 메인 함수입니다.
 */
function runAiDetection(sheet, row) {
  const ui = SpreadsheetApp.getUi();
  let resultCell;
  try {
    let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    let resultColIndex = headers.indexOf("AI 검사 결과");
    // 'AI 검사 결과' 열이 없으면 맨 마지막에 자동으로 추가
    if (resultColIndex === -1) {
      const lastCol = sheet.getLastColumn();
      sheet.insertColumnsAfter(lastCol, 1);
      sheet
        .getRange(1, lastCol + 1)
        .setValue("AI 검사 결과")
        .setFontWeight("bold");
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; // 헤더 다시 읽기
      resultColIndex = headers.length - 1;
      SpreadsheetApp.flush();
    }
    resultCell = sheet.getRange(row, resultColIndex + 1);

    resultCell.setValue("⏳ 답변 분석 중...").setHorizontalAlignment("center");
    SpreadsheetApp.flush();
    const detectionData = getAiDataForDetection(sheet, row, headers);

    const provider = getAiProvider(); // 예: "gemini-3-flash-preview"
    resultCell.setValue(`🤖 [${provider}] 검사 중입니다...`);
    SpreadsheetApp.flush();

    const detectionResult = retryCallAiApi(provider, detectionData.prompt, 3);
    resultCell
      .setValue(detectionResult.trim())
      .setHorizontalAlignment("left")
      .setWrap(true);
    Logger.log(createSafeLog(`[AI 검사] 완료 - 시트: ${sheet.getName()}`, { studentId: detectionData.studentId }));
    ui.alert(
      "✅ AI 검사 완료",
      `'${sheet.getName()}' 시트의 ${row}행에 검사 결과를 기록했습니다.`,
      ui.ButtonSet.OK
    );
  } catch (e) {
    Logger.log(
      `❌ AI 사용 검사 실패 (시트: ${sheet.getName()}, 행: ${row}): ${
        e.message
      }\n${e.stack}`
    );
    if (resultCell)
      resultCell
        .setValue(`❌ 오류: ${e.message.split("\n")[0]}`)
        .setHorizontalAlignment("left");
    ui.alert("❌ AI 검사 실패", e.message, ui.ButtonSet.OK);
  }
}

/**
 * AI 사용 검사에 필요한 데이터를 수집하고 전용 프롬프트를 구성합니다.
 */
function getAiDataForDetection(sheet, row, headers) {
  const studentRowData = sheet
    .getRange(row, 1, 1, headers.length)
    .getValues()[0];
  let studentAnswers = "";

  headers.forEach((header, index) => {
    const headerStr = String(header || "").trim();
    const cellValue = studentRowData[index];
    if (
      headerStr.startsWith("질문") &&
      cellValue &&
      String(cellValue).trim() !== ""
    ) {
      studentAnswers += `- 학생 답변 (${headerStr}): ${cellValue}\n`;
    }
  });
  if (!studentAnswers.trim()) {
    throw new Error(
      "검사할 학생의 답변 내용이 없습니다. '질문' 컬럼의 내용을 확인해주세요."
    );
  }

  const studentIdIndex = headers.indexOf("학번");
  const studentId =
    studentIdIndex > -1 ?
    studentRowData[studentIdIndex] : "알 수 없음";

  // AI 사용 검사를 위한 전용 프롬프트
  const finalPrompt = `
    **역할**: 당신은 AI가 생성한 텍스트의 특징을 분석하는 전문가입니다.
    **주요 작업**: 아래에 주어진 학생의 답변이 AI(예: ChatGPT, Gemini 등)에 의해 생성되었을 확률이 얼마나 되는지 분석하고, 그 근거를 설명해주세요.
    특히 '단순 복사-붙여넣기'처럼 성의 없는 AI 사용에 초점을 맞춰주세요.
    
    **출력 형식**:
    1.  **AI 작성 확률**: [0% ~ 100%] 형태로 명확하게 백분율만 표시해주세요.
    2.  **판단 근거**: 문체의 일관성, 어휘 선택의 독창성, 개인적인 경험이나 주장의 유무, 정보의 깊이 등을 바탕으로 2~3 문장으로 간결하게 서술해주세요.
    ---
    **[분석할 학생 답변]**
    ${studentAnswers.trim()}
    ---
  `;
  Logger.log(createSafeLog(`[AI 검사] 프롬프트 생성 완료 (길이: ${finalPrompt.length})`, { studentId }));
  return { prompt: finalPrompt, studentId: studentId };
}

// ================================================================
// 공통 API 호출 함수
// ================================================================

/**
 * ★★★ 수정된 함수 (v2.5) ★★★
 * AI API 호출을 재시도합니다.
 */
function retryCallAiApi(provider, prompt, maxRetries) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      // provider(모델명)에 따라 호출할 함수를 결정
      if (provider.includes("claude")) {
        return callClaudeApi(prompt, provider); // 모델명을 인자로 전달
      } else {
        return callGeminiApi(prompt, provider); // 모델명을 인자로 전달
      }
    } catch (e) {
      const isRateLimitError =
        e.message.includes('429') ||
        e.message.includes('Resource has been exhausted') ||
        e.message.includes('rate_limit_exceeded') ||
        e.message.includes('quota');

      if (attempt < maxRetries - 1) {
        const baseDelay = isRateLimitError ? 5000 : 2000; 
        const delayMs = baseDelay * Math.pow(2, attempt);
        Logger.log(
          `[AI API 재시도] ${provider} API 호출 실패 (시도 ${attempt + 1}/${maxRetries})\n` +
          `오류: ${e.message.substring(0, 100)}...\n` +
          `${isRateLimitError ? '⚠️ Rate Limit 감지 - ' : ''}${delayMs / 1000}초 후 재시도...`
        );
        Utilities.sleep(delayMs);
        attempt++;
      } else {
        const errorPrefix = isRateLimitError ?
          '⚠️ API 사용량 한도 초과:\n' :
          '❌ AI API 호출 최종 실패:\n';
        throw new Error(
          `${errorPrefix}${e.message}\n\n` +
          `재시도 횟수: ${maxRetries}회 모두 소진\n` +
          (isRateLimitError ? '잠시 후 다시 시도하거나 API 할당량을 확인하세요.' : '')
        );
      }
    }
  }
  return "";
}

/**
 * 하위 호환성을 위한 레거시 함수 (Gemini 전용)
 * @deprecated retryCallAiApi 사용 권장
 */
function retryCallGeminiApi(prompt, maxRetries) {
  // 이전 기본값 대신 새 기본값으로 호출
  return retryCallAiApi("gemini-3-flash-preview", prompt, maxRetries);
}

/**
 * ★★★ 수정된 함수 (v2.5) ★★★
 * Gemini API를 호출하여 콘텐츠를 생성합니다.
 */
function callGeminiApi(prompt, modelName) {
  const apiKey =
    PropertiesService.getUserProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "Gemini API 키가 설정되지 않았습니다.\n\n메뉴에서 '🤖 AI 기능 > 🔑 Gemini API 키 설정'을 실행해주세요."
    );
  }

  // ★★★ 수정: modelName을 인자로 받고, 기본값을 gemini-2.5-flash로 변경 ★★★
  const modelToUse = modelName || 'gemini-3-flash-preview';
  
  // v1beta에서 v1으로 변경 (gemini-2.5-pro/flash는 v1 권장)
  const url = `https://generativelanguage.googleapis.com/v1/models/${modelToUse}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.5,
      topP: 0.95,
    },
  };
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();
  
  if (responseCode === 200) {
    const data = JSON.parse(responseBody);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      return text;
    } else {
      throw new Error(
        `Gemini가 응답을 생성하지 않았습니다. (콘텐츠 필터링 등)\n응답: ${responseBody}`
      );
    }
  } else {
    let errorMessage = `Gemini API 호출 실패 (모델: ${modelToUse}, HTTP ${responseCode})`;
    try {
      const errorData = JSON.parse(responseBody);
      errorMessage += `\n오류 상세: ${
        errorData.error.message || "알 수 없는 오류"
      }`;
    } catch {
      errorMessage += `\n오류 본문: ${responseBody}`;
    }
    throw new Error(errorMessage + "\n\nGemini API 키가 유효한지 확인해주세요.");
  }
}

/**
 * ★★★ 수정된 함수 (v4.5) ★★★
 * Claude API를 호출하여 콘텐츠를 생성합니다.
 */
function callClaudeApi(prompt, modelName) {
  const apiKey =
    PropertiesService.getUserProperties().getProperty("CLAUDE_API_KEY");
  if (!apiKey) {
    throw new Error(
      "Claude API 키가 설정되지 않았습니다.\n\n메뉴에서 '🤖 AI 기능 > 🔑 Claude API 키 설정'을 실행해주세요."
    );
  }

  const url = "https://api.anthropic.com/v1/messages";
  
  // ★★★ 수정: modelName을 인자로 받고, 기본값을 claude-sonnet-4-5-20250929로 변경 ★★★
  const modelToUse = modelName || 'claude-sonnet-4-5-20250929';
  
  const payload = {
    model: modelToUse,
    max_tokens: 4096,
    temperature: 0.5,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  };
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01" // API 버전은 유지
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();
  
  if (responseCode === 200) {
    const data = JSON.parse(responseBody);
    const text = data?.content?.[0]?.text;
    if (text) {
      return text;
    } else {
      throw new Error(
        `Claude가 응답을 생성하지 않았습니다.\n응답: ${responseBody}`
      );
    }
  } else {
    let errorMessage = `Claude API 호출 실패 (모델: ${modelToUse}, HTTP ${responseCode})`;
    try {
      const errorData = JSON.parse(responseBody);
      errorMessage += `\n오류 상세: ${
        errorData.error?.message || "알 수 없는 오류"
      }`;
    } catch {
      errorMessage += `\n오류 본문: ${responseBody}`;
    }
    throw new Error(errorMessage + "\n\nClaude API 키가 유효한지 확인해주세요.");
  }
}
