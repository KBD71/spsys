/**
 * 캐시 무효화 API
 * URL: /api/clear-cache?studentId=10103
 * 또는: /api/clear-cache?all=true (전체 캐시 삭제)
 */
const { clearCache, getCacheKey } = require('./cache');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { studentId, all } = req.query;
    const clearedKeys = [];

    if (all === 'true') {
      // Vercel KV 사용 시 전체 삭제는 어려우므로, 주요 캐시만 삭제
      console.log('[clear-cache] 전체 캐시 삭제는 지원되지 않습니다. studentId를 지정하세요.');
      return res.status(400).json({
        success: false,
        message: 'studentId 파라미터가 필요합니다. 예: /api/clear-cache?studentId=10103'
      });
    }

    if (studentId) {
      // 해당 학생의 모든 캐시 삭제
      const keysToDelete = [
        getCacheKey('myRecords', { studentId }),
        getCacheKey('assignments', { studentId })
      ];

      for (const key of keysToDelete) {
        clearCache(key);
        clearedKeys.push(key);
      }

      console.log(`[clear-cache] 캐시 삭제 완료 - 학번: ${studentId}, 삭제된 키: ${clearedKeys.length}개`);

      return res.status(200).json({
        success: true,
        message: `학번 ${studentId}의 캐시가 삭제되었습니다.`,
        clearedKeys: clearedKeys,
        count: clearedKeys.length
      });
    }

    return res.status(400).json({
      success: false,
      message: 'studentId 파라미터가 필요합니다. 예: /api/clear-cache?studentId=10103'
    });

  } catch (error) {
    console.error('[clear-cache] 에러:', error);
    return res.status(500).json({
      success: false,
      message: '캐시 삭제 중 오류가 발생했습니다: ' + error.message
    });
  }
};
