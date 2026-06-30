/**
 * ==============================================
 * Assignment.gs - 과제 관리 (v4.0 - 템플릿 제거 및 시트 동적 생성)
 * ==============================================
 */

function createAssignmentSheetFromSidebar(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var { name: assignmentName, description, targetClass, questions } = data;
    
    if (questions.length === 0) throw new Error("질문이 1개 이상 필요합니다.");
    var assignmentSettingsSheet = ss.getSheetByName('과제설정');
    if (!assignmentSettingsSheet) throw new Error("'과제설정' 시트를 찾을 수 없습니다.");
    
    var assignmentId = 'TS' + String(assignmentSettingsSheet.getLastRow()).padStart(3, '0');
    var finalSheetName = assignmentName;
    var counter = 1;
    while (ss.getSheetByName(finalSheetName)) {
      finalSheetName = `${assignmentName}_${counter++}`;
    }

    var headers = assignmentSettingsSheet.getRange(1, 1, 1, assignmentSettingsSheet.getLastColumn()).getValues()[0];
    
    var maxHeaderQuestionNum = 0;
    headers.forEach(h => {
      if (typeof h === 'string' && h.startsWith('질문')) {
        var num = parseInt(h.replace('질문', ''));
        if (!isNaN(num) && num > maxHeaderQuestionNum) maxHeaderQuestionNum = num;
      }
    });

    if (questions.length > maxHeaderQuestionNum) {
      var startCol = headers.length + 1;
      var addedCount = 0;
      for (var i = maxHeaderQuestionNum + 1; i <= questions.length; i++) {
        assignmentSettingsSheet.getRange(1, startCol + addedCount).setValue(`질문${i}`);
        headers.push(`질문${i}`);
        addedCount++;
      }
    }

    var newRowObject = {
      '과제ID': assignmentId,
      '과제명': finalSheetName, // 대상시트 삭제됨. 과제명을 시트 이름과 일치시킴
      '설명': description || '',
      '대상반': targetClass || '전체'
    };
    
    questions.forEach((q, i) => { 
      var qVal = q;
      if (typeof q === 'object') {
        qVal = q.text + (q.supplement ? `\n[보조설명:${q.supplement}]` : "");
      }
      newRowObject[`질문${i + 1}`] = qVal; 
    });
    
    var newRow = headers.map(header => newRowObject[header] !== undefined ? newRowObject[header] : '');
    assignmentSettingsSheet.appendRow(newRow);

    Logger.log(`[과제생성] ${finalSheetName}, 질문수: ${questions.length}, 대상반: ${targetClass}`);

    // --- 시트 동적 생성 로직 (템플릿 제거) ---
    var newSheet = ss.insertSheet(finalSheetName);
    
    // 학생 기록 시트 헤더 구성
    var newSheetHeaders = ['학번', '반', '이름'];
    
    questions.forEach((q, i) => {
      if (typeof q === 'object' && q.supplement) {
        newSheetHeaders.push(`질문${i + 1}_교사기록_${q.supplement}`);
      }
      newSheetHeaders.push(`질문${i + 1}`);
    });
    
    newSheetHeaders.push('제출일시');
    
    // 헤더 값 입력
    var headerRange = newSheet.getRange(1, 1, 1, newSheetHeaders.length);
    headerRange.setValues([newSheetHeaders]);
    
    // 헤더 스타일 지정 (예쁘게)
    headerRange.setBackground('#f3f4f6')
               .setFontWeight('bold')
               .setHorizontalAlignment('center')
               .setBorder(true, true, true, true, true, true);
               
    // 열 너비 살짝 조정
    newSheet.setColumnWidth(1, 100); // 학번
    newSheet.setColumnWidth(2, 80);  // 반
    newSheet.setColumnWidth(3, 100); // 이름
    for(var c = 4; c < newSheetHeaders.length; c++) {
      newSheet.setColumnWidth(c, 250); // 질문이나 교사기록
    }
    newSheet.setColumnWidth(newSheetHeaders.length, 150); // 제출일시
    
    // 첫 행 고정
    newSheet.setFrozenRows(1);

    newSheet.activate();
    if(typeof updateDashboard === 'function') {
        updateDashboard();
    }
    
    var successMessage = `'${finalSheetName}' 시트가 생성되었습니다. (질문 ${questions.length}개)`;
    
    return successMessage;
    
  } catch (e) {
    Logger.log('createAssignmentSheetFromSidebar 오류: ' + e.message + '\n' + e.stack);
    throw new Error('시트 생성 실패: ' + e.message);
  }
}

function getQuestionText(sheetName, questionHeader) {
    try {
      var settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('과제설정');
      if (!settingsSheet) return questionHeader;
      var data = settingsSheet.getDataRange().getValues();
      if (data.length < 2) return questionHeader;

      var headers = data[0];
      var assignmentNameColIndex = headers.indexOf('과제명'); // 대상시트 대신 과제명 사용
      var questionColIndex = headers.indexOf(questionHeader);

      if (assignmentNameColIndex === -1 || questionColIndex === -1) return questionHeader;

      var assignmentRow = data.find(row => row[assignmentNameColIndex] === sheetName);
      
      if (assignmentRow && assignmentRow[questionColIndex]) {
        var text = assignmentRow[questionColIndex];
        return text.replace(/\n\[보조설명:.*?\]/g, '').trim();
      }
      return questionHeader;
    } catch(e) {
      Logger.log("getQuestionText 오류: " + e.message);
      return questionHeader;
    }
}
