/**
 * [진단용 API] 과제 설정 시트의 원본 데이터를 그대로 반환합니다.
 * 이 API를 통해 Vercel 서버가 Google Sheets에서 어떤 데이터를 읽어오는지 확인할 수 있습니다.
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '과제설정!A:G'
    });

    const rawData = response.data.values || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const analysis = rawData.slice(1).map((row, index) => {
        const isPublic = (row[0] || '').toString().toUpperCase() === 'TRUE';
        const startDateStr = row[4] || null;
        const dueDateStr = row[5] || null;

        let dateAnalysis = '날짜 조건 없음';
        let isDateValid = true;

        const startDate = startDateStr ? new Date(startDateStr.replace(/\. /g, '-').replace(/\./g, '-')) : null;
        const dueDate = dueDateStr ? new Date(dueDateStr.replace(/\. /g, '-').replace(/\./g, '-')) : null;

        if (startDate && isNaN(startDate.getTime())) dateAnalysis = '시작일 형식 오류';
        else if (dueDate && isNaN(dueDate.getTime())) dateAnalysis = '마감일 형식 오류';
        else {
            if (startDate && today < startDate) {
                isDateValid = false;
                dateAnalysis = '과제 시작 전';
            }
            if (dueDate && today > dueDate) {
                isDateValid = false;
                dateAnalysis = '과제 마감됨';
            }
            if(isDateValid && (startDate || dueDate)) {
                dateAnalysis = '기간 유효';
            }
        }
        
        return {
            row: index + 2,
            rawData: row,
            isPublic: isPublic,
            dateAnalysis: dateAnalysis,
            isDateValid: isDateValid,
            willBeDisplayed: isPublic && isDateValid
        };
    });

    return res.status(200).json({
      message: "Vercel 서버가 '과제설정' 시트에서 읽은 원본 데이터와 분석 결과입니다.",
      serverTime: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      analysis: analysis
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return res.status(500).json({ success: false, message: '데이터를 가져오는 중 오류 발생: ' + error.message, error: error.stack });
  }
};
