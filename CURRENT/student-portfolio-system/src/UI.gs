/**
 * ==============================================
 * UI.gs - 사용자 인터페이스 관리
 * ==============================================
 * 메뉴바, 바로가기, 사이드바, 프롬프트 창 등 UI 관련 함수를 담당합니다.
 */

// --- 바로가기 함수 ---
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
      SpreadsheetApp.getUi().alert('오류', `'${sheetName}' 시트를 찾을 수 없습니다.`);
    }
  } catch (e) { /* 오류 무시 */ }
}

// --- 사이드바 및 프롬프트 함수 ---

/**
 * '새 과제 생성' 사이드바를 표시합니다.
 */
function showAssignmentCreatorSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('AssignmentCreator')
      .setTitle('새 과제 생성')
      .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * 사용자에게 삭제할 시트 이름을 입력받는 프롬프트 창을 띄웁니다.
 */
function promptToDeleteSheet() {
  var ui = SpreadsheetApp.getUi();
  var requiredSheets = ['메뉴', '학생명단_전체', '과제설정', '공개', 'template', '프롬프트'];
  var response = ui.prompt('🗑️ 시트 삭제', '삭제할 시트의 전체 이름을 정확히 입력하세요:', ui.ButtonSet.OK_CANCEL);

  if (response.getSelectedButton() == ui.Button.OK) {
    var sheetName = response.getResponseText().trim();
    if (!sheetName) {
      ui.alert('입력 오류', '시트 이름이 입력되지 않았습니다.');
      return;
    }
    if (requiredSheets.includes(sheetName)) {
      ui.alert('삭제 불가', `"${sheetName}" 시트는 시스템 필수 시트이므로 삭제할 수 없습니다.`);
      return;
    }
    deleteSheetByName(sheetName); // SheetManager.gs 함수 호출
  }
}
