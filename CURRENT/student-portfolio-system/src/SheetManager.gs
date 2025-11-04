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
        // "공개", // ★★★ 제거: '공개' 시트에서 관리 ★★★
        "재제출허용",
        "과제ID",
        "과제명",
        "대상시트",
        "시작일",
        "마감일",
        // ★★★ 시험 모드 관련 컬럼 추가 ★★★
        "시험모드",
        "이탈허용횟수",
        "강제전체화면",
        // ★★★ 여기까지 추가 ★★★
        "질문1", "질문2", "질문3", "질문4", "질문5",
        "질문6", "질문7", "질문8", "질문9", "질문10",
        "질문11", "질문12", "질문13", "질문14", "질문15",
        "질문16", "질문17", "질문18", "질문19", "질문20",
      ],
      공개: ["과제공개", "대상시트", "대상반", "의견공개", "알림메시지"],
      template: [
        "학번", "반", "이름",
        "질문1", "질문2", "질문3", "질문4", "질문5",
        "질문6", "질문7", "질문8", "질문9", "질문10",
        "질문11", "질문12", "질문13", "질문14", "질문15",
        "질문16", "질문17", "질문18", "질문19", "질문20",
        "제출일시", "초안생성", 
        "이탈횟수", // ★★★ 시험 이탈 횟수 추가 ★★★
        "종합의견",
        "AI 검사 결과",
      ],
      프롬프트: [
        "요약종류", "역할 (Persona)", "작업 (Task)", "지시사항 (Instructions)",
      ],
      // ★★★ 시험로그 시트 추가 ★★★
      시험로그: [
        "타임스탬프", "학번", "이름", "반", "과제ID", "과제명", 
        "이벤트타입", "지속시간(초)", "상세정보"
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

          // 체크박스 설정
          if (sheetName === '공개') {
            var headers = requiredSheets[sheetName];
            var checkboxRule = SpreadsheetApp.newDataValidation()
              .requireCheckbox()
              .setAllowInvalid(false)
              .build();

            // ★★★ v2: 과제공개, 의견공개 체크박스 ★★★
            var checkboxColumns = ['과제공개', '의견공개'];

            checkboxColumns.forEach(function(colName) {
              var colIndex = headers.indexOf(colName) + 1;
              if (colIndex > 0) {
                sheet.getRange(2, colIndex, sheet.getMaxRows() - 1, 1).setDataValidation(checkboxRule);
              }
            });
          }

          if (sheetName === '과제설정') {
            var headers = requiredSheets[sheetName];
            var checkboxRule = SpreadsheetApp.newDataValidation()
              .requireCheckbox()
              .setAllowInvalid(false)
              .build();

            // ★★★ 시험모드, 강제전체화면 체크박스 추가 ★★★
            // '공개' 제거됨 (공개 시트에서 관리)
            var checkboxColumns = ['재제출허용', '시험모드', '강제전체화면'];

            checkboxColumns.forEach(function(colName) {
              var colIndex = headers.indexOf(colName) + 1;
              if (colIndex > 0) {
                sheet.getRange(2, colIndex, sheet.getMaxRows() - 1, 1).setDataValidation(checkboxRule);
              }
            });
            
            // 이탈허용횟수 컬럼에 숫자 검증 규칙 추가
            var violationColIndex = headers.indexOf('이탈허용횟수') + 1;
            if (violationColIndex > 0) {
              var numberRule = SpreadsheetApp.newDataValidation()
                .requireNumberBetween(0, 10)
                .setAllowInvalid(false)
                .setHelpText('0~10 사이의 숫자를 입력하세요')
                .build();
              sheet.getRange(2, violationColIndex, sheet.getMaxRows() - 1, 1).setDataValidation(numberRule);
            }
          }

          if (sheetName === 'template') {
            var headers = requiredSheets[sheetName];
            var draftColIndex = headers.indexOf('초안생성');
            if (draftColIndex !== -1) {
              var draftColRange = sheet.getRange(2, draftColIndex + 1, sheet.getMaxRows() - 1, 1);
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
        `${createdCount}개의 시트가 생성되었습니다.\n\n시험 모드 기능이 추가되었습니다:\n- 과제설정: 시험모드, 이탈허용횟수, 강제전체화면\n- 시험로그: 학생 행동 로그 기록\n- template: 이탈횟수 기록`,
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
