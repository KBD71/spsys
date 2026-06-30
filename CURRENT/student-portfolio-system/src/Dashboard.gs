/**
 * ==============================================
 * Dashboard.gs - 대시보드 관리 (v18 - 캐시 강제 무효화)
 * ==============================================
 * 1. (수정) 모든 주요 함수 이름(refresh, update, calculate, get)을 v18로 변경하여 서버 캐시 강제 무효화
 * 2. (유지) 빈 과제 시트(헤더만 있음) 조회 시 getRange 오류가 발생하던 버그 수정
 * 3. (유지) 반별 통계 생성 및 학번 String 통일 로직
 */

// 테마 색상 정의
const THEME = {
  primary: "#4A80FE", background: "#F8F9FA", header: "#E9ECF1",
  title: "#FFFFFF", text: "#202124", border: "#DADCE0",
  accent_green: "#34A853", accent_red: "#EA4335",
  sparkline_bar: "#D3E3FD", total_bg: "#FFF4CC",
};

/**
 * ★★★ 이름 변경 (v18) ★★★
 * 메뉴의 '대시보드 새로고침'을 클릭했을 때 실행되는 함수입니다.
 */
function refreshDashboard_v18() {
  const ui = SpreadsheetApp.getUi();
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast("대시보드(v18)를 새로고치고 있습니다...", "🚀 업데이트 중");
    
    // ★★★ 이름 변경 (v18) ★★★
    updateDashboard_v18(); 
    
    SpreadsheetApp.getActiveSpreadsheet().toast("대시보드가 최신 정보로 업데이트되었습니다.", "✅ 새로고침 완료", 5);
  } catch (e) {
    Logger.log("refreshDashboard_v18 Error: " + e.message + "\n" + e.stack);
    ui.alert("❌ 새로고침 실패", "대시보드 업데이트 중 오류가 발생했습니다: " + e.message, ui.ButtonSet.OK);
  }
}


/**
 * ★★★ 이름 변경 (v18) ★★★
 * 대시보드의 전체 레이아웃을 생성하고 데이터를 채웁니다.
 */
function updateDashboard_v18() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("메뉴");
  if (!sheet) {
    sheet = ss.insertSheet("메뉴", 0);
  }

  // --- 데이터 수집 (v18 함수 호출) ---
  const studentData = getFullStudentList_v18();
  const studentCountByClass = getStudentCountByClass(studentData); // Helpers.gs 함수는 그대로 둬도 됨
  const totalStudents = Object.keys(studentData).length;
  const assignmentStats = calculateAssignmentStatsByClass_v18(studentData, studentCountByClass);
  
  // --- 시트 초기화 ---
  sheet.clear();
  sheet.clearFormats();
  sheet.clearConditionalFormatRules();
  sheet.setFrozenRows(2);
  sheet.setTabColor(THEME.primary);
  sheet.setHiddenGridlines(true);
  
  const maxRows = Math.max(100, sheet.getMaxRows());
  sheet.getRange(1, 1, maxRows, 8)
      .setBackground(THEME.background).setFontFamily("Google Sans")
      .setFontSize(10).setVerticalAlignment("middle").setFontColor(THEME.text);
  
  // 헤더, 시스템 현황
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
    
    const values = assignmentStats.rows.map(r => r.values);
    const notes = assignmentStats.rows.map(r => r.notes);

    dataRange.setValues(values);
    dataRange.setNotes(notes); 

    sheet.setRowHeights(dataStartRow, assignmentStats.rows.length, 30);
    
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
  sheet.setColumnWidth(5, 80);
  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 80); sheet.setColumnWidth(8, 200); 

  SpreadsheetApp.flush();
}

/**
 * ★★★ 이름 변경 (v18) ★★★
 * '학생명단_전체' 시트에서 모든 학생 정보를 객체로 가져옵니다.
 */
function getFullStudentList_v18() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const studentSheet = ss.getSheetByName("학생명단_전체");
  if (!studentSheet || studentSheet.getLastRow() < 2) return {};
  
  const data = studentSheet.getRange(2, 1, studentSheet.getLastRow() - 1, 4).getValues();
  const studentMap = {};
  
  data.forEach(row => {
    const id = String(row[0]).trim(); 
    const className = String(row[1]).trim(); 
    const number = String(row[2]).trim(); 
    const name = String(row[3]).trim(); 
    
    if (id && className && name) {
      // ★★★ 학년 및 통합 반 정보 추출 (v19) ★★★
      // ID가 5자리(예: 10101)인 경우 첫 자리를 학년으로 사용
      let grade = "1"; // 기본값
      if (id.length === 5) {
        grade = id.substring(0, 1);
      }
      
      // 통합 반 표시 (예: 1학년 1반 -> "101")
      // className이 숫자만 있는 경우(예: "1") -> "101" (학년 + 0 + 반)
      // 이미 "101" 형식이면 그대로 사용
      let fullClass = className;
      
      // className이 단순히 "1", "2" 등 숫자만 있고 10 미만인 경우
      if (/^\d{1,2}$/.test(className)) {
        const classNum = parseInt(className, 10);
        fullClass = `${grade}${classNum < 10 ? '0' : ''}${classNum}`;
      } else if (className.endsWith('반')) {
          // "1반" -> "101" 변환 시도
          const numPart = className.replace('반', '').trim();
          if (/^\d{1,2}$/.test(numPart)) {
             const classNum = parseInt(numPart, 10);
             fullClass = `${grade}${classNum < 10 ? '0' : ''}${classNum}`;
          }
      }

      studentMap[id] = {
        name: name,
        class: className, // 원본 반 이름 (예: "1반" or "1")
        grade: grade,     // 학년 (예: "1")
        fullClass: fullClass, // 통합 반 이름 (예: "101")
        number: number
      };
    }
  });
  return studentMap;
}

/**
 * Helpers.gs의 함수 호출 (이름 변경 불필요)
 */
function getStudentCountByClass(studentData) {
    return getStudentCountByClassHelper(studentData); 
}


/**
 * ★★★ 이름 변경 (v18) ★★★
 * '공개' 시트에서 v2 구조(A:E)를 읽어옵니다.
 */
function getAssignmentData_v18() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const publicSheet = ss.getSheetByName("공개");
    if (!publicSheet || publicSheet.getLastRow() < 2) return [];
    
    return publicSheet.getRange(2, 1, publicSheet.getLastRow() - 1, 5).getValues();
  } catch (e) { 
    Logger.log("getAssignmentData_v18 Error: " + e.message);
    return []; 
  }
}

/**
 * ★★★ 이름 변경 (v18) ★★★
 * 과제별 제출 통계를 '반별'로 계산합니다.
 */
function calculateAssignmentStatsByClass_v18(studentData, studentCountByClass) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const assignmentData = getAssignmentData_v18(); // v18 함수 호출
  const allStudentIds = Object.keys(studentData);
  
  const result = {
    rows: [], totalRate: 0, validCount: 0,
    totalAssignments: 0, totalRowIndices: []
  };

  // 1. 모든 과제 시트의 제출자 명단(A열)을 미리 가져와 맵에 저장
  const sheetNames = [...new Set(assignmentData.map(row => row[1]).filter(Boolean))]; 
  const submittedIdsMap = {};

  if (sheetNames.length > 0) {
    try {
      sheetNames.forEach(sheetName => {
        const targetSheet = ss.getSheetByName(sheetName);
        if (targetSheet && targetSheet.getLastRow() > 1) { 
          const numRows = targetSheet.getLastRow() - 1; // 데이터 행의 수
          submittedIds = targetSheet.getRange(2, 1, numRows, 1).getValues().flat().map(String).filter(Boolean); 
          submittedIdsMap[sheetName] = submittedIds;
        } else {
          submittedIdsMap[sheetName] = []; 
        }
      });
      Logger.log(`[Dashboard v18] Submitted ID Map: ${sheetNames.length}개 시트 조회 완료`);
    } catch (e) {
      Logger.log('[Dashboard v18] Submitted ID Map 오류:', e.message);
      sheetNames.forEach(name => submittedIdsMap[name] = []);
    }
  }

  // 2. '공개' 시트를 기준으로 과제별 통계 생성
  assignmentData.forEach(row => {
    const isPublic = row[0] === true || String(row[0]).toUpperCase() === 'TRUE'; 
    const sheetName = row[1]; 
    const targetClassStr = String(row[2] || '전체'); 

    if (!isPublic || !sheetName) return;

    result.totalAssignments++;

    const submittedIds = submittedIdsMap[sheetName] || []; 

    // v19 다학년 지원: targetClassStr 파싱 ("101, 102", "1학년 전체", "전체")
    const targets = targetClassStr.split(',').map(s => s.trim());
    
    // 타겟이 "전체"인 경우 모든 학생 / "X학년 전체"인 경우 해당 학년 필터링
    let targetStudents = [];
    let isGradeSummary = false;
    let targetGrade = "";

    if (targets.includes('전체')) {
        targetStudents = allStudentIds;
    } else {
        // 개별 타겟 처리
        targets.forEach(t => {
            // v20: "전체1", "전체2", "전체3" 패턴 지원 (또는 "1학년 전체")
            const gradeAllMatch = t.match(/^전체(\d)$/);      // 예: "전체1"
            const gradeAllMatchText = t.match(/^(\d)학년\s*전체$/); // 예: "1학년 전체"

            if (gradeAllMatch || gradeAllMatchText) {
                const grade = gradeAllMatch ? gradeAllMatch[1] : gradeAllMatchText[1];
                if (grade) {
                    targetStudents.push(...allStudentIds.filter(id => studentData[id].grade === grade));
                    isGradeSummary = true;
                    targetGrade = grade;
                }
            } else {
                // "101", "102" 등 특정 반 패턴 (fullClass와 매칭)
                // 또는 기존 "1", "2" 패턴 (class와 매칭) 호환
                targetStudents.push(...allStudentIds.filter(id => {
                  return studentData[id].fullClass === t || studentData[id].class === t;
                }));
            }
        });
    }
    // 중복 제거
    targetStudents = [...new Set(targetStudents)];

    if (targetStudents.length === 0) return; 

    // 3. 반별 그룹화 (fullClass 기준)
    const groupedByClass = {};
    targetStudents.forEach(id => {
        const cls = studentData[id].fullClass; // "101" 등 사용
        if (!groupedByClass[cls]) groupedByClass[cls] = [];
        groupedByClass[cls].push(id);
    });
    
    // 반 이름 정렬
    const classNames = Object.keys(groupedByClass).sort();
    
    let assignmentTotalSubmitted = 0;
    let assignmentTotalStudents = 0;
    let assignmentAllNotSubmittedStudents = [];
    const classRows = []; 

    // 4. 각 반별 통계 계산
    classNames.forEach(className => {
      const classStudentIds = groupedByClass[className];
      const classTotal = classStudentIds.length;
      if (classTotal === 0) return;

      const classSubmittedIds = classStudentIds.filter(id => submittedIds.includes(id));
      const classSubmittedCount = classSubmittedIds.length;
      
      const classNotSubmittedIds = classStudentIds.filter(id => !submittedIds.includes(id));
      const classNotSubmittedCount = classNotSubmittedIds.length;

      assignmentTotalSubmitted += classSubmittedCount;
      assignmentTotalStudents += classTotal;

      const notSubmittedStudents = classNotSubmittedIds.map(id => ({
        id: id,
        name: studentData[id].name,
        class: studentData[id].class,
        fullClass: studentData[id].fullClass,
        number: parseInt(studentData[id].number, 10) || 0
      })).sort((a, b) => a.number - b.number); 

      assignmentAllNotSubmittedStudents.push(...notSubmittedStudents); 

      // 미제출 학생 명단 표시 텍스트
      let displayText, noteText;
      if (classNotSubmittedCount === 0) {
        displayText = "✅ 전원 제출 완료";
        noteText = "";
      } else {
        const fullListString = notSubmittedStudents
          .map(s => `${s.fullClass}-${s.number} ${s.name}`)
          .join("\n");
        
        if (classNotSubmittedCount > 5) { 
          displayText = `${classNotSubmittedCount}명 (명단 확인)`;
          noteText = fullListString;
        } else {
          displayText = notSubmittedStudents.map(s => s.name).join(", ");
          noteText = fullListString;
        }
      }

      const submissionRate = classTotal > 0 ? (classSubmittedCount / classTotal) : 0;
      const targetSheet = ss.getSheetByName(sheetName); 
      const url = targetSheet ? `https://docs.google.com/spreadsheets/d/${ss.getId()}/edit#gid=${targetSheet.getSheetId()}` : "#";

      classRows.push({
          values: [
            `=HYPERLINK("${url}", "${sheetName}${targetSheet ? "" : " (시트없음)"}")`, 
            className, // "101" 등으로 표시
            classSubmittedCount, 
            classTotal, 
            submissionRate, 
            `=SPARKLINE(${classSubmittedCount}, {"charttype","bar";"max",${classTotal};"color1","${THEME.sparkline_bar}"})`,
            `${classSubmittedCount}/${classTotal}`, 
            displayText 
          ],
          notes: ["", "", "", "", "", "", "", noteText] 
      });
    });

    result.rows.push(...classRows);

    // 5. 합계 행 ("전체"이거나 대상 반이 2개 이상일 때)
    if (classRows.length > 1) {
      const totalSubmissionRate = assignmentTotalStudents > 0 ? (assignmentTotalSubmitted / assignmentTotalStudents) : 0;
      
      const sortedAllNotSubmitted = assignmentAllNotSubmittedStudents.sort((a, b) => {
        if (a.fullClass < b.fullClass) return -1;
        if (a.fullClass > b.fullClass) return 1;
        return a.number - b.number;
      });

      let totalDisplayText, totalNoteText;
      if (sortedAllNotSubmitted.length === 0) {
          totalDisplayText = "✅ 전원 제출 완료";
          totalNoteText = "";
      } else {
          const fullListString = sortedAllNotSubmitted
          .map(s => `${s.fullClass}-${s.number} ${s.name}`)
          .join("\n");
          
          if (sortedAllNotSubmitted.length > 5) {
          totalDisplayText = `${sortedAllNotSubmitted.length}명 (명단 확인)`;
          totalNoteText = fullListString;
          } else {
          totalDisplayText = sortedAllNotSubmitted.map(s => s.name).join(", ");
          totalNoteText = fullListString;
          }
      }

      // 합계 라벨 (예: "1학년 합계" 또는 "전체 합계")
      const summaryLabel = (isGradeSummary && targetGrade) ? `${targetGrade}학년 전체` : "합계";

      result.rows.push({
        values: [
          sheetName, 
          summaryLabel, 
          assignmentTotalSubmitted, 
          assignmentTotalStudents, 
          totalSubmissionRate,
          `=SPARKLINE(${assignmentTotalSubmitted}, {"charttype","bar";"max",${assignmentTotalStudents};"color1","${THEME.sparkline_bar}"})`,
          `${assignmentTotalSubmitted}/${assignmentTotalStudents}`,
          totalDisplayText
        ],
        notes: ["", "", "", "", "", "", "", totalNoteText]
      });
      result.totalRowIndices.push(result.rows.length - 1);
    }
    
    // 전체 평균용 누적
    if (assignmentTotalStudents > 0) {
        result.totalRate += (assignmentTotalSubmitted / assignmentTotalStudents);
        result.validCount++;
    }
  }); 

  return result;
}

// createDashboardLayout 함수는 하위 호환성을 위해 유지합니다.
function createDashboardLayout() {
  updateDashboard_v18(); // v18 호출
}
