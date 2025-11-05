/**
 * my-records 디버그 API (v2 - 알림 로직 업데이트)
 * 공개 시트의 모든 행을 상세히 출력하여 문제 진단
 * - 알림: 알림메시지가 있으면 항상 표시 (의견공개 상태 무관)
 * - 코멘트: 의견공개=TRUE일 때 표시
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

function isClassAllowed(studentId, targetClass) {
  const target = (targetClass || '').trim();
  if (!target || target.toLowerCase() === '전체') return true;
  if (!studentId || studentId.length < 3) return false;
  const studentPrefix = studentId.substring(0, 3);
  const allowedPrefixes = target.split(',').map(prefix => prefix.trim());
  return allowedPrefixes.includes(studentPrefix);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { studentId } = req.query;
  if (!studentId) {
    return res.status(400).json({ success: false, message: '학번이 필요합니다. 예: ?studentId=10103' });
  }

  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const publicSheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '공개!A:E'
    });

    const publicSheetData = publicSheetResponse.data.values || [];

    const debug = {
      studentId,
      studentPrefix: studentId.substring(0, 3),
      totalRows: publicSheetData.length,
      headers: publicSheetData[0] || [],
      rows: []
    };

    if (publicSheetData.length < 2) {
      debug.message = '공개 시트에 데이터가 없습니다 (헤더만 있음)';
      return res.status(200).json(debug);
    }

    const publicHeaders = publicSheetData[0] || [];
    const publicHeaderMap = {};
    publicHeaders.forEach((h, i) => {
      if (h && typeof h === 'string') {
        publicHeaderMap[h.trim()] = i;
      }
    });

    const isPublicIdx = publicHeaderMap['과제공개'] !== undefined ? publicHeaderMap['과제공개'] : publicHeaderMap['공개'];
    const sheetNameIdx = publicHeaderMap['대상시트'] !== undefined ? publicHeaderMap['대상시트'] : publicHeaderMap['시트이름'];
    const targetClassIdx = publicHeaderMap['대상반'];
    const opinionPublicIdx = publicHeaderMap['의견공개'];
    const notificationMessageIdx = publicHeaderMap['알림메시지'];

    debug.headerMap = {
      isPublicIdx,
      sheetNameIdx,
      targetClassIdx,
      opinionPublicIdx,
      notificationMessageIdx
    };

    // 각 행을 상세히 분석
    for (let i = 1; i < publicSheetData.length; i++) {
      const publicRow = publicSheetData[i];

      const isPublic = publicRow[isPublicIdx] === true || publicRow[isPublicIdx] === 'TRUE';
      const targetSheetName = publicRow[sheetNameIdx];
      const targetClass = publicRow[targetClassIdx] || '전체';
      const opinionPublic = opinionPublicIdx !== undefined ? (publicRow[opinionPublicIdx] === true || publicRow[opinionPublicIdx] === 'TRUE') : true;
      const notificationMessage = notificationMessageIdx !== undefined ? (publicRow[notificationMessageIdx] || '').trim() : '';

      const classAllowed = isClassAllowed(studentId, targetClass);

      const rowDebug = {
        rowNumber: i + 1,
        rawData: publicRow,
        parsed: {
          과제공개: isPublic,
          대상시트: targetSheetName,
          대상반: targetClass,
          의견공개: opinionPublic,
          알림메시지: notificationMessage
        },
        checks: {
          '1_과제공개_TRUE': isPublic,
          '2_대상시트_존재': !!targetSheetName,
          '3_대상반_일치': classAllowed,
          '4_알림메시지_존재': !!notificationMessage,
          '5_의견공개_TRUE': opinionPublic
        },
        willShowNotification: isPublic && targetSheetName && classAllowed && notificationMessage,
        willShowComment: isPublic && targetSheetName && classAllowed && opinionPublic
      };

      debug.rows.push(rowDebug);
    }

    return res.status(200).json(debug);

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};
