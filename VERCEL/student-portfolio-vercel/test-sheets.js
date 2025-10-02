// Google Sheets 데이터 확인 도구
require('dotenv').config();
const { findStudent } = require('./api/sheets');
const { google } = require('googleapis');

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

async function testSheets() {
  try {
    console.log('\n=== Google Sheets 연결 테스트 ===\n');

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    console.log('✅ Google Sheets 연결 성공');
    console.log('Spreadsheet ID:', spreadsheetId);

    // 시트 데이터 읽기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '학생명단_전체!A:G'
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log('\n❌ 시트에 데이터가 없습니다.');
      return;
    }

    console.log('\n=== 시트 데이터 ===\n');
    console.log('헤더:', rows[0]);
    console.log('\n학생 데이터:');

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      console.log(`\n학번: ${row[0]}`);
      console.log(`이름: ${row[1]}`);
      console.log(`반: ${row[2]}`);
      console.log(`비밀번호 해시 (처음 20자): ${row[3]?.substring(0, 20)}...`);
      console.log(`전체 해시: ${row[3]}`);
    }

    // 학번 10101 찾기
    console.log('\n=== 학번 10101 검색 ===\n');
    const student = rows.find((row, idx) => idx > 0 && row[0] === '10101');

    if (student) {
      console.log('✅ 학번 10101 찾음');
      console.log('저장된 해시:', student[3]);
      console.log('\n예상 해시: Rq5aansMevpP8kx/9RKtqZqNIHrVjS0y0wjv8gmcFkw=');
      console.log('일치 여부:', student[3] === 'Rq5aansMevpP8kx/9RKtqZqNIHrVjS0y0wjv8gmcFkw=');
    } else {
      console.log('❌ 학번 10101을 찾을 수 없습니다.');
    }

  } catch (error) {
    console.error('\n❌ 오류:', error.message);
    console.error(error);
  }
}

testSheets();
