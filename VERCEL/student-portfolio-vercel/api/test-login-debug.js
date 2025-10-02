/**
 * 로그인 디버깅용 API
 */

const { findStudent, hashPassword } = require('./sheets');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const studentId = '10101';
    const password = '1234';

    const student = await findStudent(studentId);
    const expectedHash = hashPassword(password);

    return res.status(200).json({
      studentFound: student.found,
      storedHashLength: student.password ? student.password.length : 0,
      storedHashPreview: student.password ? student.password.substring(0, 20) + '...' : 'N/A',
      expectedHashLength: expectedHash.length,
      expectedHashPreview: expectedHash.substring(0, 20) + '...',
      match: student.password === expectedHash,
      storedHash: student.password,
      expectedHash: expectedHash
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};
