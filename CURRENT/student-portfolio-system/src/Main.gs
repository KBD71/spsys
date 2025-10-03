/**
 * 학생 포트폴리오 시스템 - Main.gs
 * Google Sheets 기반 과제 관리 시스템
 */

// ==================== 과제 시트 생성 ====================

/**
 * 새 과제 시트 생성
 */
function createAssignmentSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();

    // 1. 과제 정보 입력받기
    const nameResponse = ui.prompt(
      '새 과제 시트 생성',
      '과제명을 입력하세요:',
      ui.ButtonSet.OK_CANCEL
    );
    if (nameResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: '취소되었습니다.' };
    }
    const assignmentName = nameResponse.getResponseText().trim();
    if (!assignmentName) {
      return { success: false, message: '과제명을 입력하지 않았습니다.' };
    }

    const startDateResponse = ui.prompt(
      '시작일 입력',
      '시작일을 입력하세요 (예: 2025-01-01):',
      ui.ButtonSet.OK_CANCEL
    );
    if (startDateResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: '취소되었습니다.' };
    }
    const startDate = startDateResponse.getResponseText().trim();

    const endDateResponse = ui.prompt(
      '마감일 입력',
      '마감일을 입력하세요 (예: 2025-01-31):',
      ui.ButtonSet.OK_CANCEL
    );
    if (endDateResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: '취소되었습니다.' };
    }
    const endDate = endDateResponse.getResponseText().trim();

    const questionCountResponse = ui.prompt(
      '질문 개수 입력',
      '질문 개수를 입력하세요 (숫자):',
      ui.ButtonSet.OK_CANCEL
    );
    if (questionCountResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: '취소되었습니다.' };
    }
    const questionCount = parseInt(questionCountResponse.getResponseText().trim());
    if (isNaN(questionCount) || questionCount < 0 || questionCount > 20) {
      return { success: false, message: '질문 개수는 0~20 사이의 숫자여야 합니다.' };
    }

    // 2. 과제설정 시트에 데이터 추가
    let assignmentSettingsSheet = ss.getSheetByName('과제설정');
    if (!assignmentSettingsSheet) {
      assignmentSettingsSheet = ss.insertSheet('과제설정');
      const headers = [['공개', '과제ID', '과제명', '대상시트', '시작일', '마감일', '질문1', '질문2', '질문3', '질문4', '질문5']];
      assignmentSettingsSheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
      assignmentSettingsSheet.getRange(1, 1, 1, headers[0].length)
        .setBackground('#4285F4')
        .setFontColor('white')
        .setFontWeight('bold');
    }

    // 마지막 데이터 행 찾기 및 과제ID 생성 (중복 방지)
    const lastRow = assignmentSettingsSheet.getLastRow();
    let maxId = 0;

    if (lastRow > 1) {
      // 기존 과제ID에서 최대값 찾기
      const assignmentData = assignmentSettingsSheet.getRange(2, 2, lastRow - 1, 1).getValues();
      assignmentData.forEach(row => {
        const id = row[0];
        if (id && id.toString().startsWith('TS')) {
          const num = parseInt(id.toString().substring(2));
          if (!isNaN(num) && num > maxId) {
            maxId = num;
          }
        }
      });
    }

    const assignmentId = `TS${String(maxId + 1).padStart(3, '0')}`;

    // 시트명 중복 확인
    let finalSheetName = assignmentName;
    let counter = 1;
    while (ss.getSheetByName(finalSheetName)) {
      finalSheetName = `${assignmentName}_${counter}`;
      counter++;
    }

    // 질문 입력받기
    const questions = [];
    for (let i = 1; i <= questionCount; i++) {
      const questionResponse = ui.prompt(
        `질문 ${i} 입력`,
        `질문 ${i}을 입력하세요:`,
        ui.ButtonSet.OK_CANCEL
      );
      if (questionResponse.getSelectedButton() === ui.Button.OK) {
        const questionText = questionResponse.getResponseText().trim();
        if (questionText) {
          questions.push(questionText);
        }
      }
    }

    // 과제설정 시트의 현재 헤더 확인 및 확장
    const currentHeaders = assignmentSettingsSheet.getRange(1, 1, 1, assignmentSettingsSheet.getLastColumn()).getValues()[0];
    let currentQuestionCount = 0;

    // 현재 질문 컬럼 개수 세기
    for (let i = 6; i < currentHeaders.length; i++) {
      if (currentHeaders[i] && currentHeaders[i].toString().includes('질문')) {
        currentQuestionCount++;
      }
    }

    // 필요한 질문 컬럼보다 부족하면 헤더 추가
    if (questions.length > currentQuestionCount) {
      const additionalQuestions = questions.length - currentQuestionCount;
      for (let i = 0; i < additionalQuestions; i++) {
        const newQuestionNum = currentQuestionCount + i + 1;
        const headerCell = assignmentSettingsSheet.getRange(1, 6 + newQuestionNum);
        headerCell.setValue(`질문${newQuestionNum}`);
        headerCell.setBackground('#4285F4').setFontColor('white').setFontWeight('bold');
      }
    }

    // 데이터 행 생성
    const newRow = [
      false,  // 공개 (기본 false)
      assignmentId,
      assignmentName,
      finalSheetName,  // 대상시트
      startDate,
      endDate,
      ...questions  // 질문들 추가
    ];

    assignmentSettingsSheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);

    // 공개 체크박스 설정
    const publicCell = assignmentSettingsSheet.getRange(lastRow + 1, 1);
    publicCell.insertCheckboxes();

    // 3. 새 과제 시트 생성
    let templateSheet = ss.getSheetByName('수행평가1_에세이');
    let baseHeaders = [];

    if (templateSheet) {
      const templateHeaders = templateSheet.getRange(1, 1, 1, templateSheet.getLastColumn()).getValues()[0];
      const questionStartIndex = templateHeaders.findIndex(h => h.toString().includes('질문1'));
      if (questionStartIndex > 0) {
        baseHeaders = templateHeaders.slice(0, questionStartIndex);
      } else {
        baseHeaders = ['학번', '반', '이름'];
      }
    } else {
      baseHeaders = ['학번', '반', '이름'];
    }

    const questionHeaders = [];
    for (let i = 1; i <= questions.length; i++) {
      questionHeaders.push(`질문${i}`);
    }

    const additionalHeaders = ['제출일시', '피드백', '건의사항'];
    const fullHeaders = [...baseHeaders, ...questionHeaders, ...additionalHeaders];

    const newSheet = ss.insertSheet(finalSheetName);
    const headerRange = newSheet.getRange(1, 1, 1, fullHeaders.length);
    headerRange.setValues([fullHeaders]);
    headerRange.setBackground('#4285F4').setFontColor('white').setFontWeight('bold');

    for (let i = 1; i <= fullHeaders.length; i++) {
      newSheet.autoResizeColumn(i);
    }

    // 4. 메뉴 업데이트
    updateSheetList();

    ui.alert(
      '과제 시트 생성 완료',
      `"${finalSheetName}" 시트가 생성되었습니다.\n\n` +
      `과제ID: ${assignmentId}\n` +
      `시작일: ${startDate}\n` +
      `마감일: ${endDate}\n` +
      `질문 개수: ${questions.length}개`,
      ui.ButtonSet.OK
    );

    return {
      success: true,
      message: `${finalSheetName} 시트가 생성되었습니다.`,
      sheetName: finalSheetName,
      assignmentId: assignmentId
    };

  } catch (error) {
    Logger.log(`과제 시트 생성 오류: ${error.message}`);
    SpreadsheetApp.getUi().alert('오류', `과제 시트 생성 실패: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    return {
      success: false,
      message: '과제 시트 생성 실패: ' + error.message
    };
  }
}

// ==================== 메뉴 시스템 ====================

/**
 * 동적 하이퍼링크 메뉴 생성
 */
function createDynamicHyperlinkMenu() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let menuSheet = ss.getSheetByName('메뉴');

    if (!menuSheet) {
      menuSheet = ss.insertSheet('메뉴', 0);
    }

    menuSheet.clear();

    const headerData = [
      ['📋 학생 포트폴리오 시스템 관리 메뉴', '', '', '', '', '', '🔧 주요 함수 목록'],
      ['시트 관리: 상단 메뉴 > 포트폴리오 > 시트 정렬 또는 새 과제 시트', '', '', '', '', '', ''],
      ['📊 시트 관리 및 바로가기', '', '', '', '', '', '함수명'],
      ['카테고리', '시트명', '상태', '설명', '삭제', '', '기능']
    ];

    headerData.forEach((row, index) => {
      row.forEach((cell, colIndex) => {
        menuSheet.getRange(index + 1, colIndex + 1).setValue(cell);
      });
    });

    menuSheet.getRange(1, 1, 1, 6).merge().setBackground('#4285F4').setFontColor('white').setFontWeight('bold').setFontSize(16).setHorizontalAlignment('center');
    menuSheet.getRange(1, 7, 1, 2).merge().setBackground('#4285F4').setFontColor('white').setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');

    menuSheet.getRange(2, 1, 1, 6).merge().setBackground('#E3F2FD').setFontColor('#1976D2').setFontWeight('bold').setHorizontalAlignment('center').setFontSize(10);

    menuSheet.getRange(3, 1, 1, 6).merge().setBackground('#EA4335').setFontColor('white').setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');
    menuSheet.getRange(3, 7, 1, 2).setBackground('#EA4335').setFontColor('white').setFontWeight('bold').setHorizontalAlignment('center');
    menuSheet.getRange(4, 1, 1, 5).setBackground('#F0F0F0').setFontWeight('bold');
    menuSheet.getRange(4, 7, 1, 2).setBackground('#F0F0F0').setFontWeight('bold');

    updateSheetList();

    const functions = [
      ['goToMenu()', '메뉴 시트로 이동'],
      ['setupCompleteInteractiveMenu()', '메뉴 시스템 초기화'],
      ['updateSheetList()', '시트 목록 새로고침'],
      ['createAssignmentSheet()', '새 과제 시트 생성'],
      ['deleteSheetByName(name)', '시트 삭제']
    ];

    functions.forEach((func, index) => {
      const row = 5 + index;
      menuSheet.getRange(row, 7).setValue(func[0]);
      menuSheet.getRange(row, 8).setValue(func[1]);
      menuSheet.getRange(row, 7).setFontFamily('Courier New').setFontSize(9);
      menuSheet.getRange(row, 8).setFontSize(9);
    });

    menuSheet.setColumnWidth(1, 120);
    menuSheet.setColumnWidth(2, 200);
    menuSheet.setColumnWidth(3, 80);
    menuSheet.setColumnWidth(4, 300);
    menuSheet.setColumnWidth(5, 50);
    menuSheet.setColumnWidth(6, 1);
    menuSheet.setColumnWidth(7, 250);
    menuSheet.setColumnWidth(8, 200);
    menuSheet.hideColumns(6, 1);

    return {
      success: true,
      message: '동적 하이퍼링크 메뉴가 생성되었습니다.'
    };

  } catch (error) {
    Logger.log(`동적 메뉴 생성 오류: ${error.message}`);
    return { success: false, message: '동적 메뉴 생성 실패: ' + error.message };
  }
}

/**
 * 시트 목록 업데이트
 */
function updateSheetList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const menuSheet = ss.getSheetByName('메뉴');

    if (!menuSheet) {
      throw new Error('메뉴 시트를 찾을 수 없습니다.');
    }

    const sheets = ss.getSheets();
    const startRow = 5;
    const maxRow = Math.max(menuSheet.getLastRow(), 100); // 최소 100행까지 클리어

    if (maxRow >= startRow) {
      const clearRange = menuSheet.getRange(startRow, 1, maxRow - startRow + 1, 8);
      clearRange.clear();
      clearRange.clearDataValidations(); // 체크박스 제거
    }

    const requiredSheets = ['학생명단_전체', '과제설정', '공개', 'template'];
    const sheetInfoList = [];

    sheets.forEach((sheet) => {
      if (sheet.getName() === '메뉴') return;

      const sheetName = sheet.getName();
      const rowCount = sheet.getLastRow();
      const gid = sheet.getSheetId();
      const spreadsheetId = ss.getId();
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}`;

      let category = '📁 선택';
      let categoryColor = '#E8F5E8';
      let isDeletable = true;
      let sortPriority = 2;

      if (requiredSheets.includes(sheetName)) {
        category = '⭐ 필수';
        categoryColor = '#FFE8E8';
        isDeletable = false;
        sortPriority = 1;
      } else if (sheetName.includes('학생명단_')) {
        category = '👥 학급';
        categoryColor = '#E8F0FF';
      } else if (sheetName.includes('과제_')) {
        category = '📝 과제';
        categoryColor = '#FFF0E8';
      } else if (sheetName.includes('평가_')) {
        category = '📊 평가';
        categoryColor = '#F0E8FF';
      }

      let status = '✅ 정상';
      if (rowCount <= 1) status = '⚠️ 비어있음';

      let description = getSheetDescription(sheetName, rowCount);

      sheetInfoList.push({
        sheetName: sheetName,
        category: category,
        categoryColor: categoryColor,
        status: status,
        description: description,
        isDeletable: isDeletable,
        sheetUrl: sheetUrl,
        sortPriority: sortPriority
      });
    });

    sheetInfoList.sort((a, b) => {
      if (a.sortPriority !== b.sortPriority) {
        return a.sortPriority - b.sortPriority;
      }
      return a.sheetName.localeCompare(b.sheetName, 'ko-KR');
    });

    let currentRow = startRow;
    sheetInfoList.forEach((sheetInfo) => {
      menuSheet.getRange(currentRow, 1).setValue(sheetInfo.category);
      menuSheet.getRange(currentRow, 1).setBackground(sheetInfo.categoryColor).setHorizontalAlignment('center').setFontWeight('bold');

      menuSheet.getRange(currentRow, 2).setFormula(`=HYPERLINK("${sheetInfo.sheetUrl}", "${sheetInfo.sheetName}")`);
      menuSheet.getRange(currentRow, 2).setFontColor('#1155CC').setFontWeight('bold');

      menuSheet.getRange(currentRow, 3).setValue(sheetInfo.status);
      menuSheet.getRange(currentRow, 3).setHorizontalAlignment('center');

      menuSheet.getRange(currentRow, 4).setValue(sheetInfo.description);

      const deleteCell = menuSheet.getRange(currentRow, 5);
      if (sheetInfo.isDeletable) {
        deleteCell.insertCheckboxes();
        deleteCell.setValue(false);
        deleteCell.setBackground('#FFEBEE');
        deleteCell.setNote(`체크하면 ${sheetInfo.sheetName} 시트 삭제`);
      } else {
        deleteCell.setValue('🔒');
        deleteCell.setBackground('#F5F5F5').setFontColor('#757575').setHorizontalAlignment('center');
        deleteCell.setNote('필수 시트는 삭제할 수 없습니다');
      }

      const hiddenCell = menuSheet.getRange(currentRow, 6);
      hiddenCell.setValue(sheetInfo.sheetName);
      hiddenCell.setBackground('#FFFFFF');
      hiddenCell.setFontColor('#FFFFFF');

      currentRow++;
    });

    return {
      success: true,
      message: '시트 목록이 업데이트되었습니다.'
    };

  } catch (error) {
    Logger.log(`시트 목록 업데이트 오류: ${error.message}`);
    return { success: false, message: '시트 목록 업데이트 실패: ' + error.message };
  }
}

/**
 * 시트 설명 생성
 */
function getSheetDescription(sheetName, rowCount) {
  const name = sheetName.toLowerCase();

  if (name.includes('학생') || name.includes('명단')) {
    return `학생 ${Math.max(0, rowCount - 1)}명 등록`;
  } else if (name.includes('과제')) {
    return `데이터 ${Math.max(0, rowCount - 1)}행`;
  } else if (name.includes('공개')) {
    return `공개항목 ${Math.max(0, rowCount - 1)}개`;
  } else {
    return `데이터 ${Math.max(0, rowCount - 1)}행`;
  }
}

/**
 * 시트 삭제
 */
function deleteSheetByName(sheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error(`"${sheetName}" 시트를 찾을 수 없습니다.`);
    }

    if (sheetName === '메뉴') {
      throw new Error('메뉴 시트는 삭제할 수 없습니다.');
    }

    const requiredSheets = ['학생명단_전체', '과제설정', '공개', 'template'];
    if (requiredSheets.includes(sheetName)) {
      throw new Error('필수 시트는 삭제할 수 없습니다.');
    }

    const ui = SpreadsheetApp.getUi();
    const response = ui.alert('시트 삭제', `"${sheetName}" 시트를 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`, ui.ButtonSet.YES_NO);

    if (response === ui.Button.YES) {
      // 시트 삭제
      ss.deleteSheet(sheet);

      // 공개 시트에서 해당 행 삭제
      const publicSheet = ss.getSheetByName('공개');
      if (publicSheet) {
        const publicData = publicSheet.getDataRange().getValues();
        for (let i = publicData.length - 1; i >= 1; i--) {
          if (publicData[i][1] === sheetName) {  // 시트명 컬럼이 2번째
            publicSheet.deleteRow(i + 1);
          }
        }
      }

      // 과제설정 시트에서 해당 행 삭제
      const assignmentSettingsSheet = ss.getSheetByName('과제설정');
      if (assignmentSettingsSheet) {
        const assignmentData = assignmentSettingsSheet.getDataRange().getValues();
        for (let i = assignmentData.length - 1; i >= 1; i--) {
          if (assignmentData[i][3] === sheetName) {  // 대상시트 컬럼이 4번째
            assignmentSettingsSheet.deleteRow(i + 1);
          }
        }
      }

      updateSheetList();

      ui.alert('삭제 완료', `"${sheetName}" 시트가 삭제되었습니다.`, ui.ButtonSet.OK);
      return { success: true, message: `${sheetName} 시트가 삭제되었습니다.` };
    } else {
      return { success: false, message: '삭제가 취소되었습니다.' };
    }

  } catch (error) {
    Logger.log(`시트 삭제 오류: ${error.message}`);
    SpreadsheetApp.getUi().alert('삭제 실패', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    return { success: false, message: '시트 삭제 실패: ' + error.message };
  }
}

/**
 * 메뉴 클릭 이벤트 처리 (삭제 체크박스만)
 */
function onEditMenuClick(e) {
  if (!e || !e.range) return;

  const range = e.range;
  const sheet = range.getSheet();

  if (sheet.getName() !== '메뉴') return;

  const row = range.getRow();
  const col = range.getColumn();
  const value = range.getValue();

  try {
    // 삭제 체크박스만 처리 (5열)
    if (col === 5 && value === true && row >= 5) {
      range.setValue(false);
      const sheetName = sheet.getRange(row, 6).getValue();

      Logger.log(`삭제 요청: ${sheetName}`);

      if (sheetName && sheetName !== '메뉴') {
        const cleanSheetName = sheetName.trim();
        deleteSheetByName(cleanSheetName);
      }
    }

  } catch (error) {
    Logger.log(`메뉴 클릭 처리 오류: ${error.message}`);
    SpreadsheetApp.getUi().alert('오류', `처리 중 오류가 발생했습니다: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 메뉴 시스템 설정
 */
function setupCompleteInteractiveMenu() {
  Logger.log('=== 메뉴 설정 시작 ===');

  const results = [];

  try {
    const menuResult = createDynamicHyperlinkMenu();
    results.push(`동적 메뉴: ${menuResult.success ? '✅' : '❌'} ${menuResult.message}`);

    // 사용자 정의 메뉴 추가 (onOpen과 동일)
    onOpen();
    results.push('사용자 정의 메뉴: ✅ 설정됨');

    // onEdit 트리거 (삭제용만)
    const triggers = ScriptApp.getProjectTriggers();
    const hasMenuTrigger = triggers.some(trigger =>
      trigger.getHandlerFunction() === 'onEditMenuClick'
    );

    if (!hasMenuTrigger) {
      ScriptApp.newTrigger('onEditMenuClick')
        .forSpreadsheet(SpreadsheetApp.getActive())
        .onEdit()
        .create();
      results.push('삭제 트리거: ✅ 설정됨');
    } else {
      results.push('삭제 트리거: ✅ 이미 존재');
    }

    Logger.log('=== 메뉴 설정 결과 ===');
    results.forEach(result => Logger.log(result));

    return {
      success: true,
      message: '메뉴가 설정되었습니다.',
      results: results
    };

  } catch (error) {
    Logger.log(`메뉴 설정 오류: ${error.message}`);
    return { success: false, message: '메뉴 설정 실패: ' + error.message };
  }
}

/**
 * 메뉴 시트로 이동
 */
function goToMenu() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const menuSheet = ss.getSheetByName('메뉴');

  if (menuSheet) {
    menuSheet.activate();
  } else {
    SpreadsheetApp.getUi().alert('알림', '메뉴 시트를 찾을 수 없습니다.\n먼저 메뉴 초기화를 실행해주세요.', SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * onOpen 트리거 - 스프레드시트 열릴 때 자동으로 메뉴 추가
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📋 포트폴리오')
    .addItem('📋 메뉴로 이동', 'goToMenu')
    .addSeparator()
    .addItem('🔄 시트 목록 정렬', 'updateSheetList')
    .addItem('➕ 새 과제 시트', 'createAssignmentSheet')
    .addSeparator()
    .addItem('🔧 메뉴 초기화', 'setupCompleteInteractiveMenu')
    .addToUi();
}
