/**
 * ==============================================
 * Triggers.gs - 자동 실행 트리거 (v4.0 - 시험 모드 메뉴 추가)
 * ==============================================
 * 스프레드시트가 열릴 때 메뉴를 생성하고, 편집 이벤트를 처리합니다.
 */

/**
 * 스프레드시트가 열릴 때 자동으로 실행되는 함수입니다.
 * '포트폴리오 관리' 메뉴를 생성합니다.
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    
    ui.createMenu('📋 포트폴리오 관리')
      .addItem('➕ 새 과제 시트 생성', 'showAssignmentCreatorSidebar')
      .addSeparator()
      .addSubMenu(ui.createMenu('➡️ 바로가기')
        .addItem('🏠 대시보드 (메뉴)', 'goToMenu')
        .addItem('🧑‍🎓 학생명단', 'goToStudents')
        .addItem('📝 과제설정', 'goToAssignments')
        .addItem('📢 공개설정', 'goToPublic')
        .addItem('🤖 프롬프트', 'goToPrompts')
        .addItem('📊 시험로그', 'goToExamLog')
      )
      .addSeparator()
      .addItem('🔄 대시보드 새로고침', 'refreshDashboard')
      .addItem('🗑️ 시트 삭제', 'promptToDeleteSheet')
      .addSeparator()
      .addSubMenu(ui.createMenu('🤖 AI 기능')
        .addItem('✍️ 선택된 행에 AI 초안 생성', 'generateAiSummaryManual')
        .addItem('🚀 미작성 학생 일괄 AI 초안 생성', 'generateAiBatchForUnwritten')
        .addSeparator()
        .addItem('🕵️ 선택된 행 AI 사용 검사', 'runAiDetectionManual')
        .addSeparator()
        .addItem('🔑 Gemini API 키 설정', 'setGeminiApiKey')
        .addItem('🔑 Claude API 키 설정', 'setClaudeApiKey')
        .addSeparator()
        .addItem('⚙️ AI 제공자 선택 (Gemini/Claude)', 'selectAiProvider')
      )
      .addSeparator()
      .addSubMenu(ui.createMenu('🎯 시험 감독')
        .addItem('📊 현재 시트 시험 로그 요약', 'showExamLogSummary')
        .addItem('⚠️ 의심 학생 목록 보기', 'showSuspiciousStudents')
        .addSeparator()
        .addItem('📋 시험로그 시트로 이동', 'goToExamLog')
        .addSeparator()
        .addItem('🗑️ 시험로그 초기화', 'clearExamLogs')
      )
      .addSeparator()
      .addSubMenu(ui.createMenu('📢 공개 관리')
        .addItem('💬 현재 시트 의견 공개 토글', 'toggleOpinionPublic')
        .addSeparator()
        .addItem('⬆️ 공개 시트 v2 업그레이드', 'upgradePublicSheet')
      )
      .addSeparator()
      .addSubMenu(ui.createMenu('⚙️ 시스템 설정')
        .addItem('🔧 초기화: 필수 시트 생성', 'initializeMinimalSystem')
        .addItem('⚠️ 중요: AI용 트리거 설치', 'createEditTrigger')
      )
      .addToUi();
      
    Logger.log('메뉴 생성 완료');
    
  } catch (e) {
    Logger.log('onOpen 오류: ' + e.message + '\n' + e.stack);
    // 오류가 발생해도 시트는 정상적으로 열리도록 함
  }
}

/**
 * (설치형 트리거용) 시트가 편집될 때 실행될 함수입니다.
 * '초안생성' 체크박스 클릭 시 AI.gs의 runAiGeneration 함수를 호출합니다.
 * @param {Object} e - Apps Script가 제공하는 이벤트 객체
 */
function handleEditTrigger(e) {
  try {
    if (!e || !e.range) return;

    const range = e.range;
    if (range.getNumRows() > 1 || range.getNumColumns() > 1) return;

    const sheet = range.getSheet();
    const editedRow = range.getRow();
    const editedCol = range.getColumn();

    if (editedRow < 2 || !range.isChecked()) return;

    const requiredSheets = ['메뉴', '학생명단_전체', '과제설정', '공개', 'template', '프롬프트', '시험로그'];
    if (requiredSheets.includes(sheet.getName())) return;
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const targetColName = headers[editedCol - 1] || '';

    if (targetColName === '초안생성') {
      Logger.log(`설치형 트리거: AI 초안 생성 시작 (시트: ${sheet.getName()}, 행: ${editedRow})`);
      runAiGeneration(sheet, editedRow); // AI.gs의 함수 호출
    }

  } catch (error) {
    Logger.log(`handleEditTrigger 오류: ${error.message}\n${error.stack}`);
  }
}

/**
 * 'handleEditTrigger' 함수를 설치형 트리거로 등록하는 함수입니다.
 * 사용자가 메뉴를 통해 딱 한 번만 실행하면 됩니다.
 */
function createEditTrigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const triggers = ScriptApp.getUserTriggers(ss);
  
  // 이미 같은 트리거가 설치되어 있는지 확인
  const triggerExists = triggers.some(t => t.getHandlerFunction() === 'handleEditTrigger');
  
  if (triggerExists) {
    SpreadsheetApp.getUi().alert(
      '✅ 알림', 
      'AI 초안 생성을 위한 트리거가 이미 설치되어 있습니다.', 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  // 트리거를 새로 설치
  try {
    ScriptApp.newTrigger('handleEditTrigger')
      .forSpreadsheet(ss)
      .onEdit()
      .create();
    
    SpreadsheetApp.getUi().alert(
      '✅ 성공', 
      'AI 초안 생성을 위한 트리거가 성공적으로 설치되었습니다.\n이제 체크박스로 AI 기능을 사용할 수 있습니다.', 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
      
  } catch (e) {
    Logger.log(`트리거 설치 실패: ${e.message}`);
    SpreadsheetApp.getUi().alert(
      '❌ 실패', 
      `트리거 설치에 실패했습니다.\n오류: ${e.message}`, 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}
