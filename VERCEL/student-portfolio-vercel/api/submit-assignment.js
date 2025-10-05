/**
 * 과제 제출 API
 * POST /api/submit-assignment
 * 학생의 답변을 저장하고, '초안생성' 컬럼에 체크박스(FALSE)를 생성합니다.
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { studentId, assignmentId, answers } = req.body;

    if (!studentId || !assignmentId || !answers) {
      return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const [studentResponse, assignmentResponse] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: '학생명단_전체!A:D' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: '과제설정!A:F' })
    ]);

    const studentRow = studentResponse.data.values.find((row, idx) => idx > 0 && row[0] === studentId);
    if (!studentRow) return res.status(404).json({ success: false, message: '학생을 찾을 수 없습니다.' });
    const [ , studentClass, , studentName] = studentRow;

    const assignmentRow = assignmentResponse.data.values.find((row, idx) => idx > 0 && row[1] === assignmentId);
    if (!assignmentRow) return res.status(404).json({ success: false, message: '과제를 찾을 수 없습니다.' });
    const targetSheet = assignmentRow[3];

    const targetHeaderResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${targetSheet}!1:1` });
    const headers = targetHeaderResponse.data.values ? targetHeaderResponse.data.values[0] : [];
    if (headers.length < 1) throw new Error('대상 시트의 헤더를 읽을 수 없습니다.');

    const newRowData = {};
    newRowData['학번'] = studentId;
    newRowData['반'] = studentClass;
    newRowData['이름'] = studentName;
    newRowData['제출일시'] = new Date().toISOString();
    newRowData['초안생성'] = 'FALSE'; // 체크박스를 FALSE 상태로 생성

    for (const header of headers) {
        if (answers[header]) {
            newRowData[header] = answers[header];
        }
    }

    const newRowArray = headers.map(header => newRowData[header] || '');

    const targetDataResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${targetSheet}!A:A` });
    const existingRowIndex = (targetDataResponse.data.values || []).findIndex((row, idx) => idx > 0 && row[0] === studentId);

    if (existingRowIndex >= 0) {
      const rowNumber = existingRowIndex + 2; // 데이터는 A2부터 시작하므로 +2
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${targetSheet}!A${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRowArray] }
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: targetSheet,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRowArray] }
      });
    }

    return res.status(200).json({ success: true, message: '과제가 제출되었습니다.' });

  } catch (error) {
    console.error('Submit assignment API error:', error);
    return res.status(500).json({ success: false, message: '과제 제출 실패: ' + error.message });
  }
};
