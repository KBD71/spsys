/**
 * 메뉴 시트 관리 API
 * GET /api/menu - 메뉴 정보 조회
 * POST /api/menu/admin - 관리자 정보 업데이트
 * POST /api/menu/stats - 통계 업데이트
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
    return handleGetMenuInfo(req, res);
  }

  if (req.method === 'POST') {
    if (req.url.includes('/admin')) {
      return handleUpdateAdmin(req, res);
    } else if (req.url.includes('/stats')) {
      return handleUpdateStats(req, res);
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
};

/**
 * 메뉴 정보 조회
 */
async function handleGetMenuInfo(req, res) {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 메뉴 시트 조회
    const menuResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '메뉴!A:D'
    });

    const menuData = menuResponse.data.values;
    if (!menuData) {
      return res.status(404).json({
        success: false,
        message: '메뉴 시트를 찾을 수 없습니다.'
      });
    }

    // 관리자 정보 추출
    const adminInfo = {};
    const systemStats = {};

    menuData.forEach((row, index) => {
      if (index === 0) return; // 헤더 제외
      
      const [항목, 값, 설명, 수정일] = row;
      
      if (항목 === '관리자 ID') {
        adminInfo.id = 값;
        adminInfo.lastModified = 수정일;
      } else if (항목 === '관리자 비밀번호') {
        adminInfo.passwordSet = !!값;
      } else if (항목 === '시스템 상태') {
        adminInfo.systemStatus = 값;
      }
    });

    // 시트 목록 정보
    const sheets_info = await sheets.spreadsheets.get({
      spreadsheetId
    });

    const sheetList = sheets_info.data.sheets.map(sheet => ({
      name: sheet.properties.title,
      id: sheet.properties.sheetId,
      rowCount: sheet.properties.gridProperties?.rowCount || 0,
      columnCount: sheet.properties.gridProperties?.columnCount || 0
    }));

    // 통계 계산
    const stats = await calculateSystemStats(sheets, spreadsheetId);

    return res.status(200).json({
      success: true,
      adminInfo: adminInfo,
      sheetList: sheetList,
      stats: stats
    });

  } catch (error) {
    console.error('Get menu info error:', error);
    return res.status(500).json({
      success: false,
      message: '메뉴 정보 조회 실패: ' + error.message
    });
  }
}

/**
 * 관리자 정보 업데이트
 */
async function handleUpdateAdmin(req, res) {
  try {
    const { adminId, adminPassword } = req.body;

    if (!adminId && !adminPassword) {
      return res.status(400).json({
        success: false,
        message: '업데이트할 관리자 정보를 입력해주세요.'
      });
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const currentDate = new Date().toISOString().split('T')[0];

    // 관리자 ID 업데이트
    if (adminId) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: '메뉴!B5:D5',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[adminId, '교사용 로그인 아이디', currentDate]]
        }
      });
    }

    // 관리자 비밀번호 업데이트
    if (adminPassword) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: '메뉴!B6:D6',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[adminPassword, '교사용 로그인 비밀번호', currentDate]]
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: '관리자 정보가 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('Update admin error:', error);
    return res.status(500).json({
      success: false,
      message: '관리자 정보 업데이트 실패: ' + error.message
    });
  }
}

/**
 * 통계 업데이트
 */
async function handleUpdateStats(req, res) {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // 통계 계산
    const stats = await calculateSystemStats(sheets, spreadsheetId);
    const currentTime = new Date().toLocaleString('ko-KR');

    // 통계 업데이트
    const statsData = [
      [stats.totalStudents, currentTime],
      [stats.totalAssignments, currentTime],
      [stats.totalEvaluations, currentTime],
      [stats.totalSubmissions, currentTime],
      [stats.totalSheets, currentTime]
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: '메뉴!B30:C34',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: statsData
      }
    });

    return res.status(200).json({
      success: true,
      message: '통계가 업데이트되었습니다.',
      stats: stats
    });

  } catch (error) {
    console.error('Update stats error:', error);
    return res.status(500).json({
      success: false,
      message: '통계 업데이트 실패: ' + error.message
    });
  }
}

/**
 * 시스템 통계 계산
 */
async function calculateSystemStats(sheets, spreadsheetId) {
  const stats = {
    totalStudents: 0,
    totalAssignments: 0,
    totalEvaluations: 0,
    totalSubmissions: 0,
    totalSheets: 0
  };

  try {
    // 시트 개수
    const sheetsInfo = await sheets.spreadsheets.get({ spreadsheetId });
    stats.totalSheets = sheetsInfo.data.sheets.length;

    // 학생 수
    try {
      const studentResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '학생명단_전체!A:A'
      });
      stats.totalStudents = Math.max(0, (studentResponse.data.values?.length || 1) - 1);
    } catch (e) {
      console.log('학생명단_전체 시트 없음');
    }

    // 과제 수
    try {
      const assignmentResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '과제목록!A:A'
      });
      stats.totalAssignments = Math.max(0, (assignmentResponse.data.values?.length || 1) - 1);
    } catch (e) {
      console.log('과제목록 시트 없음');
    }

    // 평가 수
    try {
      const evaluationResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '평가항목설정!A:A'
      });
      stats.totalEvaluations = Math.max(0, (evaluationResponse.data.values?.length || 1) - 1);
    } catch (e) {
      console.log('평가항목설정 시트 없음');
    }

    // 제출 수
    try {
      const submissionResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '제출현황!A:A'
      });
      stats.totalSubmissions = Math.max(0, (submissionResponse.data.values?.length || 1) - 1);
    } catch (e) {
      console.log('제출현황 시트 없음');
    }

  } catch (error) {
    console.error('통계 계산 오류:', error);
  }

  return stats;
}