/**
 * 초기 비밀번호 해시 생성 도구
 *
 * 사용법:
 * node generate-password.js [비밀번호]
 *
 * 예시:
 * node generate-password.js 1234
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('❌ 오류: 비밀번호를 입력하세요.');
  console.log('\n사용법: node generate-password.js [비밀번호]');
  console.log('예시: node generate-password.js 1234\n');
  process.exit(1);
}

const SALT = process.env.SALT || '$2a$10$abcdefghijklmnopqrstuv';
const hashedPassword = bcrypt.hashSync(password, SALT);

console.log('\n✅ 비밀번호 해시 생성 완료!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('원본 비밀번호:', password);
console.log('해시값:', hashedPassword);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n📋 이 해시값을 Google Sheets "학생명단_전체"의');
console.log('   "비밀번호" 컬럼에 복사해서 붙여넣으세요.\n');
