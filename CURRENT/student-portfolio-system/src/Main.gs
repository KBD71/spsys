/**
 * 학생 포트폴리오 시스템 - 교사 관리 기능 (onEdit 트리거 안정성 최종 강화판)
 *
 * 필요한 권한:
 * - https://www.googleapis.com/auth/spreadsheets (스프레드시트 읽기/쓰기)
 * - https://www.googleapis.com/auth/script.external_request (외부 API 호출 - Gemini AI)
 */

// ==============================================
//  1. 메뉴 생성 및 사용자 인터페이스
// ==============================================

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('📋 포트폴리오 관리')
      .addItem('➕ 새 과제 시트 생성', 'showAssignmentCreatorSidebar')
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
      .addSubMenu(SpreadsheetApp.getUi().createMenu('🤖 AI 기능')
        .addItem('🔑 AI API 키 설정', 'setApiKey')
      )
      .addSeparator()
      .addItem('⚙️ 필수 시트 생성/초기화', 'initializeMinimalSystem')
      .addToUi();
  } catch (e) {
    Logger.log('onOpen Error: ' + e.message);
  }
}

function goToMenu() { goToSheet('메뉴'); }
function goToStudents() { goToSheet('학생명단_전체'); }
function goToAssignments() { goToSheet('과제설정'); }
function goToPublic() { goToSheet('공개'); }
function goToPrompts() { goToSheet('프롬프트'); }

function goToSheet(sheetName) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (sheet) {
      sheet.activate();
    } else {
      SpreadsheetApp.getUi().alert('오류', '\'' + sheetName + '\' 시트를 찾을 수 없습니다.', SpreadsheetApp.getUi().ButtonSet.OK);
    }
  } catch (e) { /* 오류 무시 */ }
}

function refreshDashboard() {
  var ui = SpreadsheetApp.getUi();
  try {
    updateDashboard();
    ui.alert('✅ 새로고침 완료', '대시보드가 최신 정보로 업데이트되었습니다.', ui.ButtonSet.OK);
  } catch (e) {
    Logger.log("refreshDashboard Error: " + e.message);
    ui.alert('❌ 새로고침 실패', '대시보드 업데이트 중 오류가 발생했습니다: ' + e.message, ui.ButtonSet.OK);
  }
}


// ==============================================
//  동적 과제 생성
// ==============================================

function showAssignmentCreatorSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('AssignmentCreator')
      .setTitle('새 과제 생성')
      .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}

function createAssignmentSheetFromSidebar(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var templateSheet = ss.getSheetByName('template');
    if (!templateSheet) throw new Error("'template' 시트를 찾을 수 없습니다.");

    var assignmentName = data.name;
    var startDate = data.startDate;
    var endDate = data.endDate;
    var questions = data.questions;
    var questionCount = questions.length;

    if (questionCount === 0) throw new Error("질문이 없습니다.");

    var assignmentSettingsSheet = ss.getSheetByName('과제설정');
    if (!assignmentSettingsSheet) throw new Error("'과제설정' 시트를 찾을 수 없습니다.");

    var assignmentId = 'TS' + String(assignmentSettingsSheet.getLastRow() + 1).padStart(3, '0');
    var finalSheetName = assignmentName;
    var counter = 1;
    while (ss.getSheetByName(finalSheetName)) {
      finalSheetName = assignmentName + '_' + counter++;
    }

    var assignmentHeaders = assignmentSettingsSheet.getRange(1, 1, 1, assignmentSettingsSheet.getLastColumn()).getValues()[0];
    var newRowObject = {'공개': false, '과제ID': assignmentId, '과제명': finalSheetName, '대상시트': finalSheetName, '시작일': startDate, '마감일': endDate};
    questions.forEach(function(q, i) {
      newRowObject['질문' + (i + 1)] = q;
    });
    var newRow = assignmentHeaders.map(function(header) { return newRowObject[header] !== undefined ? newRowObject[header] : ''; });
    assignmentSettingsSheet.appendRow(newRow);

    ss.getSheetByName('공개').appendRow([false, finalSheetName, '전체']);
    var newSheet = templateSheet.copyTo(ss).setName(finalSheetName);
    var newSheetHeaders = newSheet.getRange(1, 1, 1, newSheet.getLastColumn()).getValues()[0];
    var maxQuestionsInTemplate = 5;

    if (questionCount < maxQuestionsInTemplate) {
      var startDeleteColumnName = '질문' + (questionCount + 1);
      var startDeleteColumnIndex = newSheetHeaders.indexOf(startDeleteColumnName) + 1;
      if (startDeleteColumnIndex > 0) {
        var numColumnsToDelete = maxQuestionsInTemplate - questionCount;
        newSheet.deleteColumns(startDeleteColumnIndex, numColumnsToDelete);
      }
    }

    newSheet.activate();
    updateDashboard();
    return '"' + finalSheetName + '" 시트가 생성되었습니다.';
  } catch (e) {
    Logger.log(e);
    throw new Error('시트 생성 실패: ' + e.message);
  }
}

// ==============================================
//  AI 자동 초안 생성 (핵심 기능)
// ==============================================

// ★★★ 핵심 수정 1: onEdit은 원래대로 이벤트 정보(e)만 사용하고, 다른 객체를 전달하지 않음 ★★★
function onEdit(e) {
  try {
    // 파라미터 검증
    if (!e) {
      Logger.log("onEdit: 이벤트 객체(e)가 없습니다.");
      return;
    }
    if (!e.range) {
      Logger.log("onEdit: e.range가 없습니다.");
      return;
    }

    var range = e.range;
    var sheet = range.getSheet();

    if (!sheet) {
      Logger.log("onEdit: sheet를 가져올 수 없습니다.");
      return;
    }

    var editedRow = range.getRow();
    var editedCol = range.getColumn();
    var isChecked = range.isChecked();

    Logger.log("onEdit 트리거 실행 - 시트: " + sheet.getName() + ", 행: " + editedRow + ", 열: " + editedCol + ", 체크됨: " + isChecked);

    var requiredSheets = ['메뉴', '학생명단_전체', '과제설정', '공개', 'template', '프롬프트'];
    if (requiredSheets.indexOf(sheet.getName()) !== -1 || editedRow < 2 || !isChecked) {
      return;
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var targetColName = String(headers[editedCol - 1] || '');

    Logger.log("편집된 컬럼명: " + targetColName);

    if (targetColName === '초안생성') {
      var ui = SpreadsheetApp.getUi();
      var opinionColIndex = headers.indexOf('종합의견');
      if (opinionColIndex > -1) {
        var opinionCell = sheet.getRange(editedRow, opinionColIndex + 1);
        if (opinionCell.getValue()) {
          var response = ui.alert('덮어쓰기 확인', '이미 작성된 종합의견이 있습니다. AI 초안으로 덮어쓰시겠습니까?', ui.ButtonSet.YES_NO);
          if (response !== ui.Button.YES) {
            range.uncheck();
            return;
          }
        }
      }
      Logger.log("generateAiSummary 호출 시작");
      generateAiSummary(sheet, editedRow, headers);
    }
  } catch (error) {
    Logger.log("onEdit 오류: " + error.message);
    Logger.log("스택: " + error.stack);
    SpreadsheetApp.getUi().alert('오류', 'onEdit 트리거 실행 중 오류가 발생했습니다:\n' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ★★★ 핵심 수정 2: 함수가 스스로 SpreadsheetApp 객체를 호출하여 안정성 확보 ★★★
function generateAiSummary(sheet, row, headers) {
  var ui = SpreadsheetApp.getUi();

  try {
    // 파라미터 검증
    if (!sheet) {
      throw new Error("sheet 파라미터가 전달되지 않았습니다.\n\n이는 onEdit 트리거가 제대로 작동하지 않았을 가능성이 있습니다.");
    }
    if (!row || row < 2) {
      throw new Error("유효하지 않은 행 번호입니다: " + row);
    }
    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      throw new Error("headers 파라미터가 유효하지 않습니다.");
    }

    Logger.log("generateAiSummary 시작 - 시트: " + sheet.getName() + ", 행: " + row);

    var ss = SpreadsheetApp.getActiveSpreadsheet(); // 함수 내부에서 직접 스프레드시트 객체 획득

    // 필수 시트 존재 확인
    if (!ss.getSheetByName('과제설정')) {
      throw new Error("'과제설정' 시트를 찾을 수 없습니다. 시트 이름에 오타나 공백이 없는지 확인하거나, '필수 시트 생성/초기화' 메뉴를 실행해주세요.");
    }
    if (!ss.getSheetByName('프롬프트')) {
      throw new Error("'프롬프트' 시트를 찾을 수 없습니다. 시트 이름에 오타나 공백이 없는지 확인하거나, '필수 시트 생성/초기화' 메뉴를 실행해주세요.");
    }

    // 학생 데이터 읽기
    var studentRowData = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
    var context = "";
    var studentIdIndex = headers.indexOf('학번');
    var studentId = studentIdIndex > -1 ? studentRowData[studentIdIndex] : '알 수 없음';

    Logger.log("AI 초안 생성 시작 - 학번: " + studentId + ", 시트: " + sheet.getName());

    // 질문과 답변 수집
    headers.forEach(function(header, index) {
      var headerStr = String(header || '');
      if (headerStr.indexOf('질문') === 0 && studentRowData[index]) {
        var questionText = getQuestionText(sheet.getName(), headerStr);
        context += '[질문: ' + questionText + ']\n- 학생 답변: ' + studentRowData[index] + '\n\n';
      }
    });

    // 교사 추가 평가 수집
    var lastQuestionIndex = -1;
    for (var i = headers.length - 1; i >= 0; i--) {
      if (String(headers[i] || '').indexOf('질문') === 0) {
        lastQuestionIndex = i;
        break;
      }
    }

    var draftColIndex = headers.indexOf('초안생성');
    if (lastQuestionIndex > -1 && draftColIndex > -1 && lastQuestionIndex < draftColIndex - 1) {
      context += "[교사 추가 평가]\n";
      for (var j = lastQuestionIndex + 1; j < draftColIndex; j++) {
        if (studentRowData[j]) {
          context += '- ' + headers[j] + ': ' + studentRowData[j] + '\n';
        }
      }
      context += "\n";
    }

    if (!context) {
      throw new Error("요약할 학생의 답변 내용이 없습니다.\n\n학생이 질문에 대한 답변을 작성했는지 확인해주세요.");
    }

    Logger.log("컨텍스트 생성 완료 - 길이: " + context.length);

    // 프롬프트 템플릿 가져오기
    var summaryType = sheet.getName();
    var promptTemplate = getPromptTemplate(summaryType);

    // 최종 프롬프트 생성
    var finalPrompt =
      promptTemplate.persona + '\n' +
      promptTemplate.task + '\n\n' +
      '## 학생 정보:\n' +
      '- 학번: ' + studentId + '\n' +
      '- 과제명: ' + sheet.getName() + '\n\n' +
      '## 학생 제출 내용 및 교사 평가:\n' +
      context + '\n' +
      '## 지시사항:\n' +
      promptTemplate.instructions;

    Logger.log("최종 프롬프트 생성 완료 - 길이: " + finalPrompt.length);

    // 종합의견 컬럼 확인
    var opinionColIndex = headers.indexOf('종합의견');
    if (opinionColIndex === -1) {
      throw new Error("'종합의견' 컬럼을 찾을 수 없습니다.\n\n'template' 시트를 확인하고, '종합의견' 컬럼이 존재하는지 확인해주세요.");
    }

    var opinionCell = sheet.getRange(row, opinionColIndex + 1);
    opinionCell.setValue("🤖 AI가 초안을 작성 중입니다...");
    SpreadsheetApp.flush();

    // API 호출
    Logger.log("Gemini API 호출 시작");
    var summary = callGeminiAPI(finalPrompt);
    Logger.log("Gemini API 호출 완료 - 응답 길이: " + summary.length);

    opinionCell.setValue(summary);
    Logger.log("AI 초안 생성 완료");

  } catch (e) {
    Logger.log("❌ AI 초안 생성 오류 발생");
    Logger.log("오류 메시지: " + e.message);
    Logger.log("스택 트레이스: " + e.stack);

    ui.alert('❌ AI 초안 생성 실패', e.message, ui.ButtonSet.OK);

    // 체크박스 해제 (파라미터가 유효한 경우에만)
    try {
      if (sheet && headers && Array.isArray(headers) && row) {
        var draftColIndexOnError = headers.indexOf('초안생성');
        if (draftColIndexOnError > -1) {
          sheet.getRange(row, draftColIndexOnError + 1).uncheck();
        }
      }
    } catch (uncheckError) {
      Logger.log("체크박스 해제 중 오류: " + uncheckError.message);
    }
  }
}

// ==============================================
//  시트 삭제
// ==============================================

function promptToDeleteSheet() {
  var ui = SpreadsheetApp.getUi();
  var requiredSheets = ['메뉴', '학생명단_전체', '과제설정', '공개', 'template', '프롬프트'];
  var response = ui.prompt('🗑️ 시트 삭제', '삭제할 시트의 전체 이름을 정확히 입력하세요:', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() == ui.Button.OK) {
    var sheetName = response.getResponseText().trim();
    if (!sheetName) {
      ui.alert('입력 오류', '시트 이름이 입력되지 않았습니다.', ui.ButtonSet.OK);
      return;
    }
    if (requiredSheets.indexOf(sheetName) > -1) {
      ui.alert('삭제 불가', '"' + sheetName + '" 시트는 시스템 필수 시트이므로 삭제할 수 없습니다.', ui.ButtonSet.OK);
      return;
    }
    deleteSheetByName(sheetName);
  }
}

function deleteSheetByName(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = ss.getUi();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    ui.alert('오류', '"' + sheetName + '" 시트를 찾을 수 없습니다.', ui.ButtonSet.OK);
    return;
  }
  var confirm = ui.alert('삭제 확인', '정말로 \'' + sheetName + '\' 시트를 삭제하시겠습니까?', ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  try {
    deleteRowBySheetName(ss, '과제설정', '대상시트', sheetName);
    deleteRowBySheetName(ss, '공개', '시트이름', sheetName);
    ss.deleteSheet(sheet);
    updateDashboard();
    ui.alert('✅ 삭제 완료', '"' + sheetName + '" 시트가 삭제되었습니다.', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('❌ 삭제 실패', e.message, ui.ButtonSet.OK);
  }
}

function deleteRowBySheetName(ss, targetSheetName, columnName, valueToDelete) {
    var sheet = ss.getSheetByName(targetSheetName);
    if (!sheet || sheet.getLastRow() < 2) return;
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var colIndex = headers.indexOf(columnName);
    if (colIndex === -1) return;
    for (var i = data.length - 1; i > 0; i--) {
        if (data[i][colIndex] === valueToDelete) {
            sheet.deleteRow(i + 1);
        }
    }
}

// ==============================================
//  시스템 초기화 및 대시보드 관리
// ==============================================

function initializeMinimalSystem() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ui = ss.getUi();
    try {
        var requiredSheets = {
            '메뉴': [],
            '학생명단_전체': ['학번', '반', '번호', '이름', '비밀번호'],
            '과제설정': ['공개', '과제ID', '과제명', '대상시트', '시작일', '마감일', '질문1', '질문2', '질문3', '질문4', '질문5'],
            '공개': ['공개', '시트이름', '대상반'],
            'template': ['학번', '반', '이름', '질문1', '질문2', '질문3', '질문4', '질문5', '제출일시', '초안생성', '종합의견'],
            '프롬프트': ['요약종류', '역할 (Persona)', '작업 (Task)', '지시사항 (Instructions)']
        };
        var createdCount = 0;
        for (var sheetName in requiredSheets) {
            if (!ss.getSheetByName(sheetName)) {
                var sheet = ss.insertSheet(sheetName);
                if (requiredSheets[sheetName].length > 0) {
                    sheet.getRange(1, 1, 1, requiredSheets[sheetName].length).setValues([requiredSheets[sheetName]])
                        .setBackground('#667eea').setFontColor('white').setFontWeight('bold');
                }
                createdCount++;
            }
        }
        var promptSheet = ss.getSheetByName('프롬프트');
        if (promptSheet.getLastRow() < 2) {
          promptSheet.appendRow([
            '종합의견',
            "학생의 1년간 활동을 종합하여 '행동특성 및 종합의견'을 작성하는 대한민국 고등학교 담임 교사입니다.",
            "학생의 답변과 교사의 평가를 종합하여, 학생의 인성, 학업 태도, 성장 가능성 등이 드러나는 종합의견 초안을 작성해주세요.",
            "- 객관적 사실 기반 서술 ('~함', '~음' 체 사용)\n- 2~3개 문장으로 구성\n- 학생의 잠재력과 발전 가능성 포함"
          ]);
        }
        if (createdCount > 0) {
          ui.alert('✅ 필수 시트 생성 완료', createdCount + '개의 시트가 생성되었습니다.', ui.ButtonSet.OK);
        } else {
          ui.alert('✅ 시스템 확인 완료', '모든 필수 시트가 이미 존재합니다.', ui.ButtonSet.OK);
        }
        createDashboardLayout();
        updateDashboard();
    } catch (e) {
        ui.alert('❌ 초기화 실패', e.message, ui.ButtonSet.OK);
    }
}

function createDashboardLayout() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('메뉴');
    if (!sheet) return;
    sheet.clear();
    sheet.setFrozenRows(1);
    sheet.getRange('A:D').setFontFamily('Google Sans').setVerticalAlignment('middle');
    sheet.getRange('A1:D1').merge().setValue('🎓 학생 포트폴리오 대시보드')
        .setFontSize(18).setFontWeight('bold').setHorizontalAlignment('center')
        .setBackground('#667eea').setFontColor('white');
    var currentRow = 3;
    var createSection = function(title) {
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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ui = ss.getUi();
    var sheet = ss.getSheetByName('메뉴');
    if (!sheet) return;
    try {
      sheet.getRange('A4:D' + Math.max(sheet.getLastRow(), 4)).clearContent();
      var currentRow = 4;
      var stats = getSystemStats();
      if (!stats) throw new Error("시스템 통계(stats)를 가져올 수 없습니다.");
      var statsData = [
        ['총 학생 수', stats.totalStudents + ' 명'],
        ['총 과제 수', stats.totalAssignments + ' 개'],
        ['총 시트 개수', stats.totalSheets + ' 개'],
        ['과제 시트 수', stats.assignmentSheets + ' 개'],
        ['기타 시트 수', stats.otherSheets + ' 개']
      ];
      sheet.getRange(currentRow, 1, statsData.length, 2).setValues(statsData);
      sheet.getRange(currentRow, 1, statsData.length, 1).setFontWeight('bold');
      currentRow += statsData.length + 2;
      sheet.getRange(currentRow - 1, 1).setValue('🧑‍🎓 반별 학생 현황');
      var studentCountByClass = getStudentCountByClass();
      var classData = Object.keys(studentCountByClass).map(function(key) { return [key, studentCountByClass[key]]; });
      if (classData.length > 0) {
        var displayData = classData.map(function(entry) { return [entry[0], entry[1] + ' 명']; });
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
      var submissionStatus = getSubmissionStatus(stats.totalStudents);
      if (submissionStatus.length > 0) {
        var submissionData = submissionStatus.map(function(s) { return [s.name, s.status, '=SPARKLINE(' + s.rate + ', {"charttype","bar";"max",1})']; });
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
      var allSheets = ss.getSheets();
      var requiredSheets = ['메뉴', '학생명단_전체', '과제설정', '공개', 'template', '프롬프트'];
      var sheetData = [];
      var assignmentSettingsSheet = ss.getSheetByName('과제설정');
      var assignmentSheetNames = [];
      if (assignmentSettingsSheet && assignmentSettingsSheet.getLastRow() > 1) {
        assignmentSheetNames = assignmentSettingsSheet.getRange('D2:D' + assignmentSettingsSheet.getLastRow()).getValues().map(function(row) { return row[0]; });
      }
      allSheets.forEach(function(s) {
          var sheetName = s.getName();
          var category = '📁 기타';
          if (requiredSheets.indexOf(sheetName) > -1) {
            category = '⭐️ 필수';
          } else if (assignmentSheetNames.indexOf(sheetName) > -1) {
            category = '📝 과제';
          }
          var dataCount = Math.max(0, s.getLastRow() - 1);
          var url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/edit#gid=' + s.getSheetId();
          sheetData.push([category, '=HYPERLINK("' + url + '", "' + sheetName + '")', '이동', dataCount]);
      });
      if (sheetData.length > 0) {
        sheet.getRange(currentRow, 1, sheetData.length, 4).setValues(sheetData);
        sheet.getRange(currentRow, 4, sheetData.length, 1).setHorizontalAlignment('center');
      }
      SpreadsheetApp.flush();
    } catch(e) {
      Logger.log("updateDashboard Error: " + e.message + " Stack: " + e.stack);
      ui.alert('❌ 대시보드 업데이트 실패', '데이터를 표시하는 중 오류가 발생했습니다: ' + e.message, ui.ButtonSet.OK);
    }
}

// ==============================================
//  헬퍼 함수
// ==============================================

function getApiKey() {
  try {
    var apiKey = PropertiesService.getUserProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey || apiKey.trim() === '') {
      Logger.log("API 키가 설정되지 않았습니다.");
      return null;
    }
    Logger.log("API 키 확인 완료 (길이: " + apiKey.length + ")");
    return apiKey.trim();
  } catch (e) {
    Logger.log("API 키 가져오기 오류: " + e.message);
    return null;
  }
}

function setApiKey() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt('Gemini API 키 설정', 'Google AI Studio에서 발급받은 API 키를 입력하세요:', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() == ui.Button.OK) {
    PropertiesService.getUserProperties().setProperty('GEMINI_API_KEY', response.getResponseText());
    ui.alert('✅ 성공', 'API 키가 저장되었습니다.', ui.ButtonSet.OK);
  }
}

function callGeminiAPI(prompt) {
  var apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API 키가 설정되지 않았습니다.\n\n메뉴에서 '🤖 AI 기능 > 🔑 AI API 키 설정'을 실행하여 API 키를 설정해주세요.\n\nAPI 키는 Google AI Studio (https://aistudio.google.com/app/apikey)에서 무료로 발급받을 수 있습니다.");
  }

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=' + apiKey;
  var payload = {"contents": [{"parts": [{"text": prompt}]}]};
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  Logger.log("API 요청 URL: " + url.replace(apiKey, '****'));

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseBody = response.getContentText();

    Logger.log("API 응답 코드: " + responseCode);

    if (responseCode === 200) {
      var data = JSON.parse(responseBody);
      try {
        var result = data.candidates[0].content.parts[0].text;
        return result;
      } catch (e) {
        Logger.log("API 응답 파싱 실패: " + e.message);
        Logger.log("응답 본문: " + responseBody);
        throw new Error("AI 응답을 해석하는 데 실패했습니다.\n\n원인: " + e.message + "\n\n응답이 예상과 다른 형식일 수 있습니다. 로그를 확인해주세요.");
      }
    } else if (responseCode === 400) {
      throw new Error('AI API 호출에 실패했습니다. (잘못된 요청 - HTTP 400)\n\n프롬프트가 너무 길거나 잘못된 형식일 수 있습니다.\n\n응답: ' + responseBody);
    } else if (responseCode === 401 || responseCode === 403) {
      throw new Error('AI API 호출에 실패했습니다. (인증 오류 - HTTP ' + responseCode + ')\n\nAPI 키가 유효하지 않거나 만료되었을 수 있습니다.\n\n메뉴에서 \'🤖 AI 기능 > 🔑 AI API 키 설정\'을 실행하여 새 API 키를 설정해주세요.\n\n응답: ' + responseBody);
    } else if (responseCode === 429) {
      throw new Error('AI API 호출에 실패했습니다. (요청 한도 초과 - HTTP 429)\n\nAPI 호출 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.');
    } else if (responseCode >= 500) {
      throw new Error('AI API 호출에 실패했습니다. (서버 오류 - HTTP ' + responseCode + ')\n\nGoogle AI 서버에 일시적인 문제가 있을 수 있습니다. 잠시 후 다시 시도해주세요.');
    } else {
      throw new Error('AI API 호출에 실패했습니다. (HTTP ' + responseCode + ')\n\n응답: ' + responseBody);
    }
  } catch (e) {
    if (e.message.indexOf('AI API 호출에 실패') === 0) {
      throw e; // 이미 처리된 에러는 그대로 전달
    } else {
      Logger.log("네트워크 오류: " + e.message);
      throw new Error('네트워크 오류가 발생했습니다.\n\n원인: ' + e.message + '\n\n인터넷 연결을 확인하고 다시 시도해주세요.');
    }
  }
}

// ★★★ 핵심 수정 3: 헬퍼 함수들도 모두 SpreadsheetApp을 직접 호출하도록 복원 ★★★
function getQuestionText(sheetName, questionHeader) {
    try {
      var settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('과제설정');
      if (!settingsSheet) {
        Logger.log("getQuestionText: '과제설정' 시트를 찾을 수 없습니다.");
        return questionHeader;
      }
      var data = settingsSheet.getDataRange().getValues();
      if (!data || data.length < 2) {
        Logger.log("getQuestionText: '과제설정' 시트에 데이터가 없습니다.");
        return questionHeader;
      }
      var headers = data[0];
      var targetSheetColIndex = headers.indexOf('대상시트');
      var questionColIndex = headers.indexOf(questionHeader);

      if (targetSheetColIndex === -1 || questionColIndex === -1) {
        Logger.log("getQuestionText: '대상시트' 또는 '" + questionHeader + "' 컬럼을 찾을 수 없습니다.");
        return questionHeader;
      }

      var assignmentRow;
      for (var i = 1; i < data.length; i++) {
        if (data[i][targetSheetColIndex] === sheetName) {
          assignmentRow = data[i];
          break;
        }
      }
      return assignmentRow && assignmentRow[questionColIndex] ? assignmentRow[questionColIndex] : questionHeader;
    } catch (e) {
      Logger.log("getQuestionText 오류: " + e.message);
      return questionHeader;
    }
}

function getPromptTemplate(summaryType) {
    try {
      var promptSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('프롬프트');
      if (!promptSheet) {
        throw new Error("'프롬프트' 시트를 찾을 수 없습니다. '필수 시트 생성/초기화' 메뉴를 실행해주세요.");
      }

      var data = promptSheet.getDataRange().getValues();
      if (!data || data.length < 2) {
        throw new Error("'프롬프트' 시트에 데이터가 없습니다. '필수 시트 생성/초기화' 메뉴를 실행해주세요.");
      }

      var headers = data.shift(); // 헤더 행 제거

      // 요약종류가 일치하는 프롬프트 찾기
      var templateRow;
      for (var i = 0; i < data.length; i++) {
          if (data[i][0] === summaryType) {
              templateRow = data[i];
              break;
          }
      }

      if (templateRow && templateRow[1] && templateRow[2] && templateRow[3]) {
          return { persona: templateRow[1], task: templateRow[2], instructions: templateRow[3] };
      }

      // 기본 프롬프트 ('종합의견') 찾기
      var defaultRow;
      for (var j = 0; j < data.length; j++) {
          if (data[j][0] === '종합의견') {
              defaultRow = data[j];
              break;
          }
      }

      if (defaultRow && defaultRow[1] && defaultRow[2] && defaultRow[3]) {
          Logger.log("'" + summaryType + "' 프롬프트를 찾을 수 없어 기본 '종합의견' 프롬프트를 사용합니다.");
          return { persona: defaultRow[1], task: defaultRow[2], instructions: defaultRow[3] };
      } else {
          throw new Error("'" + summaryType + "'에 대한 프롬프트를 '프롬프트' 시트에서 찾을 수 없습니다.\n기본값인 '종합의견' 프롬프트도 없거나 불완전합니다.\n\n'프롬프트' 시트를 확인하고, '필수 시트 생성/초기화' 메뉴를 실행해주세요.");
      }
    } catch (e) {
      Logger.log("getPromptTemplate 오류: " + e.message);
      throw e; // 상위 함수에서 처리하도록 재전달
    }
}


function getSystemStats() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var allSheets = ss.getSheets();
    var requiredSheets = ['메뉴', '학생명단_전체', '과제설정', '공개', 'template', '프롬프트'];
    var totalStudents = 0, totalAssignments = 0, assignmentSheets = 0, otherSheets = 0;
    var studentSheet = ss.getSheetByName('학생명단_전체');
    if (studentSheet) totalStudents = Math.max(0, studentSheet.getLastRow() - 1);
    var assignmentSettingsSheet = ss.getSheetByName('과제설정');
    var assignmentSheetNames = [];
    if (assignmentSettingsSheet && assignmentSettingsSheet.getLastRow() > 1) {
      totalAssignments = Math.max(0, assignmentSettingsSheet.getLastRow() - 1);
      assignmentSheetNames = assignmentSettingsSheet.getRange('D2:D' + assignmentSettingsSheet.getLastRow()).getValues()
        .map(function(row) { return row[0]; }).filter(String);
    }
    allSheets.forEach(function(sheet) {
      var name = sheet.getName();
      if (requiredSheets.indexOf(name) > -1) return;
      if (assignmentSheetNames.indexOf(name) > -1) {
        assignmentSheets++;
      } else {
        otherSheets++;
      }
    });
    return { totalStudents: totalStudents, totalAssignments: totalAssignments, totalSheets: allSheets.length, assignmentSheets: assignmentSheets, otherSheets: otherSheets };
  } catch(e) {
    Logger.log('getSystemStats Error: ' + e.message);
    return null;
  }
}

function getStudentCountByClass() {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var studentSheet = ss.getSheetByName('학생명단_전체');
      if (!studentSheet || studentSheet.getLastRow() < 2) return {};
      var classRange = studentSheet.getRange("B2:B" + studentSheet.getLastRow());
      var classes = classRange.getValues().flat().filter(String);
      var counts = {};
      classes.forEach(function(className) {
        counts[className] = (counts[className] || 0) + 1;
      });
      return counts;
    } catch(e) {
      Logger.log('getStudentCountByClass Error: ' + e.message);
      return {};
    }
}

function getSubmissionStatus(totalStudents) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var assignmentSettingsSheet = ss.getSheetByName('과제설정');
    if (!assignmentSettingsSheet || totalStudents === 0 || assignmentSettingsSheet.getLastRow() < 2) return [];
    var data = assignmentSettingsSheet.getDataRange().getValues();
    var status = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var isPublic = row[0] === true;
      var assignmentName = row[2];
      var targetSheetName = row[3];
      if (isPublic && targetSheetName) {
        var targetSheet = ss.getSheetByName(targetSheetName);
        if (targetSheet) {
          var submittedCount = Math.max(0, targetSheet.getLastRow() - 1);
          var rate = submittedCount > 0 ? submittedCount / totalStudents : 0;
          status.push({
            name: assignmentName,
            status: submittedCount + '/' + totalStudents + ' 명',
            rate: rate > 0 ? rate : 0.0001 
          });
        }
      }
    }
    return status;
  } catch(e) {
    Logger.log('getSubmissionStatus Error: ' + e.message);
    return [];
  }
}
