/**
 * 비밀번호 변경 API 엔드포인트
 * POST /api/change-password
 */

const { findStudent, verifyPassword, hashPassword, checkTimeLimit, updatePassword } = require('./sheets');

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
    const { studentId, currentPassword, newPassword } = req.body;

    // 입력 검증
    if (!studentId || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '모든 필드를 입력해주세요.'
      });
    }

    // 학번 형식 검증
    if (!/^[0-9]{5}$/.test(studentId)) {
      return res.status(400).json({
        success: false,
        message: '학번은 5자리 숫자여야 합니다.'
      });
    }

    // 비밀번호 길이 검증
    const trimmedNew = newPassword.trim();

    if (trimmedNew.length < 4) {
      return res.status(400).json({
        success: false,
        message: '새 비밀번호는 최소 4자 이상이어야 합니다.'
      });
    }

    if (trimmedNew.length > 20) {
      return res.status(400).json({
        success: false,
        message: '새 비밀번호는 최대 20자까지 가능합니다.'
      });
    }

    // 학생 찾기
    const student = await findStudent(studentId);

    if (!student.found) {
      console.log('Student not found:', studentId);
      return res.status(404).json({
        success: false,
        message: '학생 정보를 찾을 수 없습니다.'
      });
    }

    // 현재 비밀번호 확인
    const isValidCurrent = verifyPassword(currentPassword, student.password);

    if (!isValidCurrent) {
      console.log('Invalid current password for student:', studentId);
      return res.status(401).json({
        success: false,
        message: '현재 비밀번호가 올바르지 않습니다.'
      });
    }

    // 새 비밀번호가 현재와 같은지 확인
    if (verifyPassword(trimmedNew, student.password)) {
      return res.status(400).json({
        success: false,
        message: '새 비밀번호는 현재 비밀번호와 달라야 합니다.'
      });
    }

    // 24시간 제한 확인
    const timeCheck = checkTimeLimit(student.lastChangeDate);

    if (!timeCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: timeCheck.message
      });
    }

    // 비밀번호 해싱
    const newHash = hashPassword(trimmedNew);

    // 비밀번호 업데이트
    await updatePassword(student.row, newHash, student.changeCount);

    console.log('Password changed successfully for student:', studentId);

    return res.status(200).json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: '비밀번호 변경 중 오류가 발생했습니다.'
    });
  }
};
