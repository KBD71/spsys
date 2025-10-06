/**
 * ==============================================
 * Assignment.gs - 과제 관리
 * ==============================================
 * 새 과제 시트를 생성하고 관련 정보를 '과제설정', '공개' 시트에 기록합니다.
 */

/**
 * 사이드바에서 전달받은 데이터로 새 과제 시트를 생성합니다.
 * @param {object} data - {name, startDate, endDate, questions}
 * @returns {string} 성공 메시지
 */
function createAssignmentSheetFromSidebar(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var { name: assignmentName, startDate, endDate, questions } = data;
    
    // 유효성 검사
    var templateSheet = ss.getSheetByName('template');
    if (!templateSheet) throw new Error("'template' 시트를 찾을 수 없습니다.");
    if (questions.length === 0) throw new Error("질문이 1개 이상 필요합니다.");
    var assignmentSettingsSheet = ss.getSheetByName('과제설정');
    if (!assignmentSettingsSheet) throw new Error("'과제설정' 시트를 찾을 수 없습니다.");
    
    // 과제 ID 및 시트 이름 생성 (중복 방지)
    var assignmentId = 'TS' + String(assignmentSettingsSheet.getLastRow()).padStart(3, '0');
    var finalSheetName = assignmentName;
    var counter = 1;
    while (ss.getSheetByName(finalSheetName)) {
      finalSheetName = `${assignmentName}_${counter++}`;
    }

    // '과제설정' 시트에 행 추가
    var headers = assignmentSettingsSheet.getRange(1, 1, 1, assignmentSettingsSheet.getLastColumn()).getValues()[0];
    var newRowObject = {'공개': false, '과제ID': assignmentId, '과제명': assignmentName, '대상시트': finalSheetName, '시작일': startDate, '마감일': endDate};
    questions.forEach((q, i) => { newRowObject[`질문${i + 1}`] = q; });
    var newRow = headers.map(header => newRowObject[header] || '');
    assignmentSettingsSheet.appendRow(newRow);

    // '공개' 시트에 행 추가
    ss.getSheetByName('공개').appendRow([false, finalSheetName, '전체']);

    // 'template'을 복사하여 새 과제 시트 생성
    var newSheet = templateSheet.copyTo(ss).setName(finalSheetName);
    var newSheetHeaders = newSheet.getRange(1, 1, 1, newSheet.getLastColumn()).getValues()[0];
    var maxQuestionsInTemplate = newSheetHeaders.filter(h => h.startsWith('질문')).length;
    
    // 템플릿의 질문 개수보다 적으면 불필요한 질문 열 삭제
    if (questions.length < maxQuestionsInTemplate) {
      var startDeleteColName = `질문${questions.length + 1}`;
      var startDeleteColIndex = newSheetHeaders.indexOf(startDeleteColName) + 1;
      if (startDeleteColIndex > 0) {
        newSheet.deleteColumns(startDeleteColIndex, maxQuestionsInTemplate - questions.length);
      }
    }

    newSheet.activate();
    updateDashboard(); // Dashboard.gs
    return `'${finalSheetName}' 시트가 생성되었습니다.`;
  } catch (e) {
    Logger.log(e);
    throw new Error('시트 생성 실패: ' + e.message);
  }
}

/**
 * '과제설정' 시트에서 과제에 해당하는 실제 질문 텍스트를 찾아 반환합니다.
 * @param {string} sheetName - 과제 시트 이름
 * @param {string} questionHeader - 질문 헤더 (예: '질문1')
 * @returns {string} 실제 질문 내용
 */
function getQuestionText(sheetName, questionHeader) {
    try {
      var settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('과제설정');
      if (!settingsSheet) return questionHeader;
      var data = settingsSheet.getDataRange().getValues();
      if (data.length < 2) return questionHeader;

      var headers = data[0];
      var targetSheetColIndex = headers.indexOf('대상시트');
      var questionColIndex = headers.indexOf(questionHeader);

      if (targetSheetColIndex === -1 || questionColIndex === -1) return questionHeader;

      var assignmentRow = data.find(row => row[targetSheetColIndex] === sheetName);
      
      return assignmentRow && assignmentRow[questionColIndex] ? assignmentRow[questionColIndex] : questionHeader;
    } catch (e) {
      Logger.log("getQuestionText 오류: " + e.message);
      return questionHeader; // 오류 발생 시 기본 헤더 반환
    }
}
