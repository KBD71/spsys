# 새 컴퓨터에서 프로젝트 설정하기

## 📋 사전 준비

1. Node.js 18 이상 설치
2. Git 설치
3. OneDrive - 문현고등학교 동기화 완료

---

## 🚀 설정 순서

### 1. 프로젝트 폴더로 이동

```bash
cd "C:/Users/[사용자명]/OneDrive - 문현고등학교/spsys/VERCEL/student-portfolio-vercel"
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

**방법 1: Vercel에서 다운로드 (권장)**

```bash
# Vercel CLI 설치 (한 번만)
npm install -g vercel

# Vercel 로그인
vercel login

# 환경 변수 다운로드
vercel env pull .env
```

**방법 2: 수동 설정**

```bash
# .env.example 복사
cp .env.example .env

# .env 파일 편집
notepad .env
```

다음 값들을 입력:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: 서비스 계정 이메일
- `GOOGLE_PRIVATE_KEY`: 개인 키 (JSON 키 파일에서)
- `SPREADSHEET_ID`: Google Sheets ID
- `SALT`: 비밀번호 해싱 Salt

### 4. 로컬 테스트

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

---

## 🧪 테스트

### 로그인 테스트

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"studentId":"10101","password":"1234"}'
```

### Google Sheets 연결 테스트

```bash
npm run test
```

---

## 🔧 문제 해결

### node_modules 없음

```bash
npm install
```

### .env 파일 없음

```bash
vercel env pull .env
```

### Vercel 로그인 안 됨

1. 브라우저에서 https://vercel.com 로그인
2. `vercel login` 재시도

---

## 📝 주의사항

- `.env` 파일은 절대 Git에 커밋하지 마세요
- `node_modules`는 OneDrive 동기화에서 제외됨
- 각 컴퓨터에서 `npm install`을 한 번씩 실행해야 함

---

## ✅ 설정 완료 확인

모두 완료되면 다음이 가능해야 합니다:

1. ✅ 로컬 서버 실행
2. ✅ 로그인 API 호출 성공
3. ✅ Google Sheets 연결 성공
4. ✅ Vercel 배포 가능

---

**문제가 있으면 VERCEL_ENV_SETUP.md를 참고하세요.**
