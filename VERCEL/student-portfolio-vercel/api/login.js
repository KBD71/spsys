/**
 * 로그인 API 엔드포인트
 * POST /api/login
 */

const { findStudent, verifyPassword } = require('./sheets');

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { studentId, password } = req.body;

    // 입력 검증
    if (!studentId || !password) {
      return res.status(400).json({
        success: false,
        message: '학번과 비밀번호를 입력해주세요.'
      });
    }

    // 학번 형식 검증 (5자리 숫자)
    if (!/^[0-9]{5}$/.test(studentId)) {
      return res.status(400).json({
        success: false,
        message: '학번은 5자리 숫자여야 합니다.'
      });
    }

    // 학생 찾기
    const student = await findStudent(studentId);

    if (!student.found) {
      console.log('Student not found:', studentId);
      return res.status(401).json({
        success: false,
        message: '학번 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // 비밀번호 확인
    if (!student.password) {
      return res.status(401).json({
        success: false,
        message: '비밀번호가 설정되지 않았습니다. 관리자에게 문의하세요.'
      });
    }

    // 비밀번호 검증
    const isValid = verifyPassword(password, student.password);

    if (!isValid) {
      console.log('Invalid password for student:', studentId);
      return res.status(401).json({
        success: false,
        message: '학번 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // 로그인 성공
    console.log('Login successful:', studentId);
    return res.status(200).json({
      success: true,
      message: '로그인 성공',
      studentId: student.studentId,
      name: student.name,
      class: student.class
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};
