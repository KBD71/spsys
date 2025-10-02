// 비밀번호 해싱 도구
require('dotenv').config();
const crypto = require('crypto');

function hashPassword(password) {
  const salt = process.env.SALT || 'default_salt';
  const hash = crypto.createHash('sha256');
  hash.update(password + salt);
  return hash.digest('base64');
}

// 명령줄 인수로 비밀번호 받기
const password = process.argv[2];

if (!password) {
  console.log('\n사용법: node hash-password.js <비밀번호>\n');
  console.log('예시: node hash-password.js test1234\n');
  process.exit(1);
}

const hashed = hashPassword(password);
console.log('\n=== 비밀번호 해싱 결과 ===\n');
console.log('원본 비밀번호:', password);
console.log('해시 값:', hashed);
console.log('\n이 해시 값을 Google Sheets의 "비밀번호" 열에 입력하세요.\n');
