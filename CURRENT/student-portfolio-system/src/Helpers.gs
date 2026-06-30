/**
 * ==============================================
 * Helpers.gs - 보조 함수 (v2.0 - 마스킹 유틸리티 추가)
 * ==============================================
 * 여러 모듈에서 공통으로 사용되는 데이터 집계 및 가공 함수를 관리합니다.
 */

// ========== 민감정보 마스킹 유틸리티 ==========

/**
 * 학번 마스킹 (로그용)
 * @param {string} studentId - 학번 (5자리)
 * @returns {string} 마스킹된 학번
 * @example maskStudentId('10101') // => '101**'
 */
function maskStudentId(studentId) {
  if (!studentId || String(studentId).length < 3) return '***';
  const idStr = String(studentId);
  return idStr.substring(0, 3) + '**';
}

/**
 * 이름 마스킹 (로그용)
 * @param {string} name - 이름
 * @returns {string} 마스킹된 이름
 * @example maskName('홍길동') // => '홍*동'
 */
function maskName(name) {
  if (!name || String(name).length < 2) return '*';
  const nameStr = String(name);
  if (nameStr.length === 2) return nameStr[0] + '*';
  return nameStr[0] + '*'.repeat(nameStr.length - 2) + nameStr[nameStr.length - 1];
}

/**
 * 안전한 로그 메시지 생성 (민감정보 자동 마스킹)
 * @param {string} message - 로그 메시지
 * @param {object} context - 컨텍스트 정보
 * @returns {string} 마스킹된 로그 메시지
 */
function createSafeLog(message, context) {
  context = context || {};
  let safeMessage = message;

  if (context.studentId) {
    safeMessage += ` [학번: ${maskStudentId(context.studentId)}]`;
  }

  if (context.name) {
    safeMessage += ` [이름: ${maskName(context.name)}]`;
  }

  if (context.assignmentId) {
    safeMessage += ` [과제ID: ${context.assignmentId}]`;
  }

  return safeMessage;
}

// ========== 기존 기능 ==========

/**
 * 시스템의 전반적인 통계 정보를 계산하여 반환합니다.
 * @returns {object} 시스템 통계 객체
 */
function getSystemStats() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var allSheets = ss.getSheets();
    var totalStudents = 0, totalAssignments = 0;
    
    var studentSheet = ss.getSheetByName('학생명단_전체');
    if (studentSheet) totalStudents = Math.max(0, studentSheet.getLastRow() - 1);
    
    var assignmentSettingsSheet = ss.getSheetByName('과제설정');
    if (assignmentSettingsSheet) totalAssignments = Math.max(0, assignmentSettingsSheet.getLastRow() - 1);

    return {
      totalStudents: totalStudents,
      totalAssignments: totalAssignments,
      totalSheets: allSheets.length
    };
  } catch(e) {
    Logger.log('getSystemStats Error: ' + e.message);
    return null;
  }
}

/**
 * ★★★ 통합된 함수: 학생 데이터로부터 반별 인원 계산 ★★★
 * @param {object} studentData - 학생 정보 객체 (getFullStudentList() 반환값)
 * @returns {object} 반 이름을 키로, 학생 수를 값으로 하는 객체
 */
function getStudentCountByClassHelper(studentData) {
    try {
      const counts = {};
      for (const id in studentData) {
        const student = studentData[id];
        if (student.class) {
          counts[student.class] = (counts[student.class] || 0) + 1;
        }
      }
      return counts;
    } catch(e) {
      Logger.log('getStudentCountByClassHelper Error: ' + e.message);
      return {};
    }
}

/**
 * 과제별 제출 현황을 계산합니다.
 * @param {number} totalStudents - 전체 학생 수
 * @returns {Array<object>} 과제별 제출 현황 객체 배열
 */
function getSubmissionStatus(totalStudents) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var assignmentSettingsSheet = ss.getSheetByName('과제설정');
    if (!assignmentSettingsSheet || totalStudents === 0 || assignmentSettingsSheet.getLastRow() < 2) return [];

    var data = assignmentSettingsSheet.getDataRange().getValues();
    var status = [];

    for (var i = 1; i < data.length; i++) {
      var [isPublic, , assignmentName, targetSheetName] = data[i];
      
      if (isPublic && targetSheetName) {
        var targetSheet = ss.getSheetByName(targetSheetName);
        if (targetSheet) {
          var submittedCount = Math.max(0, targetSheet.getLastRow() - 1);
          var rate = submittedCount > 0 ? submittedCount / totalStudents : 0;
          status.push({
            name: assignmentName,
            status: `${submittedCount}/${totalStudents} 명`,
            rate: rate > 0 ? rate : 0.0001 // 스파크라인이 0을 표시하지 못하는 경우를 대비
          });
        }
      }
    }
    return status;
  } catch(e) {
    Logger.log('getSubmissionStatus Error: ' + e.message);
    return [];
  }
}

/**
 * 시트의 종류(카테고리)를 반환합니다.
 * @param {string} sheetName - 분석할 시트의 이름
 * @returns {string} 시트 카테고리 (예: '⭐️ 필수', '📝 과제', '📁 기타')
 */
function getSheetCategory(sheetName) {
  var requiredSheets = ['메뉴', '학생명단_전체', '과제설정', '공개', 'template', '프롬프트'];
  if (requiredSheets.includes(sheetName)) {
    return '⭐️ 필수';
  }

  var assignmentSettingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('과제설정');
  if (assignmentSettingsSheet && assignmentSettingsSheet.getLastRow() > 1) {
    var assignmentSheetNames = assignmentSettingsSheet.getRange('D2:D' + assignmentSettingsSheet.getLastRow())
      .getValues().flat().filter(String);
    if (assignmentSheetNames.includes(sheetName)) {
      return '📝 과제';
    }
  }
  
  return '📁 기타';
}
