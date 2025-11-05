/**
 * ==============================================
 * Dashboard.gs - 대시보드 관리 (v15.0 - 성능 최적화)
 * ==============================================
 * 1. 미제출 학생이 많을 경우, 셀에는 인원수만 요약 표시합니다.
 * 2. 전체 명단은 셀 노트(메모)에 '반-번호' 순으로 정렬하여 표시합니다.
 * 3. 미제출 학생이 적을 경우에도 '반-번호' 순으로 정렬하여 셀에 직접 표시합니다.
 * 4. ★★★ batchGet API로 과제 시트를 일괄 조회하여 성능 개선 ★★★
 */

// 테마 색상 정의 (이전과 동일)
const THEME = {
  primary: "#4A80FE", background: "#F8F9FA", header: "#E9ECF1",
  title: "#FFFFFF", text: "#202124", border: "#DADCE0",
  accent_green: "#34A853", accent_red: "#EA4335",
  sparkline_bar: "#D3E3FD", total_bg: "#FFF4CC",
};

/**
 * 메뉴의 '대시보드 새로고침'을 클릭했을 때 실행되는 함수입니다.
 */
function refreshDashboard() {
  const ui = SpreadsheetApp.getUi();
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast("대시보드를 새로고치고 있습니다...", "🚀 업데이트 중");
    updateDashboard();
    SpreadsheetApp.getActiveSpreadsheet().toast("대시보드가 최신 정보로 업데이트되었습니다.", "✅ 새로고침 완료", 5);
  } catch (e) {
    Logger.log("refreshDashboard Error: " + e.message + "\n" + e.stack);
    ui.alert("❌ 새로고침 실패", "대시보드 업데이트 중 오류가 발생했습니다: " + e.message, ui.ButtonSet.OK);
  }
}


/**
 * 대시보드의 전체 레이아웃을 생성하고 데이터를 채웁니다.
 */
function updateDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("메뉴");
  if (!sheet) {
    sheet = ss.insertSheet("메뉴", 0);
  }

  // --- 데이터 수집 ---
  const studentData = getFullStudentList(); // '번호'를 포함한 전체 학생 정보 가져오기
  const studentCountByClass = getStudentCountByClass(studentData);
  const totalStudents = Object.keys(studentData).length;
  
  // ★★★ 미제출 학생 명단 로직이 포함된 함수 호출 ★★★
  const assignmentStats = calculateAssignmentStatsByClass(studentData, studentCountByClass, totalStudents);

  // --- 시트 초기화 및 스타일링 (기존과 유사) ---
  sheet.clear();
  sheet.clearFormats();
  sheet.clearConditionalFormatRules();
  sheet.setFrozenRows(2);
  sheet.setTabColor(THEME.primary);
  sheet.setHiddenGridlines(true);

  const maxRows = Math.max(100, sheet.getMaxRows());
  sheet.getRange(1, 1, maxRows, 8) // 열 개수를 8개로 유지
      .setBackground(THEME.background).setFontFamily("Google Sans")
      .setFontSize(10).setVerticalAlignment("middle").setFontColor(THEME.text);

  // 헤더, 시스템 현황, 반별 인원 현황 등 (이전 버전과 대부분 동일)
  sheet.getRange("A1:H1").merge().setValue("🎓 학생 포트폴리오 대시보드").setFontSize(20).setFontWeight("bold").setHorizontalAlignment("center").setBackground(THEME.primary).setFontColor(THEME.title);
  sheet.setRowHeight(1, 50);
  sheet.getRange("A2:H2").merge().setValue(`마지막 새로고침: ${Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd HH:mm:ss")}`).setHorizontalAlignment("right").setFontSize(9).setFontColor("#777");
  sheet.setRowHeight(2, 20);
  sheet.getRange("A4:H4").merge().setValue("📊 시스템 현황").setFontSize(14).setFontWeight("bold").setHorizontalAlignment("center").setBackground(THEME.header);
  sheet.getRange("A5").setValue("총 학생 수").setFontSize(11).setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("A6:B6").merge().setValue(totalStudents).setFontSize(24).setFontWeight("bold").setFontColor(THEME.primary).setHorizontalAlignment("center");
  sheet.getRange("C5").setValue("총 과제 수").setFontSize(11).setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("C6:D6").merge().setValue(assignmentStats.totalAssignments).setFontSize(24).setFontWeight("bold").setFontColor(THEME.primary).setHorizontalAlignment("center");
  const avgSubmissionRate = assignmentStats.validCount > 0 ? assignmentStats.totalRate / assignmentStats.validCount : 0;
  sheet.getRange("E5:F5").merge().setValue("전체 평균 제출률").setFontSize(11).setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("E6:F6").merge().setValue(avgSubmissionRate).setNumberFormat("0.0%").setFontSize(24).setFontWeight("bold").setFontColor(THEME.primary).setHorizontalAlignment("center");
  sheet.setRowHeight(5, 30);
  sheet.setRowHeight(6, 60);

  // --- 과제 제출 현황 (반별 구분) ---
  const assignmentStartRow = 10;
  sheet.getRange(assignmentStartRow, 1, 1, 8).merge().setValue("📝 과제 제출 현황 (반별)").setFontSize(14).setFontWeight("bold").setHorizontalAlignment("center").setBackground(THEME.header);
  sheet.getRange(assignmentStartRow + 1, 1, 1, 8).setValues([["과제명", "대상 반", "제출", "대상", "제출률", "진행률 시각화", "진행 현황", "미제출 학생 명단"]]).setFontWeight("bold").setHorizontalAlignment("center").setBackground(THEME.header);

  if (assignmentStats.rows.length > 0) {
    const dataStartRow = assignmentStartRow + 2;
    const dataRange = sheet.getRange(dataStartRow, 1, assignmentStats.rows.length, 8);
    
    // 값과 노트를 분리하여 설정
    const values = assignmentStats.rows.map(r => r.values);
    const notes = assignmentStats.rows.map(r => r.notes);

    dataRange.setValues(values);
    dataRange.setNotes(notes); // ★★★ 셀 노트(메모) 일괄 적용 ★★★

    sheet.setRowHeights(dataStartRow, assignmentStats.rows.length, 30);
    // 컬럼별 정렬 및 포맷팅 (이전과 동일)
    sheet.getRange(dataStartRow, 1, assignmentStats.rows.length, 1).setHorizontalAlignment("left");
    sheet.getRange(dataStartRow, 2, assignmentStats.rows.length, 7).setHorizontalAlignment("center");
    sheet.getRange(dataStartRow, 8, assignmentStats.rows.length, 1).setHorizontalAlignment("left").setWrap(true);
    sheet.getRange(dataStartRow, 3, assignmentStats.rows.length, 2).setNumberFormat('0"명"');
    sheet.getRange(dataStartRow, 5, assignmentStats.rows.length, 1).setNumberFormat("0.0%");
    assignmentStats.totalRowIndices.forEach(idx => {
      sheet.getRange(dataStartRow + idx, 1, 1, 8).setBackground(THEME.total_bg).setFontWeight("bold");
    });
    const rateRange = sheet.getRange(dataStartRow, 5, assignmentStats.rows.length, 1);
    const rules = [
      SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0.8).setFontColor(THEME.accent_green).setRanges([rateRange]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0.5).setFontColor(THEME.accent_red).setBold(true).setRanges([rateRange]).build()
    ];
    sheet.setConditionalFormatRules(rules);
  }

  // --- 컬럼 너비 설정 ---
  sheet.setColumnWidth(1, 220); sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 80); sheet.setColumnWidth(4, 80);
  sheet.setColumnWidth(5, 80); sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 80); sheet.setColumnWidth(8, 200); // 미제출 학생 명단 열 너비

  SpreadsheetApp.flush();
}

/**
 * '학생명단_전체' 시트에서 모든 학생 정보를 객체로 가져옵니다.
 * @returns {Object} 학번을 키로, {name, class, number} 객체를 값으로 하는 맵
 */
function getFullStudentList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const studentSheet = ss.getSheetByName("학생명단_전체");
  if (!studentSheet || studentSheet.getLastRow() < 2) return {};

  const data = studentSheet.getRange(2, 1, studentSheet.getLastRow() - 1, 4).getValues(); // A:D 학번, 반, 번호, 이름
  const studentMap = {};
  data.forEach(row => {
    const id = String(row[0]).trim();
    if (id) {
      studentMap[id] = {
        name: String(row[3]).trim(),
        class: String(row[1]).trim(),
        number: String(row[2]).trim()
      };
    }
  });
  return studentMap;
}

/**
 * ★★★ 코드 중복 제거: Helpers.gs로 이동됨 ★★★
 * 하위 호환성을 위해 Wrapper 함수 유지
 */
function getStudentCountByClass(studentData) {
    return getStudentCountByClassHelper(studentData);
}


// getAssignmentData 함수는 이전과 동일합니다.
function getAssignmentData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const publicSheet = ss.getSheetByName("공개");
    if (!publicSheet || publicSheet.getLastRow() < 2) return [];
    return publicSheet.getRange(2, 2, publicSheet.getLastRow() - 1, 2).getValues();
  } catch (e) { return []; }
}

/**
 * ★★★ 핵심 수정 v2.0 - batchGet으로 성능 최적화 ★★★
 * 과제별 제출 통계를 계산하고, 미제출 학생 명단을 정렬하여 값과 노트로 분리합니다.
 */
function calculateAssignmentStatsByClass(studentData, studentCountByClass, totalStudents) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const assignmentData = getAssignmentData();
  const allStudentIds = Object.keys(studentData);

  const result = {
    rows: [], totalRate: 0, validCount: 0,
    totalAssignments: 0, totalRowIndices: []
  };

  // ★★★ 성능 개선: 모든 과제 시트를 한 번에 조회 ★★★
  const sheetNames = assignmentData.map(row => row[0]).filter(Boolean);
  const submittedIdsMap = {};

  if (sheetNames.length > 0) {
    try {
      // SpreadsheetApp의 getSheetByName()을 여러 번 호출하는 대신,
      // 모든 시트의 A열(학번)을 한 번에 가져옴
      sheetNames.forEach(sheetName => {
        const targetSheet = ss.getSheetByName(sheetName);
        if (targetSheet && targetSheet.getLastRow() > 1) {
          const submittedIds = targetSheet
            .getRange(2, 1, targetSheet.getLastRow() - 1, 1)
            .getValues()
            .flat()
            .filter(String);
          submittedIdsMap[sheetName] = submittedIds;
        } else {
          submittedIdsMap[sheetName] = [];
        }
      });

      Logger.log(`[Dashboard] batchGet 최적화: ${sheetNames.length}개 시트 조회 완료`);
    } catch (e) {
      Logger.log('[Dashboard] batchGet 오류:', e.message);
      // 오류 발생 시 빈 맵으로 처리
      sheetNames.forEach(name => submittedIdsMap[name] = []);
    }
  }

  assignmentData.forEach(row => {
    const sheetName = row[0];
    if (!sheetName) return;

    result.totalAssignments++;

    // ★★★ 캐시된 제출자 ID 목록 사용 ★★★
    const submittedIds = submittedIdsMap[sheetName] || [];

    // 전체 학생 중 제출하지 않은 학생 ID 필터링
    const notSubmittedIds = allStudentIds.filter(id => !submittedIds.includes(id));

    // 미제출 학생 정보를 객체 배열로 만든 후 정렬
    const notSubmittedStudents = notSubmittedIds.map(id => ({
      id: id,
      name: studentData[id].name,
      class: studentData[id].class,
      number: parseInt(studentData[id].number, 10) || 0 // 번호순 정렬을 위해 숫자로 변환
    })).sort((a, b) => {
      if (a.class < b.class) return -1;
      if (a.class > b.class) return 1;
      return a.number - b.number; // 같은 반이면 번호순으로 정렬
    });

    // ★★★ 표시할 텍스트와 노트에 넣을 텍스트 생성 ★★★
    let displayText, noteText;
    const notSubmittedCount = notSubmittedStudents.length;

    if (notSubmittedCount === 0) {
      displayText = "✅ 전원 제출 완료";
      noteText = "";
    } else {
      const fullListString = notSubmittedStudents
        .map(s => `${s.class}-${s.number} ${s.name}`)
        .join("\n");

      if (notSubmittedCount > 5) {
        displayText = `${notSubmittedCount}명 (명단 확인)`;
        noteText = fullListString;
      } else {
        displayText = notSubmittedStudents.map(s => s.name).join(", ");
        noteText = fullListString;
      }
    }
    
    // 제출률 계산
    const submittedCount = totalStudents - notSubmittedCount;
    const submissionRate = totalStudents > 0 ? submittedCount / totalStudents : 0;
    const targetSheet = ss.getSheetByName(sheetName);
    const url = targetSheet ? `https://docs.google.com/spreadsheets/d/${ss.getId()}/edit#gid=${targetSheet.getSheetId()}` : "#";

    // 결과 행 데이터 구성 (값과 노트를 객체로 묶음)
    result.rows.push({
        values: [
            `=HYPERLINK("${url}", "${sheetName}${targetSheet ? "" : " (시트없음)"}")`,
            "전체",
            submittedCount,
            totalStudents,
            submissionRate,
            `=SPARKLINE(${submittedCount}, {"charttype","bar";"max",${totalStudents};"color1","${THEME.sparkline_bar}"})`,
            `${submittedCount}/${totalStudents}`,
            displayText
        ],
        notes: ["", "", "", "", "", "", "", noteText] // 8번째 열에만 노트 추가
    });

    if (totalStudents > 0) {
        result.totalRate += submissionRate;
        result.validCount++;
    }
  });

  return result;
}

// createDashboardLayout 함수는 하위 호환성을 위해 유지합니다.
function createDashboardLayout() {
  updateDashboard();
}
