/**
 * 환경변수 테스트 API
 * URL: /api/test-env
 */

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const result = {
    timestamp: new Date().toISOString(),
    env: {
      hasGoogleEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasGoogleKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasSpreadsheetId: !!process.env.SPREADSHEET_ID,
      googleEmailLength: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.length || 0,
      googleKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
      spreadsheetIdLength: process.env.SPREADSHEET_ID?.length || 0,
      nodeVersion: process.version,
      platform: process.platform
    }
  };

  // GOOGLE_PRIVATE_KEY 형식 확인
  if (process.env.GOOGLE_PRIVATE_KEY) {
    const key = process.env.GOOGLE_PRIVATE_KEY;
    result.env.keyStartsWith = key.substring(0, 30);
    result.env.keyEndsWith = key.substring(key.length - 30);
    result.env.hasNewlines = key.includes('\\n');
  }

  return res.status(200).json(result);
};
