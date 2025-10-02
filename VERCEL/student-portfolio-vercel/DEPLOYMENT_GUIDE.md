# Vercel 배포 완벽 가이드

학생 포트폴리오 시스템을 Vercel에 배포하는 단계별 가이드입니다.

---

## 📋 배포 전 체크리스트

- [ ] Google 계정
- [ ] Vercel 계정 (또는 GitHub 계정)
- [ ] Git 설치
- [ ] Node.js 18+ 설치

---

## 🚀 1단계: Google Cloud 설정 (10분)

### 1-1. Google Cloud Console 접속

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 로그인

### 1-2. 새 프로젝트 생성

1. 상단 프로젝트 선택 → **새 프로젝트**
2. 프로젝트 이름: `student-portfolio`
3. **만들기** 클릭

### 1-3. Google Sheets API 활성화

1. **API 및 서비스** → **API 라이브러리**
2. 검색: `Google Sheets API`
3. **사용** 클릭

### 1-4. 서비스 계정 생성

1. **API 및 서비스** → **사용자 인증 정보**
2. **사용자 인증 정보 만들기** → **서비스 계정**
3. 입력:
   - 서비스 계정 이름: `vercel-sheets-access`
   - 서비스 계정 ID: 자동 생성
   - 서비스 계정 설명: `Vercel에서 Sheets 접근`
4. **만들고 계속하기**

### 1-5. 역할 부여

1. 역할 선택: **편집자** (Editor)
2. **계속**
3. **완료**

### 1-6. JSON 키 다운로드

1. 생성된 서비스 계정 클릭
2. **키** 탭 → **키 추가** → **새 키 만들기**
3. 키 유형: **JSON**
4. **만들기** 클릭
5. JSON 파일 다운로드됨 (안전하게 보관!)

---

## 📊 2단계: Google Sheets 설정 (5분)

### 2-1. 새 스프레드시트 생성

1. [Google Sheets](https://sheets.google.com) 접속
2. **빈 스프레드시트** 클릭
3. 파일 이름: `학생 포트폴리오 시스템`

### 2-2. 시트 이름 설정

1. 하단 시트 탭 더블클릭
2. 이름: `학생명단_전체`

### 2-3. 헤더 작성

첫 번째 행에 입력:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| 학번 | 이름 | 반 | 비밀번호 | 이메일 | 비밀번호변경일 | 변경횟수 |

### 2-4. 예시 데이터 입력 (테스트용)

```
학번       이름    반     비밀번호    이메일              비밀번호변경일  변경횟수
20240101  홍길동   1-1              hong@school.com
20240102  김철수   1-2              kim@school.com
```

> ⚠️ **중요**: 비밀번호 컬럼은 비워두세요! (API가 자동으로 해싱합니다)

### 2-5. 서비스 계정에 공유

1. 우측 상단 **공유** 버튼 클릭
2. JSON 키 파일에서 `client_email` 값 복사
   ```json
   "client_email": "vercel-sheets-access@student-portfolio.iam.gserviceaccount.com"
   ```
3. 해당 이메일 입력
4. 권한: **편집자**
5. **보내기** 클릭

### 2-6. Spreadsheet ID 복사

브라우저 URL에서 ID 복사:
```
https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
```

---

## 💻 3단계: 로컬 설정 (5분)

### 3-1. 프로젝트 폴더 확인

```bash
cd Desktop/student-portfolio-vercel
```

### 3-2. 의존성 설치

```bash
npm install
```

### 3-3. 환경 변수 설정

`.env` 파일 생성:

```bash
cp .env.example .env
```

`.env` 파일 편집:

```env
# JSON 키 파일에서 복사
GOOGLE_SERVICE_ACCOUNT_EMAIL=vercel-sheets-access@student-portfolio.iam.gserviceaccount.com

# JSON 키 파일의 private_key 복사 (그대로!)
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQ...\n-----END PRIVATE KEY-----\n"

# Google Sheets URL에서 복사
SPREADSHEET_ID=1abc123def456ghi789jkl

# 랜덤 Salt 생성
SALT=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### 3-4. Salt 생성

터미널에서:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

출력된 값을 `.env`의 `SALT`에 복사

---

## 🧪 4단계: 로컬 테스트 (5분)

### 4-1. 초기 비밀번호 설정

테스트 학생의 비밀번호를 먼저 설정해야 합니다.

**방법 1: 직접 해시 생성**

```bash
node -e "
const crypto = require('crypto');
const salt = 'YOUR_SALT_HERE';
const password = 'test1234';
const hash = crypto.createHash('sha256');
hash.update(password + salt);
console.log(hash.digest('base64'));
"
```

출력된 해시를 Google Sheets 비밀번호 컬럼에 복사

**방법 2: API로 설정 (추천)**

임시 API 엔드포인트 생성 후 호출 (배포 후 삭제)

### 4-2. 로컬 서버 시작

```bash
npm run dev
```

출력:
```
Vercel CLI 25.0.0
> Ready! Available at http://localhost:3000
```

### 4-3. 브라우저 테스트

1. `http://localhost:3000` 접속
2. 로그인:
   - 학번: `20240101`
   - 비밀번호: `test1234`
3. 로그인 성공 확인
4. 비밀번호 변경 테스트

---

## 🌐 5단계: Vercel 배포 (10분)

### 5-1. GitHub 저장소 생성

1. [GitHub](https://github.com/new) 접속
2. 저장소 이름: `student-portfolio-vercel`
3. **Public** 선택
4. **Create repository**

### 5-2. Git 초기화 및 푸시

```bash
# Git 초기화
git init

# 파일 추가
git add .

# 커밋
git commit -m "Initial commit: Vercel 학생 포트폴리오 시스템"

# 원격 저장소 연결
git remote add origin https://github.com/[username]/student-portfolio-vercel.git

# 푸시
git branch -M main
git push -u origin main
```

### 5-3. Vercel 계정 생성

1. [Vercel](https://vercel.com) 접속
2. **Sign Up with GitHub** 클릭
3. GitHub 권한 승인

### 5-4. 프로젝트 Import

1. Vercel 대시보드 → **Add New...** → **Project**
2. **Import Git Repository**
3. `student-portfolio-vercel` 저장소 선택
4. **Import** 클릭

### 5-5. 환경 변수 설정

**Environment Variables** 섹션에서 추가:

```
Name: GOOGLE_SERVICE_ACCOUNT_EMAIL
Value: [JSON 키 파일의 client_email]

Name: GOOGLE_PRIVATE_KEY
Value: [JSON 키 파일의 private_key 그대로 복사]

Name: SPREADSHEET_ID
Value: [Google Sheets ID]

Name: SALT
Value: [생성한 Salt]
```

모든 환경: **Production, Preview, Development** 체크

### 5-6. 배포 시작

**Deploy** 버튼 클릭

빌드 로그 확인:
```
Installing dependencies...
Building...
Deploying...
Success!
```

### 5-7. URL 확인

배포 완료 후:
```
https://student-portfolio-vercel-[random].vercel.app
```

---

## ✅ 6단계: 배포 확인 (5분)

### 6-1. 웹사이트 접속

1. Vercel URL 클릭
2. 로그인 화면 확인

### 6-2. 로그인 테스트

1. 학번: `20240101`
2. 비밀번호: `test1234`
3. 로그인 성공 확인

### 6-3. 비밀번호 변경 테스트

1. **비밀번호 변경** 클릭
2. 현재 비밀번호: `test1234`
3. 새 비밀번호: `new5678`
4. 변경 성공 확인

### 6-4. 24시간 제한 테스트

1. 비밀번호 변경 직후 다시 시도
2. "24시간에 1회만 변경 가능" 메시지 확인

---

## 🎨 7단계: 커스텀 도메인 (선택)

### 7-1. 도메인 구매

예: `student-portfolio.com`

### 7-2. Vercel에 도메인 추가

1. Vercel 프로젝트 → **Settings** → **Domains**
2. **Add** 클릭
3. 도메인 입력
4. **Add** 클릭

### 7-3. DNS 설정

도메인 제공업체에서:

```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

### 7-4. HTTPS 활성화

자동으로 SSL 인증서 발급 (약 24시간 소요)

---

## 🔧 8단계: 학생 계정 설정 (필수)

### 8-1. 학생 데이터 입력

Google Sheets에 학생 정보 입력:

```
학번       이름    반     비밀번호    이메일
20240101  홍길동   1-1              hong@school.com
20240102  김철수   1-2              kim@school.com
...
```

### 8-2. 초기 비밀번호 해싱

**방법 1: Node.js 스크립트**

`scripts/hash-password.js` 생성:

```javascript
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const salt = process.env.SALT || 'your_salt_here';

rl.question('비밀번호 입력: ', (password) => {
  const hash = crypto.createHash('sha256');
  hash.update(password + salt);
  console.log('해시:', hash.digest('base64'));
  rl.close();
});
```

실행:
```bash
node scripts/hash-password.js
```

**방법 2: 일괄 설정 API** (추천)

임시 API 엔드포인트 생성:

`api/admin/bulk-set-password.js`:

```javascript
// ⚠️ 초기 설정 후 즉시 삭제!
const { hashPassword, updatePassword, findStudent } = require('../sheets');

module.exports = async (req, res) => {
  // 보안: 특정 비밀번호로만 접근 가능
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== 'YOUR_SECRET_ADMIN_KEY_HERE') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { studentId, password } = req.body;

  const student = await findStudent(studentId);
  if (!student.found) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const hash = hashPassword(password);
  await updatePassword(student.row, hash, 0);

  return res.json({ success: true });
};
```

사용:
```bash
curl -X POST https://your-domain.vercel.app/api/admin/bulk-set-password \
  -H "X-Admin-Key: YOUR_SECRET_ADMIN_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"20240101","password":"temp1234"}'
```

**⚠️ 중요: 모든 비밀번호 설정 후 이 API 삭제!**

---

## 📱 9단계: 학생들에게 안내

### 9-1. 공지사항 작성

```
📚 학생 포트폴리오 시스템 안내

🌐 접속 주소:
https://student-portfolio-vercel-[random].vercel.app

또는
https://student-portfolio.com (커스텀 도메인 설정 시)

📌 로그인 정보:
- 학번: 5자리 학번
- 초기 비밀번호: [개별 안내]

⚠️ 주의사항:
1. 첫 로그인 후 반드시 비밀번호를 변경하세요
2. 비밀번호는 24시간에 한 번만 변경 가능합니다
3. 비밀번호를 잊어버린 경우 담당 선생님께 문의하세요

💡 권장 비밀번호:
- 최소 8자 이상
- 영문 + 숫자 조합
- 추측하기 어려운 비밀번호

📱 모바일에서도 사용 가능합니다!
```

### 9-2. QR 코드 생성 (선택)

1. [QR 코드 생성기](https://www.qr-code-generator.com) 접속
2. URL 입력
3. QR 코드 다운로드
4. 교실에 게시

---

## 🔄 10단계: 업데이트 배포

### 코드 수정 후 배포

```bash
# 변경 사항 확인
git status

# 파일 추가
git add .

# 커밋
git commit -m "Update: 기능 개선"

# 푸시
git push origin main
```

Vercel이 자동으로:
1. 변경 감지
2. 빌드 시작
3. 배포 완료 (약 1-2분)

---

## ⚠️ 문제 해결

### 1. "Service account not found"

**원인:** 환경 변수 `GOOGLE_SERVICE_ACCOUNT_EMAIL` 오류

**해결:**
1. Vercel → Settings → Environment Variables
2. `GOOGLE_SERVICE_ACCOUNT_EMAIL` 값 확인
3. JSON 키 파일의 `client_email` 값과 일치하는지 확인

### 2. "Permission denied accessing spreadsheet"

**원인:** 서비스 계정에 시트 공유 안됨

**해결:**
1. Google Sheets 열기
2. 공유 → 서비스 계정 이메일 추가
3. **편집자** 권한 부여

### 3. "Invalid private key format"

**원인:** `GOOGLE_PRIVATE_KEY` 형식 오류

**해결:**
- JSON 키 파일의 `private_key` 값을 **그대로** 복사
- `\n`이 문자열로 있어야 함 (실제 줄바꿈 아님)
- 예: `"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"`

### 4. 로그인 실패 (비밀번호 불일치)

**원인:** 비밀번호 해싱 시 Salt가 다름

**해결:**
1. `.env` 파일의 `SALT` 확인
2. Vercel 환경 변수의 `SALT` 확인
3. 동일한지 확인
4. 비밀번호 재설정

### 5. 빌드 실패

**원인:** 의존성 설치 오류

**해결:**
```bash
# 로컬에서 테스트
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 6. CORS 에러

**원인:** 브라우저 CORS 정책

**해결:**
- API 파일에 CORS 헤더 이미 설정되어 있음
- 문제 지속 시: Vercel 로그 확인

---

## 📊 모니터링

### Vercel 대시보드

1. **Analytics**: 방문자 통계
2. **Logs**: 실시간 로그
3. **Performance**: 응답 시간

### 로그 확인

```bash
# 실시간 로그
vercel logs --follow

# 특정 배포 로그
vercel logs [deployment-url]
```

### Google Sheets 활동

1. Google Sheets → 파일 → 버전 기록
2. 변경 사항 확인

---

## 🎉 배포 완료!

**체크리스트:**

- [x] Google Cloud 설정
- [x] Google Sheets 생성 및 공유
- [x] 로컬 테스트 성공
- [x] Vercel 배포 성공
- [x] 환경 변수 설정
- [x] 학생 계정 생성
- [x] 초기 비밀번호 설정
- [x] 학생들에게 안내

**다음 단계:**

1. ✅ 정기 백업 (Google Sheets 복사)
2. ✅ 모니터링 (Vercel 로그)
3. ✅ 학생 피드백 수집

**성공적인 운영을 기원합니다! 🚀**
