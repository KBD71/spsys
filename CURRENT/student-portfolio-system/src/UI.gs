
/**
 * ==============================================
 * UI.gs - 사용자 인터페이스 관리 (v2.0 - 시험 로그 추가)
 * ==============================================
 * 메뉴바, 바로가기, 사이드바, 프롬프트 창 등 UI 관련 함수를 담당합니다.
 */

// --- 바로가기 함수 ---
function goToMenu() { goToSheet('메뉴'); }
function goToStudents() { goToSheet('학생명단_전체'); }
function goToAssignments() { goToSheet('과제설정'); }
function goToPublic() { goToSheet('공개'); }
function goToPrompts() { goToSheet('프롬프트'); }
function goToExamLog() { goToSheet('시험로그'); } // ★★★ 시험로그 바로가기 추가 ★★★

function goToSheet(sheetName) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (sheet) {
      sheet.activate();
    } else {
      SpreadsheetApp.getUi().alert('오류', `'${sheetName}' 시트를 찾을 수 없습니다.\n\n메뉴에서 '⚙️ 시스템 설정 > 초기화: 필수 시트 생성'을 실행해주세요.`);
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
  var requiredSheets = ['메뉴', '학생명단_전체', '과제설정', '공개', 'template', '프롬프트', '시험로그'];
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

/**
 * ★★★ 시험 감독 관련 UI 함수 추가 ★★★
 */

/**
 * 의심 학생 목록을 대화상자로 표시
 */
function showSuspiciousStudents() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    '과제 ID 입력',
    '의심 학생을 조회할 과제 ID를 입력하세요 (예: TS001):',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() == ui.Button.OK) {
    const assignmentId = response.getResponseText().trim();
    if (!assignmentId) {
      ui.alert('입력 오류', '과제 ID를 입력해주세요.');
      return;
    }

    try {
      const suspiciousStudents = getSuspiciousStudents(assignmentId); // ExamMonitor.gs

      if (suspiciousStudents.length === 0) {
        ui.alert(
          '✅ 조회 결과',
          `과제 ${assignmentId}에서 의심스러운 행동이 감지된 학생이 없습니다.`,
          ui.ButtonSet.OK
        );
      } else {
        let message = `과제 ${assignmentId}의 의심 학생 목록:\n(3회 이상 화면 이탈/전환)\n\n`;
        suspiciousStudents.forEach((student, index) => {
          message += `${index + 1}. ${student.class} ${student.name} (${student.studentId}): ${student.count}회\n`;
        });

        ui.alert('⚠️ 의심 학생 목록', message, ui.ButtonSet.OK);
      }
    } catch (error) {
      ui.alert('❌ 오류', '의심 학생 조회 중 오류가 발생했습니다:\n' + error.message, ui.ButtonSet.OK);
    }
  }
}

/**
 * 시험로그 초기화 (교사용)
 */
function clearExamLogs() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '⚠️ 시험로그 초기화',
    '정말로 모든 시험 로그를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
    ui.ButtonSet.YES_NO
  );

  if (response == ui.Button.YES) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const logSheet = ss.getSheetByName('시험로그');
      
      if (!logSheet) {
        ui.alert('오류', '시험로그 시트를 찾을 수 없습니다.', ui.ButtonSet.OK);
        return;
      }

      // 헤더를 제외한 모든 데이터 삭제
      if (logSheet.getLastRow() > 1) {
        logSheet.deleteRows(2, logSheet.getLastRow() - 1);
      }

      ui.alert('✅ 초기화 완료', '모든 시험 로그가 삭제되었습니다.', ui.ButtonSet.OK);
      
    } catch (error) {
      ui.alert('❌ 오류', '시험로그 초기화 중 오류가 발생했습니다:\n' + error.message, ui.ButtonSet.OK);
    }
  }
}
