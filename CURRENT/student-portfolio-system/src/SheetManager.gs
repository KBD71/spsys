/**
 * ==============================================
 * SheetManager.gs - 시트 관리 (v2.0 - 시험 모드 추가)
 * ==============================================
 * 시트 생성, 삭제, 초기화 등 범용적인 시트 관리 기능을 담당합니다.
 * (수정: 'template' 시트에 '이탈횟수' 열 추가, 과제설정에 시험모드 관련 컬럼 추가)
 */

/**
 * 시스템에 필요한 필수 시트들을 생성하고 기본 헤더를 설정합니다.
 */
function initializeMinimalSystem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  try {
    var requiredSheets = {
      메뉴: [],
      학생명단_전체: ["학번", "반", "번호", "이름", "비밀번호"],
      과제설정: [
        "과제ID",
        "과제명",
        "설명",
        "대상반",
        "질문1",
        "질문2",
        "질문3"
      ]
    };

    var createdCount = 0;
    for (var sheetName in requiredSheets) {
      if (!ss.getSheetByName(sheetName)) {
        var sheet = ss.insertSheet(sheetName);
        if (requiredSheets[sheetName].length > 0) {
          sheet
            .getRange(1, 1, 1, requiredSheets[sheetName].length)
            .setValues([requiredSheets[sheetName]])
            .setBackground("#667eea")
            .setFontColor("white")
            .setFontWeight("bold");
        }
        createdCount++;
      }
    }

    if (createdCount > 0) {
      ui.alert(
        "✅ 필수 시트 생성 완료",
        `${createdCount}개의 시트가 생성되었습니다.`,
        ui.ButtonSet.OK
      );
    } else {
      ui.alert("✅ 시스템 확인 완료", "모든 필수 시트가 이미 존재합니다.", ui.ButtonSet.OK);
    }

    createDashboardLayout();
    updateDashboard();
  } catch (e) {
    ui.alert("❌ 초기화 실패", e.message, ui.ButtonSet.OK);
  }
}

/**
 * 이름으로 시트를 찾아 삭제하고, 관련 설정 시트의 정보도 함께 제거합니다.
 */
function deleteSheetByName(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    ui.alert("오류", `"${sheetName}" 시트를 찾을 수 없습니다.`, ui.ButtonSet.OK);
    return;
  }

  var confirm = ui.alert(
    "삭제 확인",
    `정말로 '${sheetName}' 시트를 삭제하시겠습니까?`,
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  try {
    var deletedFromSettings = deleteRowBySheetName(ss, "과제설정", "대상시트", sheetName);
    Logger.log(`과제설정 시트에서 ${deletedFromSettings}개 행 삭제`);

    // ★★★ v2 구조 호환: '시트이름' 또는 '대상시트' 모두 시도 ★★★
    var deletedFromPublic = deleteRowBySheetName(ss, "공개", "대상시트", sheetName);
    if (deletedFromPublic === 0) {
      // v1 구조 폴백
      deletedFromPublic = deleteRowBySheetName(ss, "공개", "시트이름", sheetName);
    }
    Logger.log(`공개 시트에서 ${deletedFromPublic}개 행 삭제`);

    ss.deleteSheet(sheet);

    updateDashboard();
    ui.alert(
      "✅ 삭제 완료",
      `"${sheetName}" 시트가 삭제되었습니다.\n- 과제설정: ${deletedFromSettings}개 항목 제거\n- 공개: ${deletedFromPublic}개 항목 제거`,
      ui.ButtonSet.OK
    );
  } catch (e) {
    Logger.log("deleteSheetByName 오류: " + e.message + "\n" + e.stack);
    ui.alert("❌ 삭제 실패", e.message, ui.ButtonSet.OK);
  }
}

/**
 * 특정 시트에서 주어진 값과 일치하는 행을 찾아 삭제합니다.
 */
function deleteRowBySheetName(ss, targetSheetName, columnName, valueToDelete) {
  var sheet = ss.getSheetByName(targetSheetName);
  if (!sheet || sheet.getLastRow() < 2) {
    Logger.log(`${targetSheetName} 시트가 없거나 데이터가 없습니다.`);
    return 0;
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var colIndex = headers.map(function(h) { return String(h).trim(); }).indexOf(columnName);

  if (colIndex === -1) {
    Logger.log(`${targetSheetName} 시트에서 "${columnName}" 컬럼을 찾을 수 없습니다. 실제 헤더: ${JSON.stringify(headers)}`);
    return 0;
  }

  var deletedCount = 0;
  var valueToDeleteTrimmed = String(valueToDelete).trim();
  for (var i = data.length - 1; i > 0; i--) {
    var cellValue = String(data[i][colIndex]).trim();
    if (cellValue === valueToDeleteTrimmed) {
      sheet.deleteRow(i + 1);
      deletedCount++;
      Logger.log(`${targetSheetName} 시트의 ${i + 1}번 행 삭제 완료: ${valueToDelete}`);
    }
  }

  return deletedCount;
}
