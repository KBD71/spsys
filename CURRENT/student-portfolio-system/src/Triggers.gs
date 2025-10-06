/**
 * ==============================================
 * Triggers.gs - 자동 실행 트리거 (v3.1 - 설치형 트리거 적용)
 * ==============================================
 */

/**
 * 스프레드시트가 열릴 때 '포트폴리오 관리' 메뉴를 생성합니다.
 * '트리거 설치' 메뉴를 추가합니다.
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('📋 포트폴리오 관리')
      .addItem('➕ 새 과제 시트 생성', 'showAssignmentCreatorSidebar') // UI.gs
      .addSeparator()
      .addSubMenu(SpreadsheetApp.getUi().createMenu('➡️ 바로가기')
        .addItem('🏠 대시보드 (메뉴)', 'goToMenu') // UI.gs
        .addItem('🧑‍🎓 학생명단', 'goToStudents') // UI.gs
        .addItem('📝 과제설정', 'goToAssignments') // UI.gs
        .addItem('📢 공개설정', 'goToPublic') // UI.gs
        .addItem('🤖 프롬프트', 'goToPrompts') // UI.gs
      )
      .addSeparator()
      .addItem('🔄 대시보드 새로고침', 'refreshDashboard') // Dashboard.gs
      .addItem('🗑️ 시트 삭제', 'promptToDeleteSheet') // UI.gs
      .addSeparator()
      .addSubMenu(SpreadsheetApp.getUi().createMenu('🤖 AI 기능')
        .addItem('🔑 AI API 키 설정', 'setApiKey') // AI.gs
        .addItem('✍️ 선택한 행에 AI 초안 생성', 'generateAiSummaryManual') // AI.gs
      )
      .addSeparator()
      .addSubMenu(SpreadsheetApp.getUi().createMenu('⚙️ 시스템 설정')
        .addItem('초기화: 필수 시트 생성', 'initializeMinimalSystem') // SheetManager.gs
        .addItem('⚠️ 중요: AI용 트리거 설치', 'createEditTrigger') // 이 항목 추가
      )
      .addToUi();
  } catch (e) {
    Logger.log('onOpen Error: ' + e.message);
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

    const requiredSheets = ['메뉴', '학생명단_전체', '과제설정', '공개', 'template', '프롬프트'];
    if (requiredSheets.includes(sheet.getName())) return;
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const targetColName = headers[editedCol - 1] || '';

    if (targetColName === '초안생성') {
      Logger.log(`설치형 트리거: AI 초안 생성 시작 (시트: ${sheet.getName()}, 행: ${editedRow})`);
      runAiGeneration(sheet, editedRow); // AI.gs의 함수 호출
    }

  } catch (error) {
    Logger.log(`handleEditTrigger 오류: ${error.message}\n${error.stack}`);
    // 사용자에게 직접적인 오류 알림은 혼란을 줄 수 있으므로 로그만 기록합니다.
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
    SpreadsheetApp.getUi().alert('✅ 알림', 'AI 초안 생성을 위한 트리거가 이미 설치되어 있습니다.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  // 트리거를 새로 설치
  try {
    ScriptApp.newTrigger('handleEditTrigger')
      .forSpreadsheet(ss)
      .onEdit()
      .create();
    
    SpreadsheetApp.getUi().alert('✅ 성공', 'AI 초안 생성을 위한 트리거가 성공적으로 설치되었습니다.\n이제 체크박스로 AI 기능을 사용할 수 있습니다.', SpreadsheetApp.getUi().ButtonSet.OK);
      
  } catch (e) {
    Logger.log(`트리거 설치 실패: ${e.message}`);
    SpreadsheetApp.getUi().alert('❌ 실패', `트리거 설치에 실패했습니다.\n오류: ${e.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}
