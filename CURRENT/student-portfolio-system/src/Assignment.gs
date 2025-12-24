/**
 * ==============================================
 * Assignment.gs - 과제 관리 (v2.1 - 질문 20개 확장)
 * ==============================================
 * 새 과제 시트를 생성하고 관련 정보를 '과제설정', '공개' 시트에 기록합니다.
 * 시험모드 관련 설정도 함께 저장합니다.
 */

/**
 * 사이드바에서 전달받은 데이터로 새 과제 시트를 생성합니다.
 * @param {object} data - {name, startDate, endDate, questions, examMode, maxViolations, forceFullscreen}
 * @returns {string} 성공 메시지
 */
function createAssignmentSheetFromSidebar(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var { name: assignmentName, startDate, endDate, questions, separateSolution, allowModification, examMode, maxViolations, forceFullscreen } = data;
    
    // 유효성 검사
    var templateSheet = ss.getSheetByName('template');
    if (!templateSheet) throw new Error("'template' 시트를 찾을 수 없습니다.");
    if (questions.length === 0) throw new Error("질문이 1개 이상 필요합니다.");
    var assignmentSettingsSheet = ss.getSheetByName('과제설정');
    if (!assignmentSettingsSheet) throw new Error("'과제설정' 시트를 찾을 수 없습니다.");
    
    // 과제 ID 및 시트 이름 생성 (중복 방지)
    var assignmentId = 'TS' + String(assignmentSettingsSheet.getLastRow()).padStart(3, '0');
    var finalSheetName = assignmentName;
    var counter = 1;
    while (ss.getSheetByName(finalSheetName)) {
      finalSheetName = `${assignmentName}_${counter++}`;
    }

    // '과제설정' 시트 헤더 확인 및 확장
    var headers = assignmentSettingsSheet.getRange(1, 1, 1, assignmentSettingsSheet.getLastColumn()).getValues()[0];
    
    // ★★★ '풀이분리' 헤더가 없으면 추가 ★★★
    if (headers.indexOf('풀이분리') === -1) {
      assignmentSettingsSheet.getRange(1, headers.length + 1).setValue('풀이분리');
      headers.push('풀이분리'); 
    }
    
    // ★★★ '재제출허용' 헤더가 없으면 추가 ★★★ 
    if (headers.indexOf('재제출허용') === -1) {
      assignmentSettingsSheet.getRange(1, headers.length + 1).setValue('재제출허용');
      headers.push('재제출허용'); 
    }

    // ★★★ 질문 헤더 확장 (v2.1: 질문 개수에 맞춰 헤더 늘림) ★★★
    // 현재 헤더에 있는 최대 질문 번호 찾기
    var maxHeaderQuestionNum = 0;
    headers.forEach(h => {
      if (h.startsWith('질문')) {
        var num = parseInt(h.replace('질문', ''));
        if (!isNaN(num) && num > maxHeaderQuestionNum) maxHeaderQuestionNum = num;
      }
    });

    // 부족한 질문 헤더 추가 (예: 질문6, 질문7 ...)
    if (questions.length > maxHeaderQuestionNum) {
      var startCol = headers.length + 1;
      var addedCount = 0;
      for (var i = maxHeaderQuestionNum + 1; i <= questions.length; i++) {
        assignmentSettingsSheet.getRange(1, startCol + addedCount).setValue(`질문${i}`);
        headers.push(`질문${i}`);
        addedCount++;
      }
    }

    // ★★★ 시험모드 정보를 포함한 행 데이터 생성 ★★★
    var newRowObject = {
      '재제출허용': allowModification || false,
      '과제ID': assignmentId,
      '과제명': assignmentName,
      '대상시트': finalSheetName,
      '시작일': startDate,
      '마감일': endDate,
      '풀이분리': separateSolution || false,
      '시험모드': examMode || false,
      '이탈허용횟수': maxViolations || 3,
      '강제전체화면': forceFullscreen || false
    };
    
    // 질문 추가
    questions.forEach((q, i) => { 
      newRowObject[`질문${i + 1}`] = q; 
    });
    
    // 헤더 순서에 맞춰 행 데이터 생성
    var newRow = headers.map(header => newRowObject[header] || '');
    assignmentSettingsSheet.appendRow(newRow);

    // ★★★ 체크박스 추가 로직 ★★★
    var lastRow = assignmentSettingsSheet.getLastRow();
    var checkboxColumns = ['풀이분리', '시험모드', '강제전체화면', '재제출허용'];
    
    checkboxColumns.forEach(colName => {
      var colIndex = headers.indexOf(colName);
      if (colIndex !== -1) {
        assignmentSettingsSheet.getRange(lastRow, colIndex + 1).insertCheckboxes();
      }
    });
    
    Logger.log(`[과제생성] ${assignmentName}, 질문수: ${questions.length}, 풀이분리: ${separateSolution}, 재제출허용: ${allowModification}, 시험모드: ${examMode}, 이탈허용: ${maxViolations}회`);

    // '공개' 시트에 행 추가
    var publicSheet = ss.getSheetByName('공개');
    publicSheet.appendRow([false, finalSheetName, '전체', false, '']);
    
    // 체크박스 삽입 (A열: 공개여부, D열: 재제출허용)
    var pubLastRow = publicSheet.getLastRow();
    publicSheet.getRange(pubLastRow, 1).insertCheckboxes();
    publicSheet.getRange(pubLastRow, 4).insertCheckboxes();

    // 'template'을 복사하여 새 과제 시트 생성
    var newSheet = templateSheet.copyTo(ss).setName(finalSheetName);
    var newSheetHeaders = newSheet.getRange(1, 1, 1, newSheet.getLastColumn()).getValues()[0];
    
    // 템플릿의 '질문' 컬럼 수 확인
    var templateQuestionCols = newSheetHeaders.filter(h => h.startsWith('질문')).length;
    
    // ★★★ v2.1: 질문 컬럼 동적 처리 (축소 및 확장) ★★★
    if (questions.length < templateQuestionCols) {
      // 1. 질문이 템플릿보다 적으면: 불필요한 뒷부분 컬럼 삭제
      var startDeleteColName = `질문${questions.length + 1}`;
      var startDeleteColIndex = newSheetHeaders.indexOf(startDeleteColName) + 1;
      if (startDeleteColIndex > 0) {
        newSheet.deleteColumns(startDeleteColIndex, templateQuestionCols - questions.length);
      }
    } else if (questions.length > templateQuestionCols) {
      // 2. 질문이 템플릿보다 많으면: 부족한 컬럼 추가
      // '질문{templateQuestionCols}' 컬럼(마지막 질문 컬럼)을 찾아서 그 뒤에 추가
      var lastQColName = `질문${templateQuestionCols}`;
      var lastQColIndex = newSheetHeaders.indexOf(lastQColName) + 1;
      
      // 만약 템플릿에 질문 컬럼이 하나도 없으면? (예외처리: 맨 뒤에 추가하거나 등등.. 일단 있다고 가정)
      if (lastQColIndex > 0) {
        var columnsToAdd = questions.length - templateQuestionCols;
        newSheet.insertColumnsAfter(lastQColIndex, columnsToAdd);
        
        // 추가된 컬럼 헤더 설정
        for (var i = 1; i <= columnsToAdd; i++) {
          newSheet.getRange(1, lastQColIndex + i).setValue(`질문${templateQuestionCols + i}`);
        }
      }
    }

    // 갱신된 헤더 다시 읽기 (분리 작업 위해)
    newSheetHeaders = newSheet.getRange(1, 1, 1, newSheet.getLastColumn()).getValues()[0];

    // ★★★ 시험모드 또는 풀이분리일 경우: 질문 컬럼을 '풀이'와 '답'으로 분리 ★★★
    if (separateSolution) {
      // 뒤에서부터 처리해야 인덱스가 밀리지 않음
      for (var i = questions.length; i >= 1; i--) {
        var questionColName = `질문${i}`;
        var questionColIndex = newSheetHeaders.indexOf(questionColName) + 1; // 1-based index
        
        if (questionColIndex > 0) {
          // 1. 현재 컬럼(질문i)을 '질문i_풀이'로 변경
          newSheet.getRange(1, questionColIndex).setValue(`${questionColName}_풀이`);
          
          // 2. 그 뒤에 새 컬럼 삽입
          newSheet.insertColumnAfter(questionColIndex);
          
          // 3. 새 컬럼 헤더를 '질문i_답'으로 설정
          newSheet.getRange(1, questionColIndex + 1).setValue(`${questionColName}_답`);
        }
      }
      Logger.log(`[설정적용] ${questions.length}개 질문에 대해 풀이/답 컬럼 분리 완료`);
    }

    newSheet.activate();
    updateDashboard(); // Dashboard.gs
    
    var successMessage = `'${finalSheetName}' 시트가 생성되었습니다. (질문 ${questions.length}개)`;
    if (separateSolution) {
        successMessage += `\n\n📝 서술형(풀이/답 분리) 적용됨`;
    }
    if (allowModification) {
        successMessage += `\n\n🔄 제출 후 수정 허용`;
    }
    if (examMode) {
      successMessage += `\n\n🎯 시험 모드 활성화됨:\n- 이탈 허용: ${maxViolations}회\n- 전체화면: ${forceFullscreen ? 'ON' : 'OFF'}`;
    }
    
    return successMessage;
    
  } catch (e) {
    Logger.log('createAssignmentSheetFromSidebar 오류: ' + e.message + '\n' + e.stack);
    throw new Error('시트 생성 실패: ' + e.message);
  }
}

/**
 * '과제설정' 시트에서 과제에 해당하는 실제 질문 텍스트를 찾아 반환합니다.
 * @param {string} sheetName - 과제 시트 이름
 * @param {string} questionHeader - 질문 헤더 (예: '질문1')
 * @returns {string} 실제 질문 내용
 */
function getQuestionText(sheetName, questionHeader) {
    try {
      var settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('과제설정');
      if (!settingsSheet) return questionHeader;
      var data = settingsSheet.getDataRange().getValues();
      if (data.length < 2) return questionHeader;

      var headers = data[0];
      var targetSheetColIndex = headers.indexOf('대상시트');
      var questionColIndex = headers.indexOf(questionHeader);

      if (targetSheetColIndex === -1 || questionColIndex === -1) return questionHeader;

      var assignmentRow = data.find(row => row[targetSheetColIndex] === sheetName);
      
      return assignmentRow && assignmentRow[questionColIndex] ? assignmentRow[questionColIndex] : questionHeader;
    } catch (e) {
      Logger.log("getQuestionText 오류: " + e.message);
      return questionHeader; // 오류 발생 시 기본 헤더 반환
    }
}
