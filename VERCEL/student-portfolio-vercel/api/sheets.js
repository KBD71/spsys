/**
 * Google Sheets API 연동 라이브러리
 * Vercel Serverless Functions에서 사용
 */

const { google } = require('googleapis');
const crypto = require('crypto');

/**
 * Google Sheets 인증 및 연결
 */
async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  return sheets;
}

/**
 * 비밀번호 해싱 (SHA-256 + Salt)
 */
function hashPassword(password) {
  const salt = process.env.SALT || 'default_salt_change_this';
  const hash = crypto.createHash('sha256');
  hash.update(password + salt);
  return hash.digest('base64');
}

/**
 * 비밀번호 검증
 */
function verifyPassword(plainPassword, hashedPassword) {
  const hash = hashPassword(plainPassword);
  return hash === hashedPassword;
}

/**
 * 학생 찾기
 */
async function findStudent(studentId) {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 시트 데이터 가져오기 (충분히 넓은 범위)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '학생명단_전체!A:Z'
    });

    const rows = response.data.values;

    if (!rows || rows.length < 2) {
      return {
        found: false,
        error: '데이터가 없습니다.'
      };
    }

    // 헤더 확인
    const headers = rows[0];
    const studentIdCol = headers.indexOf('학번');
    const passwordCol = headers.indexOf('비밀번호');
    const nameCol = headers.indexOf('이름');
    const classCol = headers.indexOf('반');
    const lastChangeDateCol = headers.indexOf('비밀번호변경일');
    const changeCountCol = headers.indexOf('변경횟수');

    if (studentIdCol === -1) {
      return {
        found: false,
        error: '학번 컬럼을 찾을 수 없습니다.'
      };
    }

    // 학생 찾기
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const currentId = String(row[studentIdCol] || '').trim();

      if (currentId === String(studentId).trim()) {
        return {
          found: true,
          row: i + 1, // 1-based index
          studentId: currentId,
          password: passwordCol !== -1 ? String(row[passwordCol] || '') : '',
          name: nameCol !== -1 ? String(row[nameCol] || '') : '',
          class: classCol !== -1 ? String(row[classCol] || '') : '',
          lastChangeDate: lastChangeDateCol !== -1 ? row[lastChangeDateCol] : null,
          changeCount: changeCountCol !== -1 ? Number(row[changeCountCol] || 0) : 0
        };
      }
    }

    return {
      found: false,
      error: '학생을 찾을 수 없습니다.'
    };

  } catch (error) {
    console.error('Find student error:', error);
    return {
      found: false,
      error: error.message
    };
  }
}

/**
 * 24시간 제한 확인
 */
function checkTimeLimit(lastChangeDate) {
  if (!lastChangeDate) {
    return { allowed: true };
  }

  try {
    const now = new Date();
    const lastChange = new Date(lastChangeDate);

    if (isNaN(lastChange.getTime())) {
      return { allowed: true };
    }

    const hoursDiff = (now - lastChange) / (1000 * 60 * 60);
    const CHANGE_LIMIT_HOURS = 24;

    if (hoursDiff < CHANGE_LIMIT_HOURS) {
      const remaining = Math.ceil(CHANGE_LIMIT_HOURS - hoursDiff);
      return {
        allowed: false,
        message: `비밀번호는 24시간에 1회만 변경 가능합니다. (${remaining}시간 후 가능)`
      };
    }

    return { allowed: true };

  } catch (error) {
    console.error('Time check error:', error);
    return {
      allowed: false,
      message: '시간 확인 중 오류 발생'
    };
  }
}

/**
 * 비밀번호 업데이트
 */
async function updatePassword(row, newPasswordHash, currentCount) {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 헤더 가져오기 (충분히 넓은 범위)
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '학생명단_전체!A1:Z1'
    });

    const headers = headerResponse.data.values[0];
    const passwordCol = headers.indexOf('비밀번호') + 1; // 1-based
    const lastChangeDateCol = headers.indexOf('비밀번호변경일') + 1;
    const changeCountCol = headers.indexOf('변경횟수') + 1;

    // 업데이트할 데이터 준비
    const updates = [];

    if (passwordCol > 0) {
      updates.push({
        range: `학생명단_전체!${getColumnLetter(passwordCol)}${row}`,
        values: [[newPasswordHash]]
      });
    }

    if (lastChangeDateCol > 0) {
      updates.push({
        range: `학생명단_전체!${getColumnLetter(lastChangeDateCol)}${row}`,
        values: [[new Date().toISOString()]]
      });
    }

    if (changeCountCol > 0) {
      updates.push({
        range: `학생명단_전체!${getColumnLetter(changeCountCol)}${row}`,
        values: [[(currentCount || 0) + 1]]
      });
    }

    // 일괄 업데이트
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'RAW',
        data: updates
      }
    });

    return { success: true };

  } catch (error) {
    console.error('Update password error:', error);
    throw error;
  }
}

/**
 * 컬럼 번호를 문자로 변환 (1 -> A, 2 -> B, ...)
 */
function getColumnLetter(column) {
  let temp;
  let letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

module.exports = {
  findStudent,
  hashPassword,
  verifyPassword,
  checkTimeLimit,
  updatePassword
};
