/**
 * ==============================================
 * main.gs - 웹앱 진입점 (Entry Point)
 * ==============================================
 * 이 파일은 학생용 웹앱(WebApp.html)을 서비스하는 유일한 역할을 합니다.
 * 다른 모든 교사용 기능 및 로직은 각각의 전문 .gs 파일로 분리되었습니다.
 */

/**
 * 학생이 웹앱 URL에 접속했을 때 최초로 실행되는 함수입니다.
 * WebApp.html 파일을 사용자에게 전송합니다.
 * @param {Object} e - 웹 요청 이벤트 객체
 * @returns {HtmlOutput} 렌더링된 HTML 페이지
 */
function doGet(e) {
  try {
    // WebApp.html 파일을 템플릿으로 불러옵니다.
    const template = HtmlService.createTemplateFromFile('WebApp');

    // HTML을 평가(evaluate)하여 최종 HTML 출력을 생성합니다.
    const html = template.evaluate()
      .setTitle('학생 포트폴리오 시스템')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL) // 외부 사이트에서도 임베드 가능
      .addMetaTag('viewport', 'width=device-width, initial-scale=1'); // 모바일 반응형 설정

    return html;

  } catch (error) {
    Logger.log(`doGet 오류: ${error.message}`);
    // 만약 WebApp.html 로드에 실패하면 사용자에게 오류 페이지를 보여줍니다.
    return HtmlService.createHtmlOutput(`
      <html>
        <head><title>오류</title></head>
        <body style="font-family: sans-serif; text-align: center;">
          <h1>⚠️ 웹앱 로드 실패</h1>
          <p>페이지를 표시하는 중 오류가 발생했습니다. 관리자에게 문의하세요.</p>
        </body>
      </html>
    `);
  }
}

/**
 * HTML 템플릿 내에서 다른 HTML 파일을 포함시키기 위한 헬퍼 함수입니다.
 * (현재 WebApp.html에서는 사용되지 않지만, 구조적 편의를 위해 남겨둘 수 있습니다.)
 * @param {string} filename - 포함할 HTML 파일의 이름
 * @returns {string} 해당 파일의 HTML 콘텐츠
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
