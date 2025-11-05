/**
 * my-records API 테스트 - 단계별 디버그
 */
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const debug = {
    step: 0,
    studentId: req.query.studentId,
    timestamp: new Date().toISOString()
  };

  try {
    // Step 1: 파라미터 확인
    debug.step = 1;
    debug.hasStudentId = !!req.query.studentId;

    if (!req.query.studentId) {
      debug.error = '학번 파라미터 없음';
      return res.status(200).json(debug);
    }

    // Step 2: Sheets 클라이언트 생성
    debug.step = 2;
    const sheets = await getSheetsClient();
    debug.sheetsClientCreated = true;

    // Step 3: 공개 시트 조회
    debug.step = 3;
    const spreadsheetId = process.env.SPREADSHEET_ID;
    debug.spreadsheetId = spreadsheetId;

    const publicSheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '공개!A:E'
    });

    debug.step = 4;
    debug.publicSheetRowCount = publicSheetResponse.data.values?.length || 0;
    debug.publicSheetHeaders = publicSheetResponse.data.values?.[0] || [];

    // Step 5: 헤더 파싱
    debug.step = 5;
    const publicHeaders = publicSheetResponse.data.values?.[0] || [];
    const publicHeaderMap = {};
    publicHeaders.forEach((h, i) => {
      if (h && typeof h === 'string') {
        publicHeaderMap[h.trim()] = i;
      }
    });

    debug.headerMap = publicHeaderMap;
    debug.hasCorrectStructure =
      (publicHeaderMap['과제공개'] !== undefined || publicHeaderMap['공개'] !== undefined) &&
      (publicHeaderMap['대상시트'] !== undefined || publicHeaderMap['시트이름'] !== undefined);

    return res.status(200).json(debug);

  } catch (error) {
    debug.error = error.message;
    debug.errorStack = error.stack;
    return res.status(200).json(debug);
  }
};
