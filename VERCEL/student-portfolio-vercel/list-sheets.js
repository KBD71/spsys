// Google Sheets의 시트 이름 목록 조회
require('dotenv').config();
const { google } = require('googleapis');

async function listSheets() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    console.log('\n=== Google Sheets 시트 목록 ===\n');

    // 스프레드시트 메타데이터 가져오기
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: false
    });

    console.log(`📊 Spreadsheet: ${spreadsheet.data.properties.title}`);
    console.log(`📝 Total Sheets: ${spreadsheet.data.sheets.length}\n`);

    spreadsheet.data.sheets.forEach((sheet, index) => {
      console.log(`${index + 1}. ${sheet.properties.title}`);
    });

    console.log('\n✅ 완료\n');

  } catch (error) {
    console.error('\n❌ 오류:', error.message);
  }
}

listSheets();
