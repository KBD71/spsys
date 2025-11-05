/**
 * =================================================================
 * AI Draft Generator & Detector Module (v3.0)
 * =================================================================
 * 1. (기존) 학생 종합 의견 초안을 생성합니다.
 * 2. (추가) 학생의 답변이 AI에 의해 작성되었는지 검사하는 기능을 제공합니다.
 * 3. (신규) Gemini와 Claude 중 AI 제공자를 선택할 수 있습니다.
 * 두 기능은 비용 효율성과 결과의 안정성을 위해 별도의 API 호출로 분리되었습니다.
 */

// API 키는 PropertiesService에서 관리됩니다.
// 지원하는 AI 제공자: 'gemini', 'claude'

/**
 * (참고) AI 기능 메뉴는 Triggers.gs의 onOpen() 함수에서 서브메뉴로 통합되어 있습니다.
 * 이 onOpen() 함수는 사용되지 않으며, 참고용으로만 남겨둡니다.
 */
// function onOpen() {
//   SpreadsheetApp.getUi()
//     .createMenu("🤖 AI 기능")
//     .addItem("📝 선택된 행 초안 생성", "generateAiSummaryManual")
//     .addSeparator()
//     .addItem("🕵️ 선택된 행 AI 사용 검사", "runAiDetectionManual")
//     .addSeparator()
//     .addItem("🔑 Gemini API 키 설정", "setGeminiApiKey")
//     .addItem("🔑 Claude API 키 설정", "setClaudeApiKey")
//     .addSeparator()
//     .addItem("⚙️ AI 제공자 선택 (Gemini/Claude)", "selectAiProvider")
//     .addToUi();
// }

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
 * AI 제공자를 선택합니다 (Gemini 또는 Claude).
 */
function selectAiProvider() {
  const ui = SpreadsheetApp.getUi();
  const currentProvider = PropertiesService.getUserProperties().getProperty("AI_PROVIDER") || "gemini";

  const response = ui.alert(
    "AI 제공자 선택",
    `현재 선택: ${currentProvider === 'gemini' ? 'Gemini' : 'Claude'}\n\n어떤 AI를 사용하시겠습니까?`,
    ui.ButtonSet.YES_NO_CANCEL
  );

  if (response == ui.Button.YES) {
    PropertiesService.getUserProperties().setProperty("AI_PROVIDER", "gemini");
    ui.alert("✅ 설정 완료", "Gemini를 사용합니다.", ui.ButtonSet.OK);
  } else if (response == ui.Button.NO) {
    PropertiesService.getUserProperties().setProperty("AI_PROVIDER", "claude");
    ui.alert("✅ 설정 완료", "Claude를 사용합니다.", ui.ButtonSet.OK);
  }
}

/**
 * 현재 설정된 AI 제공자를 반환합니다.
 */
function getAiProvider() {
  return PropertiesService.getUserProperties().getProperty("AI_PROVIDER") || "gemini";
}

// ================================================================
// 기능 1: 종합의견 초안 생성 (기존 코드와 동일)
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
 * ★★★ 신규 기능: 미작성 학생 일괄 AI 초안 생성 ★★★
 * 현재 시트에서 '종합의견'이 비어있는 모든 학생의 초안을 자동 생성합니다.
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
      ui.alert('❌ 오류', '이 시트에는 \"종합의견\" 컬럼이 없습니다.', ui.ButtonSet.OK);
      return;
    }

    if (draftColIndex === -1) {
      ui.alert('❌ 오류', '이 시트에는 \"초안생성\" 컬럼이 없습니다.', ui.ButtonSet.OK);
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

    const provider = getAiProvider();
    const providerName = provider === 'claude' ? 'Claude' : 'Gemini';
    opinionCell.setValue(`🤖 ${providerName}가 초안을 작성 중입니다...`);
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
 * (이름 변경) AI 초안 생성에 필요한 데이터를 수집하고 프롬프트를 구성합니다.
 */
function getAiDataForSummary(sheet, row, headers) {
  // ... (기존 getAiData 함수의 내용과 동일)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = sheet.getName();
  const assignmentSettingsSheet = ss.getSheetByName("과제설정");
  if (!assignmentSettingsSheet)
    throw new Error("'과제설정' 시트를 찾을 수 없습니다.");
  const assignmentData = assignmentSettingsSheet.getDataRange().getValues();
  const assignmentHeaders = assignmentData[0];
  const targetSheetCol = assignmentHeaders.indexOf("대상시트");
  const assignmentRow = assignmentData.find(
    (r) => r[targetSheetCol] === sheetName
  );
  const promptSheet = ss.getSheetByName("프롬프트");
  if (!promptSheet) throw new Error("'프롬프트' 시트를 찾을 수 없습니다.");
  const promptData = promptSheet.getDataRange().getValues();
  const promptRow =
    promptData.find((r) => r[0] === sheetName) ||
    promptData.find((r) => r[0] === "종합의견");
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
  if (!context.trim())
    throw new Error(
      "요약할 학생의 답변 또는 평가 내용이 없습니다. '질문' 컬럼의 내용을 확인해주세요."
    );
  const studentIdIndex = headers.indexOf("학번");
  const studentId =
    studentIdIndex > -1 ? studentRowData[studentIdIndex] : "알 수 없음";
  const finalPrompt =
    `${persona}\n\n` +
    `**주요 작업:** ${task}\n\n` +
    `## 학생 정보:\n- 학번: ${studentId}\n- 과제명: ${sheetName}\n\n` +
    `## 학생 제출 내용 및 교사 평가:\n${context.trim()}\n\n` +
    `## AI 초안 작성 지시사항:\n${instructions}`;
  Logger.log(createSafeLog(`[AI 초안] 프롬프트 생성 완료 (길이: ${finalPrompt.length})`, { studentId }));
  return { prompt: finalPrompt, studentId: studentId };
}

// ================================================================
// ★★★ 기능 2: AI 사용 검사 (새로 추가된 기능) ★★★
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

    const provider = getAiProvider();
    const providerName = provider === 'claude' ? 'Claude' : 'Gemini';
    resultCell.setValue(`🤖 ${providerName}가 검사 중입니다...`);
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
    studentIdIndex > -1 ? studentRowData[studentIdIndex] : "알 수 없음";

  // AI 사용 검사를 위한 전용 프롬프트
  const finalPrompt = `
    **역할**: 당신은 AI가 생성한 텍스트의 특징을 분석하는 전문가입니다.
    
    **주요 작업**: 아래에 주어진 학생의 답변이 AI(예: ChatGPT, Gemini 등)에 의해 생성되었을 확률이 얼마나 되는지 분석하고, 그 근거를 설명해주세요. 특히 '단순 복사-붙여넣기'처럼 성의 없는 AI 사용에 초점을 맞춰주세요.
    
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
// 공통 API 호출 함수 (기존 코드와 동일)
// ================================================================

/**
 * AI API 호출을 재시도합니다 (범용 함수 v2.0 - 지수 백오프 추가).
 * @param {string} provider - 'gemini' 또는 'claude'
 * @param {string} prompt - AI에게 전달할 프롬프트
 * @param {number} maxRetries - 최대 재시도 횟수
 */
function retryCallAiApi(provider, prompt, maxRetries) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      if (provider === "claude") {
        return callClaudeApi(prompt);
      } else {
        return callGeminiApi(prompt);
      }
    } catch (e) {
      const isRateLimitError =
        e.message.includes('429') ||
        e.message.includes('Resource has been exhausted') ||
        e.message.includes('rate_limit_exceeded') ||
        e.message.includes('quota');

      if (attempt < maxRetries - 1) {
        // ★★★ 지수 백오프: Rate Limit 에러는 더 긴 대기 시간 ★★★
        const baseDelay = isRateLimitError ? 5000 : 2000; // Rate Limit: 5초, 기타: 2초
        const delayMs = baseDelay * Math.pow(2, attempt); // 지수 증가: 5→10→20초 또는 2→4→8초

        Logger.log(
          `[AI API 재시도] ${provider === 'claude' ? 'Claude' : 'Gemini'} API 호출 실패 (시도 ${attempt + 1}/${maxRetries})\n` +
          `오류: ${e.message.substring(0, 100)}...\n` +
          `${isRateLimitError ? '⚠️ Rate Limit 감지 - ' : ''}${delayMs / 1000}초 후 재시도...`
        );

        Utilities.sleep(delayMs);
        attempt++;
      } else {
        // 최종 실패 시 더 자세한 오류 메시지
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
  return retryCallAiApi("gemini", prompt, maxRetries);
}

/**
 * Gemini API를 호출하여 콘텐츠를 생성합니다.
 */
function callGeminiApi(prompt) {
  const apiKey =
    PropertiesService.getUserProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "Gemini API 키가 설정되지 않았습니다.\n\n메뉴에서 '🤖 AI 기능 > 🔑 Gemini API 키 설정'을 실행해주세요."
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
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
    let errorMessage = `Gemini API 호출 실패 (HTTP ${responseCode})`;
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
 * Claude API를 호출하여 콘텐츠를 생성합니다.
 */
function callClaudeApi(prompt) {
  const apiKey =
    PropertiesService.getUserProperties().getProperty("CLAUDE_API_KEY");
  if (!apiKey) {
    throw new Error(
      "Claude API 키가 설정되지 않았습니다.\n\n메뉴에서 '🤖 AI 기능 > 🔑 Claude API 키 설정'을 실행해주세요."
    );
  }

  const url = "https://api.anthropic.com/v1/messages";
  const payload = {
    model: "claude-sonnet-4-5-20250929",
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
      "anthropic-version": "2023-06-01"
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
    let errorMessage = `Claude API 호출 실패 (HTTP ${responseCode})`;
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
