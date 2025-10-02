# 학생 포트폴리오 시스템 - Vercel 배포판

Google Sheets와 Vercel Serverless Functions를 사용한 학생 비밀번호 관리 시스템입니다.

## ✨ 특징

- ✅ **완전 독립적** - Google Apps Script 불필요
- ✅ **Vercel 배포** - 자동 HTTPS, 글로벌 CDN
- ✅ **Google Sheets API** - 직접 연동
- ✅ **커스텀 도메인** - 자유롭게 설정 가능
- ✅ **높은 할당량** - 일 500,000 요청
- ✅ **보안 강화** - 환경 변수로 키 관리

---

## 🚀 빠른 시작

### 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성: `student-portfolio`
3. **Google Sheets API** 활성화
4. **서비스 계정** 생성:
   - 이름: `vercel-sheets-access`
   - 역할: 편집자
   - JSON 키 다운로드

### 2. Google Sheets 설정

1. Google Sheets 생성
2. 시트 이름: `학생명단_전체`
3. 헤더: `학번 | 이름 | 반 | 비밀번호 | 이메일 | 비밀번호변경일 | 변경횟수`
4. **중요**: 서비스 계정 이메일로 시트 공유 (편집자 권한)

### 3. 로컬 설정

```bash
# 프로젝트 클론
git clone <your-repo-url>
cd student-portfolio-vercel

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어서 실제 값 입력
```

### 4. 환경 변수 설정

`.env` 파일:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SPREADSHEET_ID=your_spreadsheet_id_here
SALT=your_random_salt_string
```

### 5. 로컬 테스트

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 6. Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 배포
vercel --prod
```

### 7. Vercel 환경 변수 설정

Vercel 대시보드에서:
1. Project → Settings → Environment Variables
2. 다음 변수 추가:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `SPREADSHEET_ID`
   - `SALT`

---

## 📁 파일 구조

```
student-portfolio-vercel/
├── index.html              # 프론트엔드 (fetch API 사용)
├── api/
│   ├── login.js           # 로그인 API
│   ├── change-password.js # 비밀번호 변경 API
│   └── sheets.js          # Google Sheets 연동
├── package.json           # 의존성
├── vercel.json            # Vercel 설정
├── .env.example           # 환경 변수 예시
├── .gitignore             # Git 제외 파일
└── README.md              # 이 파일
```

---

## 🔑 API 엔드포인트

### POST /api/login

**요청:**
```json
{
  "studentId": "20240101",
  "password": "test1234"
}
```

**응답 (성공):**
```json
{
  "success": true,
  "message": "로그인 성공",
  "studentId": "20240101",
  "name": "홍길동",
  "class": "1-1"
}
```

**응답 (실패):**
```json
{
  "success": false,
  "message": "학번 또는 비밀번호가 올바르지 않습니다."
}
```

### POST /api/change-password

**요청:**
```json
{
  "studentId": "20240101",
  "currentPassword": "old1234",
  "newPassword": "new5678"
}
```

**응답 (성공):**
```json
{
  "success": true,
  "message": "비밀번호가 성공적으로 변경되었습니다."
}
```

---

## 🔒 보안

### Salt 생성

```bash
# Node.js에서 랜덤 Salt 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Private Key 형식

JSON 키 파일의 `private_key` 값을 그대로 복사:
```
"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

---

## 📊 Google Sheets 구조

### 필수 컬럼

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| 학번 | 이름 | 반 | 비밀번호 | 이메일 | 비밀번호변경일 | 변경횟수 |

### 예시 데이터

```
학번       이름    반     비밀번호                          이메일              비밀번호변경일       변경횟수
20240101  홍길동   1-1   (SHA-256 해시)                  hong@school.com    2025-10-02T10:00:00Z  1
20240102  김철수   1-2   (SHA-256 해시)                  kim@school.com     2025-10-01T15:30:00Z  2
```

---

## 🧪 테스트

### 로컬 테스트

```bash
# 로그인 테스트
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"studentId":"20240101","password":"test1234"}'

# 비밀번호 변경 테스트
curl -X POST http://localhost:3000/api/change-password \
  -H "Content-Type: application/json" \
  -d '{"studentId":"20240101","currentPassword":"test1234","newPassword":"new5678"}'
```

---

## ⚠️ 문제 해결

### 1. "Service account not found"

**원인:** 서비스 계정 이메일이 잘못됨

**해결:**
1. Google Cloud Console → IAM 및 관리자 → 서비스 계정
2. 이메일 복사
3. `.env` 파일 확인

### 2. "Permission denied"

**원인:** 서비스 계정에 시트 권한 없음

**해결:**
1. Google Sheets 열기
2. 공유 → 서비스 계정 이메일 추가
3. 편집자 권한 부여

### 3. "Invalid private key"

**원인:** Private key 형식 오류

**해결:**
- JSON 키 파일에서 `private_key` 값을 **그대로** 복사
- `\n`이 실제 줄바꿈이 아닌 문자열로 있어야 함

### 4. "CORS error"

**원인:** 브라우저 CORS 정책

**해결:**
- API 파일에 CORS 헤더 이미 추가되어 있음
- 로컬 테스트 시 `vercel dev` 사용

---

## 🔄 업데이트 배포

```bash
# 코드 수정 후
git add .
git commit -m "Update: 기능 개선"
git push origin main

# Vercel이 자동으로 배포
```

---

## 📈 할당량

### Vercel (무료 플랜)
- 함수 실행: 100GB-시간/월
- 대역폭: 100GB/월
- 빌드: 6,000분/월

### Google Sheets API
- 읽기: 60 요청/분/사용자
- 쓰기: 60 요청/분/사용자
- 충분함!

---

## 💡 커스텀 도메인

### 1. 도메인 구매

예: `student-portfolio.com`

### 2. Vercel에서 도메인 추가

1. Project → Settings → Domains
2. 도메인 입력
3. DNS 레코드 설정 안내 확인

### 3. DNS 설정

```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

---

## 📞 지원

### 문제 발생 시

1. Vercel 로그 확인: `vercel logs`
2. Google Cloud Console 로그 확인
3. 브라우저 개발자 도구 (F12) 확인

---

## 🎉 완료!

**배포 완료 후:**

1. ✅ Vercel URL 확인
2. ✅ 로그인 테스트
3. ✅ 비밀번호 변경 테스트
4. ✅ 학생들에게 URL 공유

**URL 예시:**
```
https://student-portfolio-[random].vercel.app
```

**커스텀 도메인 (선택):**
```
https://student-portfolio.com
```

**성공적인 배포를 기원합니다! 🚀**
