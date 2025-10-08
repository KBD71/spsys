/**
 * ==============================================
 * SheetManager.gs - 시트 관리
 * ==============================================
 * 시트 생성, 삭제, 초기화 등 범용적인 시트 관리 기능을 담당합니다.
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
        "공개",
        "과제ID",
        "과제명",
        "대상시트",
        "시작일",
        "마감일",
        "질문1",
        "질문2",
        "질문3",
        "질문4",
        "질문5",
        "질문6",
        "질문7",
        "질문8",
        "질문9",
        "질문10",
        "질문11",
        "질문12",
        "질문13",
        "질문14",
        "질문15",
        "질문16",
        "질문17",
        "질문18",
        "질문19",
        "질문20",
      ],
      // '공개' 시트의 헤더를 사용자가 알려준 '공개시트'로 확정할 수 있으나,
      // 생성 스크립트는 기존의 다른 기능과 연관될 수 있으므로 원본을 유지합니다.
      // 만약 생성부터 '공개시트'로 해야 한다면 이 부분을 수정해야 합니다.
      공개: ["공개", "시트이름", "대상반"], 
      template: [
        "학번",
        "반",
        "이름",
        "질문1",
        "질문2",
        "질문3",
        "질문4",
        "질문5",
        "질문6",
        "질문7",
        "질문8",
        "질문9",
        "질문10",
        "질문11",
        "질문12",
        "질문13",
        "질문14",
        "질문15",
        "질문16",
        "질문17",
        "질문18",
        "질문19",
        "질문20",
        "제출일시",
        "초안생성",
        "종합의견",
      ],
      프롬프트: [
        "요약종류",
        "역할 (Persona)",
        "작업 (Task)",
        "지시사항 (Instructions)",
      ],
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

          if (sheetName === '공개' || sheetName === '과제설정') {
            var firstColRange = sheet.getRange('A2:A1000');
            var checkboxRule = SpreadsheetApp.newDataValidation()
              .requireCheckbox()
              .setAllowInvalid(false)
              .build();
            firstColRange.setDataValidation(checkboxRule);
          }

          if (sheetName === 'template') {
            var headers = requiredSheets[sheetName];
            var draftColIndex = headers.indexOf('초안생성');
            if (draftColIndex !== -1) {
              var draftColRange = sheet.getRange(2, draftColIndex + 1, 999, 1);
              var checkboxRule = SpreadsheetApp.newDataValidation()
                .requireCheckbox()
                .setAllowInvalid(false)
                .build();
              draftColRange.setDataValidation(checkboxRule);
            }
          }
        }
        createdCount++;
      }
    }

    var promptSheet = ss.getSheetByName("프롬프트");
    if (promptSheet.getLastRow() < 2) {
      promptSheet.appendRow([
        "종합의견",
        "학생의 1년간 활동을 종합하여 '행동특성 및 종합의견'을 작성하는 대한민국 고등학교 담임 교사입니다.",
        "학생의 답변과 교사의 평가를 종합하여, 학생의 인성, 학업 태도, 성장 가능성 등이 드러나는 종합의견 초안을 작성해주세요.",
        "- 객관적 사실 기반 서술 ('~함', '~음' 체 사용)\n- 2~3개 문장으로 구성\n- 학생의 잠재력과 발전 가능성 포함",
      ]);
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
 * 이름으로 시트를 찾아 삭제하고, 관련 설정 시트의 정보도 함께 제거합니다. (수정됨)
 * @param {string} sheetName - 삭제할 시트의 이름
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
    // 과제설정 시트에서 해당 행 삭제
    var deletedFromSettings = deleteRowBySheetName(
      ss,
      "과제설정",
      "대상시트",
      sheetName
    );
    Logger.log(`과제설정 시트에서 ${deletedFromSettings}개 행 삭제`);

    // '공개' 시트에서 해당 행 삭제 (헤더 이름을 '공개시트'로 지정)
    var deletedFromPublic = deleteRowBySheetName(
      ss,
      "공개",
      "공개시트", // <-- 사용자 요청에 따라 '시트이름'에서 '공개시트'로 수정됨
      sheetName
    );
    Logger.log(`공개 시트에서 ${deletedFromPublic}개 행 삭제`);

    // 시트 삭제
    ss.deleteSheet(sheet);

    // 대시보드 업데이트
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
 * 특정 시트에서 주어진 값과 일치하는 행을 찾아 삭제합니다. (안정성 강화 버전)
 * @param {Spreadsheet} ss - 현재 스프레드시트 객체
 * @param {string} targetSheetName - 작업할 시트 이름
 * @param {string} columnName - 값을 비교할 컬럼의 헤더 이름
 * @param {string} valueToDelete - 삭제할 행을 식별하는 값
 * @returns {number} 삭제된 행의 개수
 */
function deleteRowBySheetName(ss, targetSheetName, columnName, valueToDelete) {
  var sheet = ss.getSheetByName(targetSheetName);
  if (!sheet || sheet.getLastRow() < 2) {
    Logger.log(
      `${targetSheetName} 시트가 없거나 데이터가 없습니다.`
    );
    return 0;
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  // 헤더의 각 항목에서 공백을 제거하여 정확한 인덱스를 찾습니다.
  var colIndex = headers.map(function(h) { return String(h).trim(); }).indexOf(columnName);

  if (colIndex === -1) {
    Logger.log(
      `${targetSheetName} 시트에서 "${columnName}" 컬럼을 찾을 수 없습니다. 실제 헤더: ${JSON.stringify(
        headers
      )}`
    );
    return 0;
  }

  var deletedCount = 0;
  var valueToDeleteTrimmed = String(valueToDelete).trim();

  // 아래에서부터 순회해야 행 삭제 시 인덱스 문제가 발생하지 않습니다.
  for (var i = data.length - 1; i > 0; i--) {
    // 비교할 셀의 값에서도 공백을 제거한 후 비교합니다.
    var cellValue = String(data[i][colIndex]).trim();
    
    if (cellValue === valueToDeleteTrimmed) {
      sheet.deleteRow(i + 1);
      deletedCount++;
      Logger.log(
        `${targetSheetName} 시트의 ${i + 1}번 행 삭제 완료: ${valueToDelete}`
      );
    }
  }

  return deletedCount;
}
