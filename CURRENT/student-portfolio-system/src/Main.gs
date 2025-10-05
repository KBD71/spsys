/**
 * @OnlyCurrentDoc
 * 학생 포트폴리오 시스템 - 교사 관리 기능 (Vercel 하이브리드 - AI 자동 초안 생성 최종 버전)
 */

// ==============================================
//  1. 메뉴 생성 및 사용자 인터페이스
// ==============================================

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('📋 포트폴리오 관리')
      .addItem('➕ 새 과제 시트 생성', 'createAssignmentSheet')
      .addSeparator()
      .addSubMenu(SpreadsheetApp.getUi().createMenu('➡️ 바로가기')
        .addItem('🏠 대시보드 (메뉴)', 'goToMenu')
        .addItem('🧑‍🎓 학생명단', 'goToStudents')
        .addItem('📝 과제설정', 'goToAssignments')
        .addItem('📢 공개설정', 'goToPublic')
        .addItem('🤖 프롬프트', 'goToPrompts')
      )
      .addSeparator()
      .addItem('🔄 대시보드 새로고침', 'refreshDashboard')
      .addItem('🗑️ 시트 삭제', 'promptToDeleteSheet')
      .addSeparator()
      .addItem('⚙️ 필수 시트 생성/초기화', 'initializeMinimalSystem')
      .addToUi();
  } catch (e) {
    Logger.log(`onOpen Error: ${e.message}`);
  }
}

function goToMenu() { goToSheet('메뉴'); }
function goToStudents() { goToSheet('학생명단_전체'); }
function goToAssignments() { goToSheet('과제설정'); }
function goToPublic() { goToSheet('공개'); }
function goToPrompts() { goToSheet('프롬프트'); }

function goToSheet(sheetName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (sheet) sheet.activate();
    else SpreadsheetApp.getUi().alert('오류', `'${sheetName}' 시트를 찾을 수 없습니다.`, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { /* 오류 무시 */ }
}

function refreshDashboard() {
  const ui = SpreadsheetApp.getUi();
  try {
    updateDashboard();
    ui.alert('✅ 새로고침 완료', '대시보드가 최신 정보로 업데이트되었습니다.', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('❌ 새로고침 실패', `대시보드 업데이트 중 오류가 발생했습니다: ${e.message}`, ui.ButtonSet.OK);
  }
}

// ==============================================
//  2. AI 자동 초안 생성 (핵심 기능)
// ==============================================

function onEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  const editedRow = range.getRow();
  const editedCol = range.getColumn();
  const isChecked = range.isChecked();

  const requiredSheets = ['메뉴', '학생명단_전체', '과제설정', '공개', 'template', '프롬프트'];
  if (requiredSheets.includes(sheet.getName()) || editedRow < 2 || !isChecked) {
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const targetColName = headers[editedCol - 1];

  if (targetColName === '초안생성') {
    const ui = SpreadsheetApp.getUi();
    const opinionColIndex = headers.indexOf('종합의견');
    if (opinionColIndex > -1) {
      const opinionCell = sheet.getRange(editedRow, opinionColIndex + 1);
      if (opinionCell.getValue()) {
        const response = ui.alert('덮어쓰기 확인', '이미 작성된 종합의견이 있습니다. AI 초안으로 덮어쓰시겠습니까?', ui.ButtonSet.YES_NO);
        if (response !== ui.Button.YES) {
          range.uncheck();
          return;
        }
      }
    }
    generateAiSummary(sheet, editedRow, headers);
  }
}

function generateAiSummary(sheet, row, headers) {
  const ui = SpreadsheetApp.getUi();
  try {
    const studentRowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
    
    let context = "";
    const studentIdIndex = headers.indexOf('학번');
    const studentId = studentIdIndex > -1 ? studentRowData[studentIdIndex] : '알 수 없음';
    
    headers.forEach((header, index) => {
      if (header.startsWith('질문') && studentRowData[index]) {
        const questionText = getQuestionText(sheet.getName(), header);
        context += `[질문: ${questionText}]\n- 학생 답변: ${studentRowData[index]}\n\n`;
      }
    });

    const lastQuestionIndex = headers.lastIndexOf(headers.find(h => h.startsWith('질문5')));
    const draftColIndex = headers.indexOf('초안생성');
    if (lastQuestionIndex > -1 && draftColIndex > -1 && lastQuestionIndex < draftColIndex - 1) {
      context += "[교사 추가 평가]\n";
      for (let i = lastQuestionIndex + 1; i < draftColIndex; i++) {
        if (studentRowData[i]) {
          context += `- ${headers[i]}: ${studentRowData[i]}\n`;
        }
      }
      context += "\n";
    }

    if (!context) throw new Error("요약할 학생의 답변 내용이 없습니다.");

    const promptTemplate = getPromptTemplate('종합의견');
    const finalPrompt = `
      ${promptTemplate.persona}
      ${promptTemplate.task}
      
      ## 학생 정보:
      - 학번: ${studentId}
      - 과제명: ${sheet.getName()}
      
      ## 학생 제출 내용 및 교사 평가:
      ${context}
      
      ## 지시사항:
      ${promptTemplate.instructions}
    `;

    const opinionColIndex = headers.indexOf('종합의견');
    if (opinionColIndex === -1) throw new Error("'종합의견' 컬럼을 찾을 수 없습니다.");
    
    const opinionCell = sheet.getRange(row, opinionColIndex + 1);
    opinionCell.setValue("🤖 AI가 초안을 작성 중입니다...");
    SpreadsheetApp.flush();

    const summary = callGeminiAPI(finalPrompt);
    opinionCell.setValue(summary);

  } catch (e) {
    ui.alert('❌ AI 초안 생성 실패', e.message, ui.ButtonSet.OK);
    const draftColIndex = headers.indexOf('초안생성');
    if (draftColIndex > -1) {
      sheet.getRange(row, draftColIndex + 1).uncheck();
    }
  }
}

// ==============================================
//  3. 시트 생성 및 삭제
// ==============================================

function createAssignmentSheet() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    const templateSheet = ss.getSheetByName('template');
    if (!templateSheet) throw new Error("'template' 시트를 찾을 수 없습니다. 시트를 먼저 생성해주세요.");
    const nameResponse = ui.prompt('새 과제 시트 생성', '과제명을 입력하세요:', ui.ButtonSet.OK_CANCEL);
    if (nameResponse.getSelectedButton() !== ui.Button.OK || !nameResponse.getResponseText().trim()) return;
    const assignmentName = nameResponse.getResponseText().trim();
    const startDateResponse = ui.prompt('시작일 입력', '과제 시작일을 입력하세요 (예: 2025-01-01):', ui.ButtonSet.OK_CANCEL);
    if (startDateResponse.getSelectedButton() !== ui.Button.OK) return;
    const startDate = startDateResponse.getResponseText().trim();
    const endDateResponse = ui.prompt('마감일 입력', '과제 마감일을 입력하세요 (예: 2025-01-31):', ui.ButtonSet.OK_CANCEL);
    if (endDateResponse.getSelectedButton() !== ui.Button.OK) return;
    const endDate = endDateResponse.getResponseText().trim();
    const questionCountResponse = ui.prompt('질문 개수 입력', '학생에게 제시할 질문 개수를 입력하세요 (숫자 1~5):', ui.ButtonSet.OK_CANCEL);
    if (questionCountResponse.getSelectedButton() !== ui.Button.OK) return;
    const questionCount = parseInt(questionCountResponse.getResponseText().trim());
    if (isNaN(questionCount) || questionCount < 1 || questionCount > 5) throw new Error('질문 개수는 1에서 5 사이의 숫자여야 합니다.');
    const questions = [];
    for (let i = 1; i <= questionCount; i++) {
        const qResponse = ui.prompt(`질문 ${i} 입력`, `질문 ${i}의 내용을 입력하세요:`, ui.ButtonSet.OK_CANCEL);
        if (qResponse.getSelectedButton() !== ui.Button.OK || !qResponse.getResponseText().trim()) return;
        questions.push(qResponse.getResponseText().trim());
    }
    let assignmentSettingsSheet = ss.getSheetByName('과제설정');
    if (!assignmentSettingsSheet) throw new Error("'과제설정' 시트를 찾을 수 없습니다. 먼저 초기화를 실행해주세요.");
    const assignmentId = `TS${String(assignmentSettingsSheet.getLastRow()).padStart(3, '0')}`;
    let finalSheetName = assignmentName;
    let counter = 1;
    while (ss.getSheetByName(finalSheetName)) {
      finalSheetName = `${assignmentName}_${counter++}`;
    }
    const assignmentHeaders = assignmentSettingsSheet.getRange(1, 1, 1, assignmentSettingsSheet.getLastColumn()).getValues()[0];
    const newRowObject = {'공개': false, '과제ID': assignmentId, '과제명': finalSheetName, '대상시트': finalSheetName, '시작일': startDate, '마감일': endDate};
    questions.forEach((q, i) => newRowObject[`질문${i+1}`] = q);
    const newRow = assignmentHeaders.map(header => newRowObject[header] !== undefined ? newRowObject[header] : '');
    assignmentSettingsSheet.appendRow(newRow);
    ss.getSheetByName('공개').appendRow([false, finalSheetName, '전체']);
    const newSheet = templateSheet.copyTo(ss).setName(finalSheetName);
    const newSheetHeaders = newSheet.getRange(1, 1, 1, newSheet.getLastColumn()).getValues()[0];
    const maxQuestionsInTemplate = 5;
    if (questionCount < maxQuestionsInTemplate) {
      const startDeleteColumnName = `질문${questionCount + 1}`;
      const startDeleteColumnIndex = newSheetHeaders.indexOf(startDeleteColumnName) + 1;
      if (startDeleteColumnIndex > 0) {
        const numColumnsToDelete = maxQuestionsInTemplate - questionCount;
        newSheet.deleteColumns(startDeleteColumnIndex, numColumnsToDelete);
      }
    }
    newSheet.activate();
    updateDashboard();
    ui.alert('✅ 과제 시트 생성 완료', `"${finalSheetName}" 시트가 생성되었습니다.`, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('❌ 생성 실패', e.message, ui.ButtonSet.OK);
  }
}

function promptToDeleteSheet() {
  const ui = SpreadsheetApp.getUi();
  const requiredSheets = ['메뉴', '학생명단_전체', '과제설정', '공개', 'template', '프롬프트'];
  const response = ui.prompt('🗑️ 시트 삭제', '삭제할 시트의 전체 이름을 정확히 입력하세요:', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() == ui.Button.OK) {
    const sheetName = response.getResponseText().trim();
    if (!sheetName) {
      ui.alert('입력 오류', '시트 이름이 입력되지 않았습니다.', ui.ButtonSet.OK);
      return;
    }
    if (requiredSheets.includes(sheetName)) {
      ui.alert('삭제 불가', `"${sheetName}" 시트는 시스템 필수 시트이므로 삭제할 수 없습니다.`, ui.ButtonSet.OK);
      return;
    }
    deleteSheetByName(sheetName);
  }
}

function deleteSheetByName(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    ui.alert('오류', `"${sheetName}" 시트를 찾을 수 없습니다.`, ui.ButtonSet.OK);
    return;
  }
  const confirm = ui.alert('삭제 확인', `정말로 '${sheetName}' 시트를 삭제하시겠습니까?`, ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  try {
    deleteRowBySheetName(ss, '과제설정', '대상시트', sheetName);
    deleteRowBySheetName(ss, '공개', '시트이름', sheetName);
    ss.deleteSheet(sheet);
    updateDashboard();
    ui.alert('✅ 삭제 완료', `"${sheetName}" 시트가 삭제되었습니다.`, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('❌ 삭제 실패', e.message, ui.ButtonSet.OK);
  }
}

function deleteRowBySheetName(ss, targetSheetName, columnName, valueToDelete) {
    const sheet = ss.getSheetByName(targetSheetName);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colIndex = headers.indexOf(columnName);
    if (colIndex === -1) return;
    for (let i = data.length - 1; i > 0; i--) {
        if (data[i][colIndex] === valueToDelete) {
            sheet.deleteRow(i + 1);
        }
    }
}

// ==============================================
//  4. 시스템 초기화 및 대시보드 관리
// ==============================================

function initializeMinimalSystem() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    try {
        const requiredSheets = {
            '메뉴': [],
            '학생명단_전체': ['학번', '반', '번호', '이름', '비밀번호'],
            '과제설정': ['공개', '과제ID', '과제명', '대상시트', '시작일', '마감일', '질문1', '질문2', '질문3', '질문4', '질문5'],
            '공개': ['공개', '시트이름', '대상반'],
            'template': ['학번', '반', '이름', '질문1', '질문2', '질문3', '질문4', '질문5', '제출일시', '초안생성', '종합의견'],
            '프롬프트': ['요약 종류', '역할 (Persona)', '작업 (Task)', '지시사항 (Instructions)']
        };
        let createdCount = 0;
        for (const sheetName in requiredSheets) {
            if (!ss.getSheetByName(sheetName)) {
                const sheet = ss.insertSheet(sheetName);
                if (requiredSheets[sheetName].length > 0) {
                    sheet.getRange(1, 1, 1, requiredSheets[sheetName].length).setValues([requiredSheets[sheetName]])
                        .setBackground('#667eea').setFontColor('white').setFontWeight('bold');
                }
                createdCount++;
            }
        }
        
        const promptSheet = ss.getSheetByName('프롬프트');
        if (promptSheet.getLastRow() < 2) {
          promptSheet.appendRow([
            '종합의견',
            "학생의 1년간 활동을 종합하여 '행동특성 및 종합의견'을 작성하는 대한민국 고등학교 담임 교사입니다.",
            "학생의 답변과 교사의 평가를 종합하여, 학생의 인성, 학업 태도, 성장 가능성 등이 드러나는 종합의견 초안을 작성해주세요.",
            "- 객관적 사실 기반 서술 ('~함', '~음' 체 사용)\n- 2~3개 문장으로 구성\n- 학생의 잠재력과 발전 가능성 포함"
          ]);
        }

        if (createdCount > 0) ui.alert('✅ 필수 시트 생성 완료', `${createdCount}개의 시트가 생성되었습니다.`, ui.ButtonSet.OK);
        else ui.alert('✅ 시스템 확인 완료', '모든 필수 시트가 이미 존재합니다.', ui.ButtonSet.OK);
        
        createDashboardLayout();
        updateDashboard();
    } catch (e) {
        ui.alert('❌ 초기화 실패', e.message, ui.ButtonSet.OK);
    }
}

function createDashboardLayout() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('메뉴');
    if (!sheet) return;
    sheet.clear();
    sheet.setFrozenRows(1);
    sheet.getRange('A:D').setFontFamily('Google Sans').setVerticalAlignment('middle');
    sheet.getRange('A1:D1').merge().setValue('🎓 학생 포트폴리오 대시보드')
        .setFontSize(18).setFontWeight('bold').setHorizontalAlignment('center')
        .setBackground('#667eea').setFontColor('white');
    let currentRow = 3;
    const createSection = (title) => {
      sheet.getRange(currentRow, 1, 1, 4).merge().setValue(title)
        .setFontSize(14).setFontWeight('bold').setBackground('#f3f3f3').setHorizontalAlignment('center');
      currentRow++;
    };
    createSection('📊 시스템 현황');
    currentRow += 5; 
    createSection('🧑‍🎓 반별 학생 현황');
    currentRow += 5; 
    createSection('📈 과제별 제출 현황');
    sheet.getRange(currentRow, 1, 1, 3).setValues([['과제명', '제출 현황', '제출률']]).setFontWeight('bold');
    currentRow += 5; 
    createSection('🧭 시트 내비게이터');
    sheet.getRange(currentRow, 1, 1, 4).setValues([['분류', '시트 이름', '바로가기', '데이터 수']]).setFontWeight('bold');
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 250);
    sheet.setColumnWidth(3, 120);
    sheet.setColumnWidth(4, 120);
}

function updateDashboard() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    const sheet = ss.getSheetByName('메뉴');
    if (!sheet) return;
    try {
      sheet.getRange('A4:D' + sheet.getMaxRows()).clearContent();
      let currentRow = 4;
      const stats = getSystemStats();
      if (!stats) throw new Error("시스템 통계(stats)를 가져올 수 없습니다.");
      const statsData = [
        ['총 학생 수', `${stats.totalStudents} 명`],
        ['총 과제 수', `${stats.totalAssignments} 개`],
        ['총 시트 개수', `${stats.totalSheets} 개`],
        ['과제 시트 수', `${stats.assignmentSheets} 개`],
        ['기타 시트 수', `${stats.otherSheets} 개`]
      ];
      sheet.getRange(currentRow, 1, statsData.length, 2).setValues(statsData);
      sheet.getRange(currentRow, 1, statsData.length, 1).setFontWeight('bold');
      currentRow += statsData.length + 2;
      sheet.getRange(currentRow - 1, 1).setValue('🧑‍🎓 반별 학생 현황');
      const studentCountByClass = getStudentCountByClass();
      const classData = Object.entries(studentCountByClass);
      if (classData.length > 0) {
        const displayData = classData.map(([className, count]) => [className, `${count} 명`]);
        sheet.getRange(currentRow, 1, displayData.length, 2).setValues(displayData);
        sheet.getRange(currentRow, 1, displayData.length, 1).setFontWeight('bold');
        currentRow += displayData.length;
      } else {
        sheet.getRange(currentRow, 1).setValue('학생 데이터가 없습니다.');
        currentRow++;
      }
      currentRow += 2;
      sheet.getRange(currentRow - 1, 1).setValue('📈 과제별 제출 현황');
      sheet.getRange(currentRow, 1, 1, 3).setValues([['과제명', '제출 현황', '제출률']]).setFontWeight('bold');
      currentRow++;
      const submissionStatus = getSubmissionStatus(stats.totalStudents);
      if (submissionStatus.length > 0) {
        const submissionData = submissionStatus.map(s => [s.name, s.status, `=SPARKLINE(${s.rate}, {"charttype","bar";"max",1})`]);
        sheet.getRange(currentRow, 1, submissionData.length, 3).setValues(submissionData);
        currentRow += submissionData.length;
      } else {
        sheet.getRange(currentRow, 1).setValue('공개된 과제가 없습니다.');
        currentRow++;
      }
      currentRow += 2;
      sheet.getRange(currentRow - 1, 1).setValue('🧭 시트 내비게이터');
      sheet.getRange(currentRow, 1, 1, 4).setValues([['분류', '시트 이름', '바로가기', '데이터 수']]).setFontWeight('bold');
      currentRow++;
      const allSheets = ss.getSheets();
      const requiredSheets = ['메뉴', '학생명단_전체', '과제설정', '공개', 'template', '프롬프트'];
      const sheetData = [];
      allSheets.forEach(s => {
          const sheetName = s.getName();
          let category = '📁 기타';
          if (requiredSheets.includes(sheetName)) category = '⭐️ 필수';
          else if (ss.getSheetByName('과제설정').getDataRange().getValues().some(row => row[3] === sheetName)) category = '📝 과제';
          const dataCount = Math.max(0, s.getLastRow() - 1);
          const url = `https://docs.google.com/spreadsheets/d/${ss.getId()}/edit#gid=${s.getSheetId()}`;
          sheetData.push([category, `=HYPERLINK("${url}", "${sheetName}")`, '이동', dataCount]);
      });
      if (sheetData.length > 0) {
        sheet.getRange(currentRow, 1, sheetData.length, 4).setValues(sheetData);
        sheet.getRange(currentRow, 4, sheetData.length, 1).setHorizontalAlignment('center');
      }
      SpreadsheetApp.flush();
    } catch(e) {
      ui.alert('❌ 대시보드 업데이트 실패', `데이터를 표시하는 중 오류가 발생했습니다: ${e.message}`, ui.ButtonSet.OK);
    }
}

// ==============================================
//  5. 헬퍼 함수
// ==============================================

function getApiKey() {
  const apiKey = PropertiesService.getUserProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    SpreadsheetApp.getUi().alert('API 키 필요', '먼저 "AI 기능 > AI API 키 설정" 메뉴에서 API 키를 설정해주세요.', SpreadsheetApp.getUi().ButtonSet.OK);
    return null;
  }
  return apiKey;
}

function callGeminiAPI(prompt) {
  const apiKey = getApiKey();
  if (!apiKey) return "API 키가 설정되지 않았습니다.";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-latest:generateContent?key=${apiKey}`;
  const payload = {"contents": [{"parts": [{"text": prompt}]}]};
  const options = {'method': 'post', 'contentType': 'application/json', 'payload': JSON.stringify(payload), 'muteHttpExceptions': true};
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();
  if (responseCode === 200) {
    const data = JSON.parse(responseBody);
    try {
      return data.candidates[0].content.parts[0].text;
    } catch (e) {
      throw new Error("AI 응답을 해석하는 데 실패했습니다.");
    }
  } else {
    throw new Error(`AI API 호출에 실패했습니다. (HTTP ${responseCode})`);
  }
}

function getQuestionText(sheetName, questionHeader) {
    try {
        const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('과제설정');
        if (!settingsSheet) return questionHeader;
        const data = settingsSheet.getDataRange().getValues();
        const headers = data[0];
        const targetSheetColIndex = headers.indexOf('대상시트');
        const questionColIndex = headers.indexOf(questionHeader);
        if (targetSheetColIndex === -1 || questionColIndex === -1) return questionHeader;
        const assignmentRow = data.find(row => row[targetSheetColIndex] === sheetName);
        return assignmentRow && assignmentRow[questionColIndex] ? assignmentRow[questionColIndex] : questionHeader;
    } catch (e) {
        return questionHeader;
    }
}

function getPromptTemplate(summaryType) {
    const promptSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('프롬프트');
    if (!promptSheet) throw new Error("'프롬프트' 시트를 찾을 수 없습니다.");
    const data = promptSheet.getDataRange().getValues();
    data.shift(); 
    const templateRow = data.find(row => row[0] === summaryType);
    if (!templateRow) throw new Error(`'프롬프트' 시트에서 '${summaryType}' 종류를 찾을 수 없습니다.`);
    return { persona: templateRow[1], task: templateRow[2], instructions: templateRow[3] };
}

function getSystemStats() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allSheets = ss.getSheets();
    const requiredSheets = ['메뉴', '학생명단_전체', '과제설정', '공개', 'template', '프롬프트'];
    let totalStudents = 0, totalAssignments = 0, assignmentSheets = 0, otherSheets = 0;
    const studentSheet = ss.getSheetByName('학생명단_전체');
    if (studentSheet) totalStudents = Math.max(0, studentSheet.getLastRow() - 1);
    const assignmentSettingsSheet = ss.getSheetByName('과제설정');
    if (assignmentSettingsSheet) totalAssignments = Math.max(0, assignmentSettingsSheet.getLastRow() - 1);
    const assignmentSheetNames = assignmentSettingsSheet ? assignmentSettingsSheet.getRange('D2:D' + assignmentSettingsSheet.getLastRow()).getValues().flat().filter(String) : [];
    allSheets.forEach(sheet => {
      const name = sheet.getName();
      if (requiredSheets.includes(name)) return;
      if (assignmentSheetNames.includes(name)) assignmentSheets++;
      else otherSheets++;
    });
    return { totalStudents, totalAssignments, totalSheets: allSheets.length, assignmentSheets, otherSheets };
  } catch(e) {
    Logger.log(`getSystemStats Error: ${e.message}`);
    return null;
  }
}

function getStudentCountByClass() {
    try {
      const studentSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('학생명단_전체');
      if (!studentSheet || studentSheet.getLastRow() < 2) return {};
      const studentIdRange = studentSheet.getRange("A2:A" + studentSheet.getLastRow());
      const studentIds = studentIdRange.getValues().flat().filter(String);
      const counts = {};
      studentIds.forEach(id => {
          const idStr = String(id).trim();
          if (idStr.length >= 3) {
              const grade = idStr.substring(0, 1);
              const classNum = parseInt(idStr.substring(1, 3), 10);
              if (!isNaN(grade) && !isNaN(classNum)) {
                const className = `${grade}-${classNum}`;
                counts[className] = (counts[className] || 0) + 1;
              }
          }
      });
      return counts;
    } catch(e) {
      Logger.log(`getStudentCountByClass Error: ${e.message}`);
      return {};
    }
}

function getSubmissionStatus(totalStudents) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const assignmentSettingsSheet = ss.getSheetByName('과제설정');
    if (!assignmentSettingsSheet || totalStudents === 0) return [];
    const data = assignmentSettingsSheet.getDataRange().getValues();
    const status = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const isPublic = row[0] === true;
      const assignmentName = row[2];
      const targetSheetName = row[3];
      if (isPublic && targetSheetName) {
        const targetSheet = ss.getSheetByName(targetSheetName);
        if (targetSheet) {
          const submittedCount = Math.max(0, targetSheet.getLastRow() - 1);
          const rate = submittedCount > 0 ? submittedCount / totalStudents : 0;
          status.push({
            name: assignmentName,
            status: `${submittedCount}/${totalStudents} 명`,
            rate: rate > 0 ? rate : 0.0001
          });
        }
      }
    }
    return status;
  } catch(e) {
    Logger.log(`getSubmissionStatus Error: ${e.message}`);
    return [];
  }
}
