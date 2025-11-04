# 📦 Vercel 배포 가이드

## 🎯 개요
이 문서는 학생 포트폴리오 시스템을 Vercel에 배포하는 전체 과정을 설명합니다.

---

## ✅ 사전 준비

### 1. 필수 계정
- [ ] [Vercel 계정](https://vercel.com/signup) (GitHub 연동 권장)
- [ ] [Google Cloud Platform](https://console.cloud.google.com/) 계정
- [ ] GitHub 저장소 (코드 업로드용)

### 2. 필수 파일 준비
- [ ] Google Service Account JSON 키 파일
- [ ] Google Sheets ID
- [ ] 학생 데이터가 입력된 Google Sheets

---

## 🚀 1단계: Google Cloud 설정

### 1.1 Service Account 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 (또는 기존 프로젝트 선택)
3. **APIs & Services > Library** 이동
4. **"Google Sheets API"** 검색 → **Enable** 클릭
5. **IAM & Admin > Service Accounts** 이동
6. **+ CREATE SERVICE ACCOUNT** 클릭
7. 이름 입력: `spsys-vercel` → **Create and Continue**
8. Role: **없음** (Sheets 공유로 권한 부여) → **Done**

### 1.2 JSON 키 발급

1. 생성된 Service Account 클릭
2. **KEYS** 탭 이동
3. **ADD KEY > Create new key**
4. Key type: **JSON** 선택
5. **CREATE** → JSON 파일 다운로드
6. **안전한 곳에 보관** (재발급 불가)

### 1.3 Google Sheets 공유

1. Google Sheets 열기
2. 우측 상단 **Share** 버튼 클릭
3. JSON 파일의 `"client_email"` 값 복사
   ```json
   "client_email": "spsys-vercel@your-project.iam.gserviceaccount.com"
   ```
4. 복사한 이메일을 **Editor** 권한으로 추가

---

## 🔧 2단계: GitHub 저장소 준비

### 2.1 저장소 생성 (신규)

```bash
cd VERCEL/student-portfolio-vercel

# Git 초기화
git init

# .gitignore 확인 (민감한 파일 제외)
cat .gitignore

# 커밋
git add .
git commit -m "Initial commit: Student Portfolio System"

# GitHub 저장소와 연결
git remote add origin https://github.com/your-username/student-portfolio.git
git branch -M main
git push -u origin main
```

### 2.2 저장소 업데이트 (기존)

```bash
git add .
git commit -m "Update: Add Vercel KV cache and performance improvements"
git push
```

---

## 🌐 3단계: Vercel 프로젝트 생성

### 3.1 Vercel에서 Import

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. **Add New... > Project** 클릭
3. GitHub 저장소 선택 (권한 부여 필요 시 승인)
4. **Import** 클릭

### 3.2 프로젝트 설정

**Framework Preset:** Other (자동 감지)

**Root Directory:** `VERCEL/student-portfolio-vercel` (또는 해당 경로)

**Build Settings:**
- Build Command: (비워두기 - 정적 파일)
- Output Directory: (비워두기)
- Install Command: `npm install`

**Environment Variables** (아래 4단계에서 추가)

**Deploy** 버튼은 아직 클릭하지 마세요!

---

## 🔑 4단계: 환경 변수 설정

### 4.1 필수 환경 변수 추가

Vercel Dashboard > Project > **Settings > Environment Variables**

다운로드한 JSON 파일을 열어서 다음 값들을 복사:

| Key | Value | 설명 |
|-----|-------|------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` 값 | Service Account 이메일 |
| `GOOGLE_PRIVATE_KEY` | `private_key` 값 **전체** | 개인 키 (줄바꿈 포함) |
| `SPREADSHEET_ID` | Sheets URL에서 추출 | Google Sheets ID |

**중요: GOOGLE_PRIVATE_KEY 입력 시**
- **전체 내용**을 복사: `-----BEGIN PRIVATE KEY-----`부터 `-----END PRIVATE KEY-----\n`까지
- 줄바꿈(`\n`)도 그대로 유지
- 따옴표 없이 복사

**Spreadsheet ID 추출 방법:**
```
https://docs.google.com/spreadsheets/d/1AbC...XyZ/edit
                                      ↑ 이 부분 ↑
```

### 4.2 환경 변수 적용 대상 선택

각 환경변수마다 적용 환경 체크:
- ✅ **Production** (필수)
- ✅ **Preview** (권장)
- ✅ **Development** (선택)

**Save** 클릭

---

## 💾 5단계: Vercel KV (Redis) 설정

### 5.1 KV Database 생성

1. Vercel Dashboard > Project > **Storage** 탭
2. **Create Database** 클릭
3. **KV** 선택
4. Database 이름: `spsys-cache`
5. Region: **Asia Pacific (Seoul)** - icn1
6. **Create** 클릭

### 5.2 환경 변수 자동 추가 확인

KV Database 생성 후 다음 환경변수가 자동 추가됩니다:

```env
KV_REST_API_URL=https://...upstash.io
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

**Settings > Environment Variables**에서 확인

---

## 🚢 6단계: 배포

### 6.1 첫 배포

1. **Deployments** 탭으로 이동
2. 우측 상단 **Deploy** 또는 **Redeploy** 클릭
3. 배포 진행 상황 확인 (약 1-2분 소요)

### 6.2 배포 성공 확인

✅ **Ready** 상태 확인
✅ **Visit** 버튼 클릭하여 사이트 접속
✅ 도메인 확인: `https://your-project.vercel.app`

---

## 🧪 7단계: 테스트

### 7.1 기능 테스트

1. **로그인 테스트**
   - Google Sheets의 학생 계정으로 로그인
   - 학번: 5자리 숫자
   - 비밀번호: Sheets의 "비밀번호" 열 값

2. **과제 목록 확인**
   - "과제 목록" 섹션에 과제가 표시되는지 확인
   - "공개" 시트에서 공개로 설정한 과제만 보여야 함

3. **과제 제출 테스트**
   - 과제 클릭 → 답변 입력 → 제출
   - Google Sheets에서 제출 내용 확인

4. **시험 모드 테스트** (시험모드 활성화된 과제)
   - 전체화면 강제 확인
   - 화면 전환 시 위반 카운트 증가 확인
   - 최대 위반 시 자동 제출 확인

### 7.2 성능 테스트

**캐시 작동 확인:**

1. 브라우저 개발자 도구 열기 (F12)
2. **Network** 탭
3. 과제 목록 조회 (첫 번째)
4. 시간 확인 (예: 500-1000ms)
5. 페이지 새로고침
6. 과제 목록 다시 조회 (두 번째)
7. 시간 확인 (예: 100-200ms) ← **캐시 HIT!**

**Vercel Function Logs 확인:**

1. Vercel Dashboard > Project > **Logs** 탭
2. Runtime Logs에서 다음 확인:
   ```
   [캐시] Vercel KV (Redis) 활성화됨
   [assignments] Redis HIT: assignments:{"studentId":"12345"}
   ```

---

## 🔍 8단계: 모니터링

### 8.1 Vercel Analytics (선택사항)

1. **Analytics** 탭 클릭
2. **Enable Analytics** (무료)
3. 페이지 로드 시간, 방문자 통계 등 확인

### 8.2 Function 성능 확인

**Vercel Dashboard > Functions**
- 실행 시간
- 메모리 사용량
- 에러율

### 8.3 KV 사용량 확인

**Storage > KV Database**
- Commands per second
- Hit rate (목표: 80% 이상)
- Storage usage

---

## 🌟 9단계: 커스텀 도메인 (선택사항)

### 9.1 도메인 추가

1. **Settings > Domains** 탭
2. **Add** 버튼 클릭
3. 도메인 입력 (예: `portfolio.school.kr`)
4. DNS 설정 안내에 따라 레코드 추가

### 9.2 DNS 설정 예시

**A 레코드:**
```
Type: A
Name: @
Value: 76.76.21.21
```

**CNAME 레코드:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

---

## 🛠️ 트러블슈팅

### 문제 1: "API Error" 또는 500 에러

**원인:** 환경 변수 누락 또는 잘못된 값

**해결:**
1. **Settings > Environment Variables** 확인
2. `GOOGLE_PRIVATE_KEY`가 전체 복사되었는지 확인
3. `SPREADSHEET_ID`가 정확한지 확인
4. **Deployments** 탭에서 **Redeploy** 클릭

### 문제 2: "학생을 찾을 수 없습니다"

**원인:** Google Sheets와 Service Account 공유 안 됨

**해결:**
1. Google Sheets 열기
2. **Share** 버튼 클릭
3. Service Account 이메일 확인
4. 권한: **Editor** 확인

### 문제 3: 과제 목록이 비어있음

**원인:** "공개" 시트 설정 미확인

**해결:**
1. Google Sheets의 "공개" 시트 확인
2. "공개" 열이 `TRUE`인지 확인
3. "대상반" 열이 학생 반과 일치하는지 확인
4. "과제설정" 시트의 날짜 범위 확인

### 문제 4: Redis 캐시 안 됨

**원인:** KV Database 미생성

**해결:**
1. **Storage** 탭에서 KV Database 생성
2. 환경변수 자동 추가 확인
3. **Redeploy** 클릭

### 문제 5: 배포 실패

**원인:** package.json 또는 node_modules 문제

**해결:**
```bash
# 로컬에서 확인
npm install
npm run dev

# 문제 없으면 다시 배포
git add .
git commit -m "Fix deployment"
git push
```

---

## 📊 성능 최적화 체크리스트

- [x] Vercel KV (Redis) 활성화
- [x] Region: Seoul (icn1)
- [x] Function Memory: 1024 MB
- [x] batchGet API 사용
- [ ] Analytics 활성화
- [ ] 커스텀 도메인 설정 (선택)

---

## 🔄 업데이트 배포

코드 수정 후 재배포:

```bash
# 코드 수정 후
git add .
git commit -m "Update: Feature description"
git push

# Vercel이 자동으로 재배포 시작
# Dashboard에서 진행 상황 확인
```

**자동 배포:**
- `main` 브랜치에 push하면 자동으로 Production 배포
- 다른 브랜치에 push하면 Preview 배포

---

## 📞 지원

### Vercel 공식 문서
- [Vercel Docs](https://vercel.com/docs)
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)

### 프로젝트 문서
- `README.md` - 프로젝트 개요
- `REDIS_SETUP.md` - Redis 캐시 설정
- `INTEGRATION_GUIDE.md` - Google Sheets 연동

---

## ✅ 배포 완료 체크리스트

최종 확인:

- [ ] Google Service Account 생성 및 JSON 키 발급
- [ ] Google Sheets에 Service Account 공유 (Editor)
- [ ] GitHub 저장소에 코드 업로드
- [ ] Vercel 프로젝트 생성
- [ ] 환경 변수 3개 설정 (EMAIL, KEY, SPREADSHEET_ID)
- [ ] Vercel KV Database 생성 (Seoul 리전)
- [ ] 첫 배포 성공 (Ready 상태)
- [ ] 로그인 테스트 성공
- [ ] 과제 목록 조회 성공
- [ ] 과제 제출 테스트 성공
- [ ] 캐시 HIT 확인 (Logs)
- [ ] Function Logs에서 "Redis 활성화됨" 확인

**축하합니다! 🎉 배포가 완료되었습니다!**

---

## 📌 빠른 참조

### Vercel CLI 배포 (대안)

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 배포
vercel

# 프로덕션 배포
vercel --prod

# 환경변수 설정
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
vercel env add GOOGLE_PRIVATE_KEY
vercel env add SPREADSHEET_ID
```

### 주요 URL

- **프로젝트 URL**: `https://your-project.vercel.app`
- **Dashboard**: `https://vercel.com/dashboard`
- **Logs**: `https://vercel.com/your-project/logs`
- **Settings**: `https://vercel.com/your-project/settings`

---

이제 시스템이 전 세계 어디서나 빠르게 접속 가능합니다! 🚀
