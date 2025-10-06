/**
 * ==============================================
 * Dashboard.gs - 대시보드 관리 (v11.0 - 레이아웃 독립성 확보)
 * ==============================================
 * '반별 인원'과 '과제 현황' 섹션을 완벽히 분리하고, 반 목록 길이에 따라
 * 과제 섹션 위치가 동적으로 변경되는 안정적인 수직 레이아웃 버전입니다.
 * @version 11.0
 */

// 테마 색상 정의
const THEME = {
  primary: '#4A80FE', background: '#F8F9FA', header: '#E9ECF1',
  title: '#FFFFFF', text: '#202124', border: '#DADCE0',
  accent_green: '#34A853', accent_red: '#EA4335', sparkline_bar: '#D3E3FD'
};

/**
 * 메뉴의 '대시보드 새로고침'을 클릭했을 때 실행되는 함수입니다.
 */
function refreshDashboard() {
  const ui = SpreadsheetApp.getUi();
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('대시보드를 새로고치고 있습니다...', '🚀 업데이트 중');
    updateDashboard();
    SpreadsheetApp.getActiveSpreadsheet().toast('대시보드가 최신 정보로 업데이트되었습니다.', '✅ 새로고침 완료', 5);
  } catch (e) {
    Logger.log("refreshDashboard Error: " + e.message + "\n" + e.stack);
    ui.alert('❌ 새로고침 실패', '대시보드 업데이트 중 오류가 발생했습니다: ' + e.message, ui.ButtonSet.OK);
  }
}

/**
 * 대시보드의 전체 레이아웃과 디자인을 설정합니다.
 */
function createDashboardLayout() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('메뉴') || ss.insertSheet('메뉴', 0);

  // --- 기본 시트 설정 ---
  sheet.clear();
  sheet.setFrozenRows(2);
  sheet.getRange('A:H').breakApart().clear({ contentsOnly: false, formatOnly: true });
  sheet.setTabColor(THEME.primary);
  sheet.getRange('A:H').setFontFamily('Google Sans').setFontSize(10).setVerticalAlignment('middle').setFontColor(THEME.text);
  sheet.setHiddenGridlines(true);
  sheet.getRange('A1:H' + sheet.getMaxRows()).setBackground(THEME.background);

  // --- 전체 타이틀 & 업데이트 시간 ---
  sheet.getRange('A1:G1').merge().setValue('🎓 학생 포트폴리오 대시보드').setFontSize(20).setFontWeight('bold').setHorizontalAlignment('center').setBackground(THEME.primary).setFontColor(THEME.title);
  sheet.setRowHeight(1, 50);
  sheet.getRange('A2:G2').merge().setHorizontalAlignment('right').setFontSize(9).setFontColor('#777');
  sheet.setRowHeight(2, 20);

  // --- 섹션 1: 시스템 현황 ---
  sheet.getRange('A4:G4').merge().setValue('📊 시스템 현황').setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center').setBackground(THEME.header);
  const kpiHeaders = ['총 학생 수', '총 과제 수', '전체 평균 제출률'];
  kpiHeaders.forEach((header, i) => {
    sheet.getRange(5, 1 + (i * 2)).setValue(header).setFontSize(11).setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange(6, 1 + (i * 2), 1, 2).merge().setHorizontalAlignment('center').setBorder(true, true, true, true, false, false, THEME.border, SpreadsheetApp.BorderStyle.SOLID);
  });
  sheet.setRowHeight(5, 30); sheet.setRowHeight(6, 60);

  // --- 섹션 2: 반별 인원 현황 ---
  sheet.getRange('A9:B9').merge().setValue('🧑‍🎓 반별 인원 현황').setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center').setBackground(THEME.header);
  sheet.getRange('A10:B10').setValues([['반', '인원']]).setFontWeight('bold').setHorizontalAlignment('center').setBackground(THEME.header);

  // --- 섹션 3: 과제 제출 현황 (초기 위치만 설정) ---
  sheet.getRange('A18:G18').merge().setValue('📝 과제 제출 현황').setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center').setBackground(THEME.header);
  sheet.getRange('A19:G19').setValues([['과제', '대상 반', '제출', '대상', '제출률', '진행률 시각화', '진행 현황']]).setFontWeight('bold').setHorizontalAlignment('center').setBackground(THEME.header);

  // --- 컬럼 너비 설정 ---
  sheet.setColumnWidth(1, 220); sheet.setColumnWidth(2, 100); sheet.setColumnWidth(3, 80);
  sheet.setColumnWidth(4, 80);  sheet.setColumnWidth(5, 80);  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 80);

  SpreadsheetApp.flush();
}

/**
 * 대시보드 데이터를 최신 정보로 업데이트합니다.
 */
function updateDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('메뉴');
  if (!sheet) return;

  if (sheet.getRange('A4').getValue() !== '📊 시스템 현황') {
    createDashboardLayout();
  }
  
  sheet.getRange('A2').setValue(`마지막 새로고침: ${Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm:ss')}`);

  // --- 데이터 준비 ---
  const studentCountByClass = getStudentCountByClass();
  const totalAllStudents = Object.values(studentCountByClass).reduce((sum, count) => sum + count, 0);
  const assignmentSheet = ss.getSheetByName('공개');
  const assignmentData = (assignmentSheet && assignmentSheet.getLastRow() > 1) ? assignmentSheet.getRange('B2:C' + assignmentSheet.getLastRow()).getValues() : [];

  // --- 1. 시스템 현황 채우기 ---
  sheet.getRange('B6').setValue(totalAllStudents).setFontSize(24).setFontWeight('bold').setFontColor(THEME.primary);
  sheet.getRange('D6').setValue(assignmentData.filter(r => r[0]).length).setFontSize(24).setFontWeight('bold').setFontColor(THEME.primary);
  
  // --- 2. 반별 인원 현황 채우기 ---
  const classStartRow = 11;
  const classData = Object.keys(studentCountByClass).sort().map(key => [key, studentCountByClass[key]]);
  // 기존 데이터 삭제
  if (sheet.getMaxRows() >= classStartRow) {
      sheet.getRange(classStartRow, 1, sheet.getMaxRows() - classStartRow + 1, 2).clearContent();
  }
  if (classData.length > 0) {
    sheet.getRange(classStartRow, 1, classData.length, 2).setValues(classData).setHorizontalAlignment('center');
  }

  // --- 3. 과제 제출 현황 채우기 ---
  // [핵심 수정] 반별 인원 현황의 길이에 따라 과제 현황 시작 위치를 동적으로 계산
  const lastClassRow = classData.length > 0 ? classStartRow + classData.length - 1 : classStartRow;
  const assignmentTitleRow = lastClassRow + 3; // 제목과 테이블 사이 2줄 공백
  const assignmentStartRow = assignmentTitleRow + 1;

  // 기존 과제 현황 전체 삭제
  if (sheet.getMaxRows() >= assignmentTitleRow) {
      sheet.getRange(assignmentTitleRow, 1, sheet.getMaxRows() - assignmentTitleRow + 1, 7).clearContent().clearFormat();
  }
  sheet.setConditionalFormatRules([]);

  // 제목 및 헤더 동적 배치
  sheet.getRange(assignmentTitleRow, 1, 1, 7).merge().setValue('📝 과제 제출 현황').setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center').setBackground(THEME.header);
  sheet.getRange(assignmentStartRow, 1, 1, 7).setValues([['과제', '대상 반', '제출', '대상', '제출률', '진행률 시각화', '진행 현황']]).setFontWeight('bold').setHorizontalAlignment('center').setBackground(THEME.header);
  
  let totalSubmissionRate = 0, validAssignmentCount = 0;

  if (assignmentData.length > 0) {
    const submissionData = assignmentData.map(row => {
      // (이하 과제 데이터 처리 로직은 이전과 동일하여 생략)
      const sheetName = row[0], targetClassesStr = row[1] ? String(row[1]).trim() : '';
      if (!sheetName) return null;

      let targetStudentCount = 0;
      if (targetClassesStr === '전체' || !targetClassesStr) {
        targetStudentCount = totalAllStudents;
      } else {
        targetClassesStr.split(',').map(c => c.trim()).forEach(code => {
          let className = /^\d{3}$/.test(code) ? `${code.charAt(0)}학년 ${parseInt(code.substring(1), 10)}반` : code;
          targetStudentCount += studentCountByClass[className] || 0;
        });
      }

      const targetSheet = ss.getSheetByName(sheetName);
      const submittedCount = targetSheet ? Math.max(0, targetSheet.getLastRow() - 1) : 0;
      const url = targetSheet ? `https://docs.google.com/spreadsheets/d/${ss.getId()}/edit#gid=${targetSheet.getSheetId()}` : "http://";
      const submissionRate = targetStudentCount > 0 ? submittedCount / targetStudentCount : 0;

      if (targetStudentCount > 0) {
        totalSubmissionRate += submissionRate;
        validAssignmentCount++;
      }
      return [`=HYPERLINK("${url}", "${sheetName}${targetSheet ? '' : ' (시트없음)'}")`, targetClassesStr, submittedCount, targetStudentCount, submissionRate, `=SPARKLINE(${submittedCount}, {"charttype","bar";"max",${targetStudentCount};"color1","${THEME.sparkline_bar}"})`, `${submittedCount}/${targetStudentCount}`];
    }).filter(row => row);

    if (submissionData.length > 0) {
      const dataRange = sheet.getRange(assignmentStartRow + 1, 1, submissionData.length, 7);
      dataRange.setValues(submissionData).setVerticalAlignment('middle');
      sheet.setRowHeights(assignmentStartRow + 1, submissionData.length, 30);
      sheet.getRange(assignmentStartRow + 1, 1, submissionData.length, 1).setHorizontalAlignment('left');
      sheet.getRange(assignmentStartRow + 1, 2, submissionData.length, 6).setHorizontalAlignment('center');
      sheet.getRange(assignmentStartRow + 1, 3, submissionData.length, 2).setNumberFormat('0"명"');
      sheet.getRange(assignmentStartRow + 1, 5, submissionData.length, 1).setNumberFormat('0.0%');
      const rules = [SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0.8).setFontColor(THEME.accent_green).setRanges([sheet.getRange(assignmentStartRow + 1, 5, submissionData.length, 1)]).build(), SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0.5).setFontColor(THEME.accent_red).setBold(true).setRanges([sheet.getRange(assignmentStartRow + 1, 5, submissionData.length, 1)]).build()];
      sheet.setConditionalFormatRules(rules);
    }
  }

  const avgSubmissionRate = validAssignmentCount > 0 ? totalSubmissionRate / validAssignmentCount : 0;
  sheet.getRange('F6').setValue(avgSubmissionRate).setNumberFormat('0.0%').setFontSize(24).setFontWeight('bold').setFontColor(THEME.primary);

  SpreadsheetApp.flush();
}

/**
 * '학생명단_전체' 시트에서 학번 기준으로 반별 인원을 자동 계산합니다.
 */
function getStudentCountByClass() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const studentSheet = ss.getSheetByName('학생명단_전체');
    if (!studentSheet) return {};
    const lastRow = studentSheet.getLastRow();
    if (lastRow < 2) return {};
    
    const studentIds = studentSheet.getRange('A2:A' + lastRow).getValues();
    const counts = {};

    studentIds.forEach(row => {
      const id = String(row[0]).trim();
      if (/^\d{3,}/.test(id)) { // 학번이 최소 3자리 숫자로 시작하는지 확인
        const classCode = id.substring(0, 3);
        const grade = classCode.charAt(0);
        const classNum = parseInt(classCode.substring(1), 10);
        const className = `${grade}학년 ${classNum}반`;
        counts[className] = (counts[className] || 0) + 1;
      }
    });
    return counts;
  } catch (e) {
    Logger.log("getStudentCountByClass 오류: " + e.message);
    return {};
  }
}
