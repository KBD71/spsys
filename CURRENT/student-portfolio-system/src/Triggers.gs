/**
 * ==============================================
 * Triggers.gs - 자동 실행 트리거 (v4.1 - v18 대시보드 호출)
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
      )
      .addSeparator()
      .addItem('🔄 대시보드 새로고침', 'refreshDashboard_v18')
      .addItem('🗑️ 시트 삭제', 'promptToDeleteSheet')
      .addSeparator()
      .addSubMenu(ui.createMenu('📢 공개 관리')
        .addItem('💬 현재 시트 의견 공개 토글', 'toggleOpinionPublic')
        .addSeparator()
        .addItem('⬆️ 공개 시트 v2 업그레이드', 'upgradePublicSheet')
      )
      .addSeparator()
      .addSubMenu(ui.createMenu('⚙️ 시스템 설정')
        .addItem('🔧 초기화: 필수 시트 생성', 'initializeMinimalSystem')
      )
      .addToUi();
    Logger.log('v18 메뉴 생성 완료');
    
  } catch (e) {
    Logger.log('onOpen 오류: ' + e.message + '\n' + e.stack);
  }
}

