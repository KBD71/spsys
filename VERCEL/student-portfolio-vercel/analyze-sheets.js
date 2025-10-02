// Google Sheets 전체 구조 분석 도구
require('dotenv').config();
const { google } = require('googleapis');

async function analyzeSheets() {
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

    console.log('\n=== Google Sheets 전체 구조 분석 ===\n');

    // 스프레드시트 메타데이터 가져오기
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: false
    });

    console.log(`📊 Spreadsheet: ${spreadsheet.data.properties.title}`);
    console.log(`📝 Total Sheets: ${spreadsheet.data.sheets.length}\n`);

    // 각 시트 분석
    for (const sheet of spreadsheet.data.sheets) {
      const sheetName = sheet.properties.title;
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 시트 이름: ${sheetName}`);
      console.log(`${'='.repeat(80)}\n`);

      // 시트 데이터 읽기 (최대 100행)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:Z100`
      });

      const rows = response.data.values;

      if (!rows || rows.length === 0) {
        console.log('❌ 데이터 없음\n');
        continue;
      }

      // 헤더
      console.log('📌 헤더 (첫 번째 행):');
      console.log('   ', rows[0].join(' | '));
      console.log('');

      // 컬럼 개수
      console.log(`📊 컬럼 개수: ${rows[0].length}`);
      console.log(`📊 데이터 행 개수: ${rows.length - 1}`);
      console.log('');

      // 샘플 데이터 (최대 5행)
      const sampleSize = Math.min(5, rows.length - 1);
      if (sampleSize > 0) {
        console.log(`📝 샘플 데이터 (최대 ${sampleSize}행):\n`);
        for (let i = 1; i <= sampleSize; i++) {
          console.log(`   Row ${i}:`);
          rows[0].forEach((header, idx) => {
            const value = rows[i][idx] || '(empty)';
            const displayValue = value.length > 50 ? value.substring(0, 47) + '...' : value;
            console.log(`      ${header}: ${displayValue}`);
          });
          console.log('');
        }
      }

      // 컬럼별 통계
      console.log('📊 컬럼별 통계:\n');
      rows[0].forEach((header, idx) => {
        let filledCount = 0;
        let emptyCount = 0;
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][idx] && rows[i][idx].trim() !== '') {
            filledCount++;
          } else {
            emptyCount++;
          }
        }
        console.log(`   ${header}:`);
        console.log(`      채워진 셀: ${filledCount}`);
        console.log(`      빈 셀: ${emptyCount}`);
      });
      console.log('');
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('✅ 분석 완료');
    console.log(`${'='.repeat(80)}\n`);

  } catch (error) {
    console.error('\n❌ 오류:', error.message);
    console.error(error);
  }
}

analyzeSheets();
