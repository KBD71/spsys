/**
 * 평가항목 관리 API
 * GET /api/evaluations - 평가항목 목록 조회
 * POST /api/evaluations - 새 평가항목 생성
 * PUT /api/evaluations/:id - 평가항목 수정
 */

const { getSheetsClient } = require('./sheets');

module.exports = async (req, res) => {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return handleGetEvaluations(req, res);
  }

  if (req.method === 'POST') {
    return handleCreateEvaluation(req, res);
  }

  if (req.method === 'PUT') {
    return handleUpdateEvaluation(req, res);
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
};

/**
 * 평가항목 목록 조회
 */
async function handleGetEvaluations(req, res) {
  try {
    const { teacherClass } = req.query; // 교사의 담당 반 (선택사항)

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 평가항목설정 시트 읽기
    const evaluationResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '평가항목설정!A:H'
    });

    const evaluationData = evaluationResponse.data.values;
    if (!evaluationData || evaluationData.length < 2) {
      return res.status(200).json({
        success: true,
        evaluations: []
      });
    }

    const evaluations = [];
    for (let i = 1; i < evaluationData.length; i++) {
      const row = evaluationData[i];
      
      const evaluation = {
        id: row[0],
        name: row[1],
        description: row[2],
        type: row[3],
        totalPoints: parseInt(row[4]) || 0,
        targetClass: row[5],
        createdDate: row[6],
        status: row[7]
      };

      // 교사 담당 반 필터링 (선택사항)
      if (teacherClass) {
        if (!isClassAllowed(teacherClass, evaluation.targetClass)) {
          continue;
        }
      }

      // 활성 상태만 조회
      if (evaluation.status === '활성') {
        evaluations.push(evaluation);
      }
    }

    return res.status(200).json({
      success: true,
      evaluations: evaluations
    });

  } catch (error) {
    console.error('Get evaluations error:', error);
    return res.status(500).json({
      success: false,
      message: '평가항목 조회 실패: ' + error.message
    });
  }
}

/**
 * 새 평가항목 생성
 */
async function handleCreateEvaluation(req, res) {
  try {
    const { name, description, type, totalPoints, targetClass, items } = req.body;

    if (!name || !type || !totalPoints || !targetClass) {
      return res.status(400).json({
        success: false,
        message: '필수 항목을 모두 입력해주세요.'
      });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 평가ID 생성
    const evaluationResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '평가항목설정!A:A'
    });

    const lastRow = evaluationResponse.data.values?.length || 1;
    const evaluationId = 'E' + String(lastRow).padStart(3, '0');

    // 평가항목설정 시트에 추가
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: '평가항목설정!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          evaluationId,
          name,
          description || '',
          type,
          totalPoints,
          targetClass,
          new Date().toISOString().split('T')[0], // 생성일 (YYYY-MM-DD)
          '활성'
        ]]
      }
    });

    // 세부항목이 있다면 평가세부항목 시트에도 추가
    if (items && items.length > 0) {
      const detailValues = items.map((item, index) => [
        `I${evaluationId.substring(1)}${String(index + 1).padStart(2, '0')}`, // 항목ID
        evaluationId,
        item.name,
        item.points,
        item.criteria || '',
        index + 1 // 순서
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: '평가세부항목!A:F',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: detailValues
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: '평가항목이 생성되었습니다.',
      evaluationId: evaluationId
    });

  } catch (error) {
    console.error('Create evaluation error:', error);
    return res.status(500).json({
      success: false,
      message: '평가항목 생성 실패: ' + error.message
    });
  }
}

/**
 * 평가항목 수정
 */
async function handleUpdateEvaluation(req, res) {
  try {
    const { evaluationId, name, description, type, totalPoints, targetClass, status } = req.body;

    if (!evaluationId) {
      return res.status(400).json({
        success: false,
        message: '평가ID가 필요합니다.'
      });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 기존 평가항목 찾기
    const evaluationResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '평가항목설정!A:H'
    });

    const evaluationData = evaluationResponse.data.values;
    let rowIndex = -1;

    for (let i = 1; i < evaluationData.length; i++) {
      if (evaluationData[i][0] === evaluationId) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }

    if (rowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '평가항목을 찾을 수 없습니다.'
      });
    }

    // 데이터 업데이트
    const updateValues = [
      evaluationId,
      name || evaluationData[rowIndex - 1][1],
      description || evaluationData[rowIndex - 1][2],
      type || evaluationData[rowIndex - 1][3],
      totalPoints || evaluationData[rowIndex - 1][4],
      targetClass || evaluationData[rowIndex - 1][5],
      evaluationData[rowIndex - 1][6], // 생성일 유지
      status || evaluationData[rowIndex - 1][7]
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `평가항목설정!A${rowIndex}:H${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [updateValues]
      }
    });

    return res.status(200).json({
      success: true,
      message: '평가항목이 수정되었습니다.'
    });

  } catch (error) {
    console.error('Update evaluation error:', error);
    return res.status(500).json({
      success: false,
      message: '평가항목 수정 실패: ' + error.message
    });
  }
}

/**
 * 반별 접근 권한 확인 (기존 함수 재사용)
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