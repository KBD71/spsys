/**
 * ==============================================
 * Dashboard.gs - 대시보드 관리 (v13.0 - 반별 과제 진행률)
 * ==============================================
 * 학생 포트폴리오 시스템의 대시보드를 관리합니다.
 * 과제별로 반을 구분하여 진행률을 표시하고, 과제별 총합을 표시합니다.
 * @version 13.0
 */

// 테마 색상 정의
const THEME = {
  primary: "#4A80FE",
  background: "#F8F9FA",
  header: "#E9ECF1",
  title: "#FFFFFF",
  text: "#202124",
  border: "#DADCE0",
  accent_green: "#34A853",
  accent_red: "#EA4335",
  sparkline_bar: "#D3E3FD",
  total_bg: "#FFF4CC",
};

/**
 * 메뉴의 '대시보드 새로고침'을 클릭했을 때 실행되는 함수입니다.
 */
function refreshDashboard() {
  const ui = SpreadsheetApp.getUi();
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "대시보드를 새로고치고 있습니다...",
      "🚀 업데이트 중"
    );
    updateDashboard();
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "대시보드가 최신 정보로 업데이트되었습니다.",
      "✅ 새로고침 완료",
      5
    );
  } catch (e) {
    Logger.log("refreshDashboard Error: " + e.message + "\n" + e.stack);
    ui.alert(
      "❌ 새로고침 실패",
      "대시보드 업데이트 중 오류가 발생했습니다: " + e.message,
      ui.ButtonSet.OK
    );
  }
}

/**
 * 대시보드의 전체 레이아웃을 생성하고 데이터를 채웁니다.
 */
function updateDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("메뉴");

  // 메뉴 시트가 없으면 생성
  if (!sheet) {
    sheet = ss.insertSheet("메뉴", 0);
  }

  // --- 데이터 수집 ---
  const studentCountByClass = getStudentCountByClass();
  const totalStudents = Object.values(studentCountByClass).reduce((sum, count) => sum + count, 0);
  const assignmentData = getAssignmentData();
  const assignmentStats = calculateAssignmentStatsByClass(assignmentData, studentCountByClass, totalStudents);

  Logger.log("총 학생 수: " + totalStudents);
  Logger.log("총 과제 수: " + assignmentStats.totalAssignments);

  // --- 시트 초기화 ---
  sheet.clear();
  sheet.clearFormats();
  sheet.clearConditionalFormatRules();
  sheet.setFrozenRows(2);
  sheet.setTabColor(THEME.primary);
  sheet.setHiddenGridlines(true);

  // 기본 스타일 설정
  const maxRows = Math.max(100, sheet.getMaxRows());
  sheet.getRange(1, 1, maxRows, 8)
    .setBackground(THEME.background)
    .setFontFamily("Google Sans")
    .setFontSize(10)
    .setVerticalAlignment("middle")
    .setFontColor(THEME.text);

  // --- 1. 헤더 ---
  sheet.getRange("A1:G1")
    .merge()
    .setValue("🎓 학생 포트폴리오 대시보드")
    .setFontSize(20)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBackground(THEME.primary)
    .setFontColor(THEME.title);
  sheet.setRowHeight(1, 50);

  sheet.getRange("A2:G2")
    .merge()
    .setValue(`마지막 새로고침: ${Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd HH:mm:ss")}`)
    .setHorizontalAlignment("right")
    .setFontSize(9)
    .setFontColor("#777");
  sheet.setRowHeight(2, 20);

  // --- 2. 시스템 현황 ---
  sheet.getRange("A4:G4")
    .merge()
    .setValue("📊 시스템 현황")
    .setFontSize(14)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBackground(THEME.header);

  // KPI 헤더와 값 동시에 설정
  sheet.getRange("A5").setValue("총 학생 수").setFontSize(11).setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("A6:B6").merge().setValue(totalStudents).setFontSize(24).setFontWeight("bold").setFontColor(THEME.primary).setHorizontalAlignment("center");

  sheet.getRange("C5").setValue("총 과제 수").setFontSize(11).setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("C6:D6").merge().setValue(assignmentStats.totalAssignments).setFontSize(24).setFontWeight("bold").setFontColor(THEME.primary).setHorizontalAlignment("center");

  const avgSubmissionRate = assignmentStats.validCount > 0
    ? assignmentStats.totalRate / assignmentStats.validCount
    : 0;
  sheet.getRange("E5").setValue("전체 평균 제출률").setFontSize(11).setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("E6:F6").merge().setValue(avgSubmissionRate).setNumberFormat("0.0%").setFontSize(24).setFontWeight("bold").setFontColor(THEME.primary).setHorizontalAlignment("center");

  sheet.setRowHeight(5, 30);
  sheet.setRowHeight(6, 60);

  // --- 3. 반별 인원 현황 ---
  sheet.getRange("A8:B8")
    .merge()
    .setValue("🧑‍🎓 반별 인원 현황")
    .setFontSize(14)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBackground(THEME.header);

  sheet.getRange("A9:B9")
    .setValues([["반", "인원"]])
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBackground(THEME.header);

  const classRows = Object.keys(studentCountByClass)
    .sort()
    .map(className => [className, studentCountByClass[className]]);

  if (classRows.length > 0) {
    sheet.getRange(10, 1, classRows.length, 2)
      .setValues(classRows)
      .setHorizontalAlignment("center");
  }

  // --- 4. 과제 제출 현황 (반별 구분) ---
  const assignmentStartRow = 10 + classRows.length + 2;

  sheet.getRange(assignmentStartRow, 1, 1, 7)
    .merge()
    .setValue("📝 과제 제출 현황 (반별)")
    .setFontSize(14)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBackground(THEME.header);

  sheet.getRange(assignmentStartRow + 1, 1, 1, 7)
    .setValues([["과제명", "대상 반", "제출", "대상", "제출률", "진행률 시각화", "진행 현황"]])
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBackground(THEME.header);

  if (assignmentStats.rows.length > 0) {
    const dataStartRow = assignmentStartRow + 2;
    sheet.getRange(dataStartRow, 1, assignmentStats.rows.length, 7)
      .setValues(assignmentStats.rows)
      .setVerticalAlignment("middle");

    sheet.setRowHeights(dataStartRow, assignmentStats.rows.length, 30);

    // 컬럼별 정렬
    sheet.getRange(dataStartRow, 1, assignmentStats.rows.length, 1)
      .setHorizontalAlignment("left");
    sheet.getRange(dataStartRow, 2, assignmentStats.rows.length, 6)
      .setHorizontalAlignment("center");

    // 숫자 포맷
    sheet.getRange(dataStartRow, 3, assignmentStats.rows.length, 2)
      .setNumberFormat('0"명"');
    sheet.getRange(dataStartRow, 5, assignmentStats.rows.length, 1)
      .setNumberFormat("0.0%");

    // 합계 행 배경색 적용
    assignmentStats.totalRowIndices.forEach(idx => {
      sheet.getRange(dataStartRow + idx, 1, 1, 7)
        .setBackground(THEME.total_bg)
        .setFontWeight("bold");
    });

    // 조건부 서식
    const rateRange = sheet.getRange(dataStartRow, 5, assignmentStats.rows.length, 1);
    const rules = [
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberGreaterThan(0.8)
        .setFontColor(THEME.accent_green)
        .setRanges([rateRange])
        .build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberLessThan(0.5)
        .setFontColor(THEME.accent_red)
        .setBold(true)
        .setRanges([rateRange])
        .build()
    ];
    sheet.setConditionalFormatRules(rules);
  }

  // --- 컬럼 너비 설정 ---
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 80);
  sheet.setColumnWidth(4, 80);
  sheet.setColumnWidth(5, 80);
  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 80);

  SpreadsheetApp.flush();
}

/**
 * '학생명단_전체' 시트에서 반별 인원을 계산합니다.
 * @returns {Object} 반 이름을 키로, 학생 수를 값으로 하는 객체
 */
function getStudentCountByClass() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const studentSheet = ss.getSheetByName("학생명단_전체");

    if (!studentSheet) {
      Logger.log("학생명단_전체 시트를 찾을 수 없습니다.");
      return {};
    }

    const lastRow = studentSheet.getLastRow();
    if (lastRow < 2) {
      Logger.log("학생명단_전체 시트에 데이터가 없습니다.");
      return {};
    }

    // A열(학번)과 B열(반) 모두 읽기
    const data = studentSheet.getRange(2, 1, lastRow - 1, 2).getValues();
    const counts = {};

    data.forEach(row => {
      const id = String(row[0]).trim();
      const classCol = String(row[1]).trim();

      // B열에 반 정보가 있으면 그것을 사용
      if (classCol) {
        counts[classCol] = (counts[classCol] || 0) + 1;
      }
      // B열이 없으면 학번에서 추출
      else if (/^\d{3,}/.test(id)) {
        const classCode = id.substring(0, 3);
        const grade = classCode.charAt(0);
        const classNum = parseInt(classCode.substring(1), 10);
        const className = `${grade}학년 ${classNum}반`;
        counts[className] = (counts[className] || 0) + 1;
      }
    });

    Logger.log("반별 학생 수: " + JSON.stringify(counts));
    return counts;
  } catch (e) {
    Logger.log("getStudentCountByClass 오류: " + e.message);
    return {};
  }
}

/**
 * '공개' 시트에서 과제 데이터를 가져옵니다.
 * @returns {Array} [시트이름, 대상반] 배열
 */
function getAssignmentData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const publicSheet = ss.getSheetByName("공개");

    if (!publicSheet) {
      Logger.log("공개 시트를 찾을 수 없습니다.");
      return [];
    }

    const lastRow = publicSheet.getLastRow();
    if (lastRow < 2) {
      Logger.log("공개 시트에 데이터가 없습니다.");
      return [];
    }

    const data = publicSheet.getRange(2, 2, lastRow - 1, 2).getValues();
    Logger.log("과제 데이터 개수: " + data.filter(row => row[0]).length);
    return data;
  } catch (e) {
    Logger.log("getAssignmentData 오류: " + e.message);
    return [];
  }
}

/**
 * 과제별 제출 통계를 반별로 구분하여 계산합니다.
 * @param {Array} assignmentData - 과제 데이터
 * @param {Object} studentCountByClass - 반별 학생 수
 * @param {number} totalStudents - 전체 학생 수
 * @returns {Object} 통계 정보 (rows, totalRate, validCount, totalAssignments, totalRowIndices)
 */
function calculateAssignmentStatsByClass(assignmentData, studentCountByClass, totalStudents) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rows = [];
  const totalRowIndices = [];
  let totalRate = 0;
  let validCount = 0;
  let totalAssignments = 0;

  Logger.log("=== 과제 통계 계산 시작 (반별 구분) ===");

  assignmentData.forEach(row => {
    const sheetName = row[0];
    const targetClassesStr = row[1] ? String(row[1]).trim() : "";

    if (!sheetName) return;

    totalAssignments++;

    const targetSheet = ss.getSheetByName(sheetName);
    const url = targetSheet
      ? `https://docs.google.com/spreadsheets/d/${ss.getId()}/edit#gid=${targetSheet.getSheetId()}`
      : "http://";

    // 전체 제출 인원 (한 번만 계산)
    const totalSubmittedCount = targetSheet ? Math.max(0, targetSheet.getLastRow() - 1) : 0;

    // "전체" 또는 빈 값인 경우
    if (targetClassesStr === "전체" || !targetClassesStr) {
      const submissionRate = totalStudents > 0 ? totalSubmittedCount / totalStudents : 0;

      rows.push([
        `=HYPERLINK("${url}", "${sheetName}${targetSheet ? "" : " (시트없음)"}")`,
        "전체",
        totalSubmittedCount,
        totalStudents,
        submissionRate,
        `=SPARKLINE(${totalSubmittedCount}, {"charttype","bar";"max",${totalStudents};"color1","${THEME.sparkline_bar}"})`,
        `${totalSubmittedCount}/${totalStudents}`
      ]);

      if (totalStudents > 0) {
        totalRate += submissionRate;
        validCount++;
      }
    }
    // 여러 반이 대상인 경우
    else {
      const classCodes = targetClassesStr.split(",").map(c => c.trim());

      // 과제 시트에서 실제 제출된 학생의 반 정보 읽기
      const submittedByClass = getSubmittedCountByClass(targetSheet, studentCountByClass);

      let assignmentTotalSubmitted = 0;
      let assignmentTotalTarget = 0;

      classCodes.forEach((code, idx) => {
        let className = "";
        let classKey = "";
        let targetCount = 0;

        // 3자리 숫자 코드 (예: "101", "106")
        if (/^\d{3}$/.test(code)) {
          const grade = code.charAt(0);
          const classNum = parseInt(code.substring(1), 10);
          className = `${grade}학년 ${classNum}반`;
          classKey = studentCountByClass[className] !== undefined ? className : classNum.toString();
          targetCount = studentCountByClass[classKey] || 0;
        }
        // 이미 반 이름 형식인 경우
        else {
          className = code;
          classKey = code;
          targetCount = studentCountByClass[code] || 0;
        }

        // 실제 제출 인원 (과제 시트에서 계산)
        const submittedCount = submittedByClass[classKey] || 0;
        const submissionRate = targetCount > 0 ? submittedCount / targetCount : 0;

        // 과제명은 첫 번째 반에만 표시, 나머지는 빈 칸
        const displayName = idx === 0
          ? `=HYPERLINK("${url}", "${sheetName}${targetSheet ? "" : " (시트없음)"}")`
          : "";

        rows.push([
          displayName,
          className,
          submittedCount,
          targetCount,
          submissionRate,
          `=SPARKLINE(${submittedCount}, {"charttype","bar";"max",${targetCount};"color1","${THEME.sparkline_bar}"})`,
          `${submittedCount}/${targetCount}`
        ]);

        assignmentTotalSubmitted += submittedCount;
        assignmentTotalTarget += targetCount;

        if (targetCount > 0) {
          totalRate += submissionRate;
          validCount++;
        }
      });

      // 과제별 합계 행 추가
      const assignmentTotalRate = assignmentTotalTarget > 0 ? assignmentTotalSubmitted / assignmentTotalTarget : 0;
      rows.push([
        `  └ ${sheetName} 합계`,
        `${classCodes.length}개 반`,
        assignmentTotalSubmitted,
        assignmentTotalTarget,
        assignmentTotalRate,
        `=SPARKLINE(${assignmentTotalSubmitted}, {"charttype","bar";"max",${assignmentTotalTarget};"color1","${THEME.sparkline_bar}"})`,
        `${assignmentTotalSubmitted}/${assignmentTotalTarget}`
      ]);

      totalRowIndices.push(rows.length - 1);
    }

    Logger.log(`[${sheetName}] 대상: ${targetClassesStr}, 제출: ${totalSubmittedCount}`);
  });

  Logger.log(`총 과제 수: ${totalAssignments}, 유효 카운트: ${validCount}`);

  return {
    rows: rows,
    totalRate: totalRate,
    validCount: validCount,
    totalAssignments: totalAssignments,
    totalRowIndices: totalRowIndices
  };
}

/**
 * 과제 시트에서 반별 제출 인원을 계산합니다.
 * @param {Sheet} sheet - 과제 시트
 * @param {Object} studentCountByClass - 반별 학생 수 (키 형식 확인용)
 * @returns {Object} 반별 제출 인원
 */
function getSubmittedCountByClass(sheet, studentCountByClass) {
  const counts = {};

  if (!sheet || sheet.getLastRow() < 2) {
    return counts;
  }

  try {
    // B열(반) 데이터 읽기 (헤더 제외)
    const classData = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();

    classData.forEach(row => {
      const classValue = String(row[0]).trim();
      if (classValue) {
        counts[classValue] = (counts[classValue] || 0) + 1;
      }
    });

    Logger.log(`  제출 현황: ${JSON.stringify(counts)}`);
  } catch (e) {
    Logger.log(`  제출 현황 읽기 오류: ${e.message}`);
  }

  return counts;
}

/**
 * 대시보드 레이아웃만 생성 (하위 호환성을 위해 유지)
 */
function createDashboardLayout() {
  updateDashboard();
}
