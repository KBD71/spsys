/**
 * 평가항목 관리 API
 * 교사 기능 제거됨 - 이 엔드포인트는 더 이상 사용되지 않습니다.
 */

module.exports = async (req, res) => {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(410).json({
    success: false,
    message: 'This endpoint has been disabled. Teacher management features have been removed.'
  });
};

