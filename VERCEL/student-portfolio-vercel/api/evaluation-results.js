/**
 * 평가 결과 관리 API
 * GET /api/evaluation-results?evaluationId={평가ID} - 평가 대상 학생 및 기존 결과 조회
 * POST /api/evaluation-results - 평가 결과 입력/수정
 * GET /api/evaluation-results/my?studentId={학번} - 학생 개인 평가 결과 조회
 */

const { getSheetsClient } = require('./sheets');

module.exports = async (req, res) => {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // 학생 개인 결과 조회 vs 교사용 평가 대상 조회
    if (req.url.includes('/my')) {
      return handleGetMyEvaluations(req, res);
    } else {
      return handleGetEvaluationTargets(req, res);
    }
  }

  if (req.method === 'POST') {
    return handleSaveEvaluationResults(req, res);
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
};

/**
 * 평가 대상 학생 목록 및 기존 결과 조회 (교사용)
 */
async function handleGetEvaluationTargets(req, res) {
  try {
    const { evaluationId } = req.query;

    if (!evaluationId) {
      return res.status(400).json({
        success: false,
        message: '평가ID가 필요합니다.'
      });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 평가항목 정보 조회
    const evaluationResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '평가항목설정!A:H'
    });

    const evaluationData = evaluationResponse.data.values;
    const evaluation = evaluationData.find(row => row[0] === evaluationId);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: '평가항목을 찾을 수 없습니다.'
      });
    }

    const targetClass = evaluation[5]; // 대상반

    // 평가 세부항목 조회
    const detailResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '평가세부항목!A:F'
    });

    const detailData = detailResponse.data.values || [];
    const items = detailData
      .filter(row => row[1] === evaluationId)
      .sort((a, b) => parseInt(a[5]) - parseInt(b[5])) // 순서대로 정렬
      .map(row => ({
        itemId: row[0],
        name: row[2],
        points: parseInt(row[3]) || 0,
        criteria: row[4]
      }));

    // 대상 학생 목록 조회
    const studentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '학생명단_전체!A:C'
    });

    const studentData = studentResponse.data.values || [];
    const targetStudents = studentData
      .filter((row, index) => {
        if (index === 0) return false; // 헤더 제외
        const studentClass = row[2];
        return isClassAllowed(studentClass, targetClass);
      })
      .map(row => ({
        studentId: row[0],
        name: row[1],
        class: row[2]
      }));

    // 기존 평가 결과 조회
    const resultResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '평가결과!A:H'
    });

    const resultData = resultResponse.data.values || [];
    const existingResults = {};

    resultData.forEach((row, index) => {
      if (index === 0) return; // 헤더 제외
      const studentId = row[1];
      const itemId = row[3];
      const score = parseFloat(row[4]) || 0;
      const comment = row[5] || '';

      if (!existingResults[studentId]) {
        existingResults[studentId] = {};
      }
      existingResults[studentId][itemId] = {
        score: score,
        comment: comment
      };
    });

    return res.status(200).json({
      success: true,
      evaluation: {
        id: evaluation[0],
        name: evaluation[1],
        description: evaluation[2],
        type: evaluation[3],
        totalPoints: parseInt(evaluation[4]) || 0
      },
      items: items,
      students: targetStudents,
      existingResults: existingResults
    });

  } catch (error) {
    console.error('Get evaluation targets error:', error);
    return res.status(500).json({
      success: false,
      message: '평가 대상 조회 실패: ' + error.message
    });
  }
}

/**
 * 평가 결과 저장
 */
async function handleSaveEvaluationResults(req, res) {
  try {
    const { evaluationId, results, teacherName } = req.body;

    if (!evaluationId || !results || !Array.isArray(results)) {
      return res.status(400).json({
        success: false,
        message: '필수 데이터가 누락되었습니다.'
      });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const today = new Date().toISOString().split('T')[0];
    const newRows = [];

    // 기존 결과 삭제를 위해 전체 데이터 조회
    const existingResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '평가결과!A:H'
    });

    const existingData = existingResponse.data.values || [];
    const filteredData = existingData.filter((row, index) => {
      if (index === 0) return true; // 헤더 유지
      return row[2] !== evaluationId; // 해당 평가ID 제외
    });

    // 결과ID 생성을 위한 카운터
    let resultCounter = filteredData.length;

    // 새 결과 데이터 생성
    results.forEach(result => {
      const { studentId, itemId, score, comment } = result;
      
      if (score !== undefined && score !== null && score !== '') {
        const resultId = 'R' + String(++resultCounter).padStart(3, '0');
        
        newRows.push([
          resultId,
          studentId,
          evaluationId,
          itemId,
          score,
          comment || '',
          today,
          teacherName || ''
        ]);
      }
    });

    // 전체 데이터 업데이트 (기존 데이터 + 새 데이터)
    const allData = [...filteredData, ...newRows];

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: '평가결과!A:H'
    });

    if (allData.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: '평가결과!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: allData
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: '평가 결과가 저장되었습니다.',
      savedCount: newRows.length
    });

  } catch (error) {
    console.error('Save evaluation results error:', error);
    return res.status(500).json({
      success: false,
      message: '평가 결과 저장 실패: ' + error.message
    });
  }
}

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