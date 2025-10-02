/**
 * 비밀번호 해시 생성 API (Vercel Production SALT 사용)
 * GET /api/generate-hash?password=1234
 */

const { hashPassword } = require('./sheets');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const password = req.query.password || req.body?.password;

  if (!password) {
    return res.status(400).json({
      error: 'Password parameter required',
      usage: '/api/generate-hash?password=YOUR_PASSWORD'
    });
  }

  const hash = hashPassword(password);
  const salt = process.env.SALT || 'NOT_SET';

  return res.status(200).json({
    password: password,
    hash: hash,
    saltPreview: salt.substring(0, 20) + '...',
    saltLength: salt.length,
    instruction: 'Copy this hash to Google Sheets password column'
  });
};
