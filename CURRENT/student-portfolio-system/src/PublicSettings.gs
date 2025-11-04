/**
 * ==============================================
 * PublicSettings.gs - 공개설정 통합 시스템 (v2.0)
 * ==============================================
 * '공개' 시트를 확장하여 과제 공개와 의견 공개를 분리 관리합니다.
 *
 * 신규 컬럼 구조:
 * - 과제공개 (체크박스): 학생이 과제를 볼 수 있는지 여부
 * - 대상시트 (텍스트): 과제 시트 이름
 * - 대상반 (텍스트): 과제 대상 반 (예: "101,106" 또는 "전체")
 * - 의견공개 (체크박스): 학생이 교사 코멘트를 볼 수 있는지 여부
 * - 알림메시지 (텍스트): 의견 공개 시 학생에게 보여줄 메시지
 */

/**
 * '공개' 시트의 구조를 업그레이드합니다 (v1 -> v2)
 * 기존 데이터를 보존하며 새 컬럼을 추가합니다.
 */
function upgradePublicSheet() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('공개');

  if (!sheet) {
    ui.alert('❌ 오류', '\'공개\' 시트를 찾을 수 없습니다.', ui.ButtonSet.OK);
    return;
  }

  try {
    // 현재 헤더 확인
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // 이미 v2 구조인지 확인
    if (headers.includes('의견공개') && headers.includes('알림메시지')) {
      const response = ui.alert(
        'ℹ️ 알림',
        '\'공개\' 시트가 이미 최신 버전입니다.\n\n강제로 재구성하시겠습니까?',
        ui.ButtonSet.YES_NO
      );

      if (response !== ui.Button.YES) {
        return;
      }
    }

    // v1 구조: [공개, 대상시트, 대상반] 또는 [공개, 시트이름, 대상반]
    // v2 구조: [과제공개, 대상시트, 대상반, 의견공개, 알림메시지]

    const data = sheet.getDataRange().getValues();
    const oldHeaders = data[0];

    // 새 헤더 설정
    const newHeaders = ['과제공개', '대상시트', '대상반', '의견공개', '알림메시지'];

    // 기존 데이터 마이그레이션
    const newData = [newHeaders];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // v1 구조 호환: '공개' 또는 '과제공개' 컬럼 모두 지원
      let 과제공개 = false;
      if (oldHeaders.indexOf('공개') !== -1) {
        과제공개 = row[oldHeaders.indexOf('공개')] || false;
      } else if (oldHeaders.indexOf('과제공개') !== -1) {
        과제공개 = row[oldHeaders.indexOf('과제공개')] || false;
      }

      // '대상시트' 또는 '시트이름' 컬럼 모두 지원
      let 대상시트 = '';
      if (oldHeaders.indexOf('대상시트') !== -1) {
        대상시트 = row[oldHeaders.indexOf('대상시트')] || '';
      } else if (oldHeaders.indexOf('시트이름') !== -1) {
        대상시트 = row[oldHeaders.indexOf('시트이름')] || '';
      }

      const 대상반 = row[oldHeaders.indexOf('대상반')] || '전체';

      // 신규 컬럼 기본값
      let 의견공개 = false;
      let 알림메시지 = '';

      // 이미 v2 구조인 경우 기존 값 유지
      if (oldHeaders.indexOf('의견공개') !== -1) {
        의견공개 = row[oldHeaders.indexOf('의견공개')] || false;
      }
      if (oldHeaders.indexOf('알림메시지') !== -1) {
        알림메시지 = row[oldHeaders.indexOf('알림메시지')] || '';
      }

      newData.push([과제공개, 대상시트, 대상반, 의견공개, 알림메시지]);
    }

    // 시트 초기화 및 새 데이터 작성
    sheet.clear();
    sheet.clearFormats();

    sheet.getRange(1, 1, newData.length, newHeaders.length).setValues(newData);

    // 헤더 스타일링
    sheet.getRange(1, 1, 1, newHeaders.length)
      .setBackground('#4A80FE')
      .setFontColor('white')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');

    // 체크박스 컬럼 설정
    if (newData.length > 1) {
      sheet.getRange(2, 1, newData.length - 1, 1).insertCheckboxes(); // 과제공개
      sheet.getRange(2, 4, newData.length - 1, 1).insertCheckboxes(); // 의견공개
    }

    // 컬럼 너비 조정
    sheet.setColumnWidth(1, 100); // 과제공개
    sheet.setColumnWidth(2, 200); // 대상시트
    sheet.setColumnWidth(3, 100); // 대상반
    sheet.setColumnWidth(4, 100); // 의견공개
    sheet.setColumnWidth(5, 300); // 알림메시지

    SpreadsheetApp.flush();

    ui.alert(
      '✅ 업그레이드 완료',
      `'공개' 시트가 v2 구조로 업그레이드되었습니다.\n\n` +
      `신규 기능:\n` +
      `- 과제공개: 기존 '공개' 컬럼 (과제 자체 공개)\n` +
      `- 의견공개: 교사 코멘트 공개 여부\n` +
      `- 알림메시지: 의견 공개 시 학생에게 표시할 메시지`,
      ui.ButtonSet.OK
    );

    Logger.log('[PublicSettings] 공개 시트 v2 업그레이드 완료');

  } catch (e) {
    Logger.log(`[PublicSettings] 업그레이드 오류: ${e.message}\n${e.stack}`);
    ui.alert('❌ 오류', `업그레이드 중 오류가 발생했습니다:\n${e.message}`, ui.ButtonSet.OK);
  }
}

/**
 * 특정 학생의 특정 과제에 대해 의견 공개 여부 확인
 * @param {string} sheetName - 과제 시트 이름
 * @param {string} studentId - 학번
 * @returns {object} { isPublic: boolean, message: string }
 */
function checkOpinionPublicStatus(sheetName, studentId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const publicSheet = ss.getSheetByName('공개');

    if (!publicSheet) {
      return { isPublic: false, message: '' };
    }

    const data = publicSheet.getDataRange().getValues();
    const headers = data[0];

    const sheetIndex = headers.indexOf('대상시트');
    const opinionIndex = headers.indexOf('의견공개');
    const messageIndex = headers.indexOf('알림메시지');

    if (sheetIndex === -1 || opinionIndex === -1) {
      // v1 구조 (의견공개 미지원)
      return { isPublic: false, message: '' };
    }

    // 해당 시트 찾기
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[sheetIndex] === sheetName) {
        const isPublic = row[opinionIndex] === true || row[opinionIndex] === 'TRUE';
        const message = row[messageIndex] || '';

        return {
          isPublic: isPublic,
          message: isPublic ? message : ''
        };
      }
    }

    return { isPublic: false, message: '' };

  } catch (e) {
    Logger.log(`[PublicSettings] 의견 공개 상태 확인 오류: ${e.message}`);
    return { isPublic: false, message: '' };
  }
}

/**
 * 의견 공개 일괄 설정 (특정 과제의 모든 학생)
 * @param {string} sheetName - 과제 시트 이름
 * @param {boolean} isPublic - 공개 여부
 * @param {string} message - 알림 메시지
 */
function setOpinionPublicBatch(sheetName, isPublic, message) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const publicSheet = ss.getSheetByName('공개');

    if (!publicSheet) {
      throw new Error('\'공개\' 시트를 찾을 수 없습니다.');
    }

    const data = publicSheet.getDataRange().getValues();
    const headers = data[0];

    const sheetIndex = headers.indexOf('대상시트');
    const opinionIndex = headers.indexOf('의견공개');
    const messageIndex = headers.indexOf('알림메시지');

    if (sheetIndex === -1 || opinionIndex === -1) {
      throw new Error('\'공개\' 시트가 v2 구조가 아닙니다. 먼저 업그레이드하세요.');
    }

    // 해당 시트 행 찾기
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[sheetIndex] === sheetName) {
        publicSheet.getRange(i + 1, opinionIndex + 1).setValue(isPublic);
        publicSheet.getRange(i + 1, messageIndex + 1).setValue(message || '');

        Logger.log(createSafeLog(`[PublicSettings] 의견 공개 설정 변경: ${sheetName}`, {
          assignmentId: sheetName
        }));

        return { success: true };
      }
    }

    throw new Error(`'${sheetName}' 시트를 '공개' 시트에서 찾을 수 없습니다.`);

  } catch (e) {
    Logger.log(`[PublicSettings] 의견 공개 설정 오류: ${e.message}`);
    throw e;
  }
}

/**
 * 메뉴: 현재 시트의 의견 공개 토글
 */
function toggleOpinionPublic() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();

  try {
    const status = checkOpinionPublicStatus(sheetName, null);

    const newStatus = !status.isPublic;

    let message = '';
    if (newStatus) {
      const response = ui.prompt(
        '💬 알림 메시지 입력',
        '의견 공개 시 학생들에게 표시할 메시지를 입력하세요:\n(선택사항)',
        ui.ButtonSet.OK_CANCEL
      );

      if (response.getSelectedButton() !== ui.Button.OK) {
        return;
      }

      message = response.getResponseText();
    }

    setOpinionPublicBatch(sheetName, newStatus, message);

    ui.alert(
      '✅ 변경 완료',
      `'${sheetName}' 과제의 의견 공개가 ${newStatus ? '활성화' : '비활성화'}되었습니다.`,
      ui.ButtonSet.OK
    );

  } catch (e) {
    Logger.log(`[PublicSettings] 의견 공개 토글 오류: ${e.message}`);
    ui.alert('❌ 오류', e.message, ui.ButtonSet.OK);
  }
}
