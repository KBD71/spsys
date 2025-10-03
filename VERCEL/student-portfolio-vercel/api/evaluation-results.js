/**
 * 평가 결과 관리 API
 * GET /api/evaluation-results/my?studentId={학번} - 학생 개인 평가 결과 조회
 * (교사 기능 제거됨)
 */

const { getSheetsClient } = require('./sheets');

module.exports = async (req, res) => {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // 학생 개인 결과 조회만 지원
    if (req.url.includes('/my')) {
      return handleGetMyEvaluations(req, res);
    } else {
      return res.status(410).json({
        success: false,
        message: 'Teacher evaluation management has been disabled.'
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
};


/**
 * 학생 개인 평가 결과 조회
 */
async function handleGetMyEvaluations(req, res) {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: '학번이 필요합니다.'
      });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 학생의 평가 결과 조회
    const resultResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '평가결과!A:H'
    });

    const resultData = resultResponse.data.values || [];
    const studentResults = resultData.filter((row, index) => {
      if (index === 0) return false; // 헤더 제외
      return row[1] === studentId; // 학번 매칭
    });

    // 평가항목 정보 조회
    const evaluationResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '평가항목설정!A:H'
    });

    const evaluationData = evaluationResponse.data.values || [];
    const evaluations = {};
    evaluationData.forEach((row, index) => {
      if (index === 0) return;
      evaluations[row[0]] = {
        name: row[1],
        description: row[2],
        type: row[3],
        totalPoints: parseInt(row[4]) || 0
      };
    });

    // 세부항목 정보 조회
    const detailResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '평가세부항목!A:F'
    });

    const detailData = detailResponse.data.values || [];
    const items = {};
    detailData.forEach((row, index) => {
      if (index === 0) return;
      items[row[0]] = {
        evaluationId: row[1],
        name: row[2],
        points: parseInt(row[3]) || 0
      };
    });

    // 결과 데이터 정리
    const myEvaluations = {};
    studentResults.forEach(row => {
      const evaluationId = row[2];
      const itemId = row[3];
      const score = parseFloat(row[4]) || 0;
      const comment = row[5] || '';
      const evaluateDate = row[6] || '';

      if (!myEvaluations[evaluationId]) {
        myEvaluations[evaluationId] = {
          ...evaluations[evaluationId],
          items: [],
          totalScore: 0,
          maxScore: 0,
          evaluateDate: evaluateDate
        };
      }

      if (items[itemId]) {
        myEvaluations[evaluationId].items.push({
          name: items[itemId].name,
          score: score,
          maxPoints: items[itemId].points,
          comment: comment
        });
        myEvaluations[evaluationId].totalScore += score;
        myEvaluations[evaluationId].maxScore += items[itemId].points;
      }
    });

    return res.status(200).json({
      success: true,
      evaluations: Object.values(myEvaluations)
    });

  } catch (error) {
    console.error('Get my evaluations error:', error);
    return res.status(500).json({
      success: false,
      message: '평가 결과 조회 실패: ' + error.message
    });
  }
}

/**
 * 반별 접근 권한 확인
 */
function isClassAllowed(studentClass, targetClass) {
  if (!targetClass || targetClass === '전체') {
    return true;
  }

  if (targetClass.includes('학년')) {
    const targetGrade = targetClass.replace('학년', '');
    const studentGrade = studentClass.split('-')[0];
    return studentGrade === targetGrade;
  }

  const allowedClasses = targetClass.split(',').map(cls => cls.trim());
  return allowedClasses.includes(studentClass);
}