/**
 * ==============================================
 * ExamMonitor.gs - 시험 감독 시스템
 * ==============================================
 * 온라인 시험 시 학생의 화면 이탈, 전체화면 해제 등을 기록하고 관리합니다.
 */

/**
 * 시험 로그를 기록하는 함수 (웹에서 호출 가능)
 * @param {object} logData - {studentId, assignmentId, eventType, duration, details}
 * @returns {object} 성공 여부
 */
function recordExamLog(logData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('시험로그');
    
    // 시험로그 시트가 없으면 생성
    if (!logSheet) {
      logSheet = ss.insertSheet('시험로그');
      const headers = ['타임스탬프', '학번', '이름', '반', '과제ID', '과제명', '이벤트타입', '지속시간(초)', '상세정보'];
      logSheet.getRange(1, 1, 1, headers.length)
        .setValues([headers])
        .setBackground('#667eea')
        .setFontColor('white')
        .setFontWeight('bold');
    }
    
    // 학생 정보 조회
    const studentSheet = ss.getSheetByName('학생명단_전체');
    if (!studentSheet) {
      throw new Error('학생명단_전체 시트를 찾을 수 없습니다.');
    }
    
    const studentData = studentSheet.getDataRange().getValues();
    const studentHeaders = studentData[0];
    const studentIdColIndex = studentHeaders.indexOf('학번');
    const nameColIndex = studentHeaders.indexOf('이름');
    const classColIndex = studentHeaders.indexOf('반');
    
    const studentRow = studentData.find((row, idx) => idx > 0 && row[studentIdColIndex] === logData.studentId);
    
    if (!studentRow) {
      throw new Error('학생 정보를 찾을 수 없습니다: ' + logData.studentId);
    }
    
    const studentName = studentRow[nameColIndex];
    const studentClass = studentRow[classColIndex];
    
    // 과제명 조회
    const assignmentSheet = ss.getSheetByName('과제설정');
    let assignmentName = logData.assignmentId;
    
    if (assignmentSheet) {
      const assignmentData = assignmentSheet.getDataRange().getValues();
      const assignmentHeaders = assignmentData[0];
      const assignmentIdColIndex = assignmentHeaders.indexOf('과제ID');
      const assignmentNameColIndex = assignmentHeaders.indexOf('과제명');
      
      const assignmentRow = assignmentData.find((row, idx) => idx > 0 && row[assignmentIdColIndex] === logData.assignmentId);
      if (assignmentRow) {
        assignmentName = assignmentRow[assignmentNameColIndex];
      }
    }
    
    // 로그 기록
    const timestamp = new Date().toISOString();
    const newRow = [
      timestamp,
      logData.studentId,
      studentName,
      studentClass,
      logData.assignmentId,
      assignmentName,
      logData.eventType,
      logData.duration || '',
      logData.details || ''
    ];
    
    logSheet.appendRow(newRow);
    
    Logger.log(`시험 로그 기록: ${studentName}(${logData.studentId}) - ${logData.eventType}`);
    
    return { success: true, message: '로그 기록 완료' };
    
  } catch (error) {
    Logger.log('시험 로그 기록 실패: ' + error.message);
    return { success: false, message: error.message };
  }
}

/**
 * 특정 학생의 시험 로그 통계를 조회
 * @param {string} studentId - 학번
 * @param {string} assignmentId - 과제ID
 * @returns {object} 통계 정보
 */
function getExamLogStats(studentId, assignmentId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName('시험로그');
    
    if (!logSheet || logSheet.getLastRow() < 2) {
      return {
        success: true,
        totalViolations: 0,
        violations: []
      };
    }
    
    const data = logSheet.getDataRange().getValues();
    const headers = data[0];
    
    const studentIdIndex = headers.indexOf('학번');
    const assignmentIdIndex = headers.indexOf('과제ID');
    const eventTypeIndex = headers.indexOf('이벤트타입');
    const timestampIndex = headers.indexOf('타임스탬프');
    
    // 해당 학생의 해당 과제 로그만 필터링
    const logs = data.slice(1).filter(row => 
      row[studentIdIndex] === studentId && row[assignmentIdIndex] === assignmentId
    );
    
    const violations = logs.map(row => ({
      eventType: row[eventTypeIndex],
      timestamp: row[timestampIndex],
      duration: row[headers.indexOf('지속시간(초)')]
    }));
    
    return {
      success: true,
      totalViolations: violations.length,
      violations: violations
    };
    
  } catch (error) {
    Logger.log('시험 로그 조회 실패: ' + error.message);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 교사용: 과제별 의심 학생 리스트 조회
 * @param {string} assignmentId - 과제ID
 * @returns {Array} 의심 학생 목록
 */
function getSuspiciousStudents(assignmentId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName('시험로그');
    
    if (!logSheet || logSheet.getLastRow() < 2) {
      return [];
    }
    
    const data = logSheet.getDataRange().getValues();
    const headers = data[0];
    
    const studentIdIndex = headers.indexOf('학번');
    const nameIndex = headers.indexOf('이름');
    const classIndex = headers.indexOf('반');
    const assignmentIdIndex = headers.indexOf('과제ID');
    
    // 학생별 위반 횟수 집계
    const violationCount = {};
    
    data.slice(1).forEach(row => {
      if (row[assignmentIdIndex] === assignmentId) {
        const studentId = row[studentIdIndex];
        const studentName = row[nameIndex];
        const studentClass = row[classIndex];
        
        if (!violationCount[studentId]) {
          violationCount[studentId] = {
            studentId: studentId,
            name: studentName,
            class: studentClass,
            count: 0
          };
        }
        violationCount[studentId].count++;
      }
    });
    
    // 위반 횟수가 많은 순으로 정렬
    const suspiciousList = Object.values(violationCount)
      .filter(student => student.count >= 3) // 3회 이상만
      .sort((a, b) => b.count - a.count);
    
    return suspiciousList;
    
  } catch (error) {
    Logger.log('의심 학생 조회 실패: ' + error.message);
    return [];
  }
}

/**
 * 메뉴: 현재 시트의 시험 로그 요약 보기
 */
function showExamLogSummary() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  
  // 과제설정에서 과제ID 찾기
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const assignmentSheet = ss.getSheetByName('과제설정');
  
  if (!assignmentSheet) {
    ui.alert('오류', '과제설정 시트를 찾을 수 없습니다.', ui.ButtonSet.OK);
    return;
  }
  
  const assignmentData = assignmentSheet.getDataRange().getValues();
  const assignmentHeaders = assignmentData[0];
  const targetSheetIndex = assignmentHeaders.indexOf('대상시트');
  const assignmentIdIndex = assignmentHeaders.indexOf('과제ID');
  
  const assignmentRow = assignmentData.find((row, idx) => 
    idx > 0 && row[targetSheetIndex] === sheetName
  );
  
  if (!assignmentRow) {
    ui.alert('알림', '이 시트는 과제 시트가 아닙니다.', ui.ButtonSet.OK);
    return;
  }
  
  const assignmentId = assignmentRow[assignmentIdIndex];
  const suspiciousStudents = getSuspiciousStudents(assignmentId);
  
  if (suspiciousStudents.length === 0) {
    ui.alert(
      '✅ 시험 로그 요약',
      '의심스러운 행동이 감지된 학생이 없습니다.',
      ui.ButtonSet.OK
    );
  } else {
    let message = '다음 학생들이 3회 이상 화면 이탈/전환을 했습니다:\n\n';
    suspiciousStudents.forEach(student => {
      message += `${student.class} ${student.name} (${student.studentId}): ${student.count}회\n`;
    });
    
    ui.alert('⚠️ 의심 학생 목록', message, ui.ButtonSet.OK);
  }
}

/**
 * 웹 앱에서 호출 가능한 래퍼 함수들
 */
function handleExamLogRequest(requestData) {
  const action = requestData.action;
  
  switch (action) {
    case 'recordLog':
      return recordExamLog(requestData.logData);
      
    case 'getStats':
      return getExamLogStats(requestData.studentId, requestData.assignmentId);
      
    case 'getSuspicious':
      return getSuspiciousStudents(requestData.assignmentId);
      
    default:
      return { success: false, message: '알 수 없는 액션: ' + action };
  }
}
