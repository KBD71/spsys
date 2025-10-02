/**
 * 환경 변수 테스트용 임시 API
 * SALT 값 확인을 위해
 */

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const salt = process.env.SALT || 'NOT_SET';
  const saltLength = salt.length;
  const saltPreview = salt.substring(0, 10) + '...';

  return res.status(200).json({
    saltExists: !!process.env.SALT,
    saltLength: saltLength,
    saltPreview: saltPreview,
    allEnvKeys: Object.keys(process.env).filter(k => !k.includes('PRIVATE'))
  });
};
