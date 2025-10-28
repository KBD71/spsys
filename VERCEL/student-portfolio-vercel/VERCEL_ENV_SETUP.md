# Vercel 환경변수 설정 가이드

## 개요

이 문서는 학생 포트폴리오 시스템을 Vercel에 배포할 때 필요한 환경변수 설정 방법을 안내합니다.

## 필수 환경변수

다음 4개의 환경변수가 필요합니다:

1. **GOOGLE_SERVICE_ACCOUNT_EMAIL**: Google Service Account 이메일
2. **GOOGLE_PRIVATE_KEY**: Google Service Account Private Key
3. **SPREADSHEET_ID**: Google Sheets 스프레드시트 ID
4. **SALT**: 비밀번호 해싱용 Salt 값

---

## 1. Google Service Account 생성

### 1-1. Google Cloud Console 접속
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 기존 프로젝트 선택

### 1-2. Service Account 생성
1. 좌측 메뉴에서 **IAM 및 관리자** → **서비스 계정** 선택
2. **서비스 계정 만들기** 클릭
3. 서비스 계정 이름 입력 (예: `student-portfolio-service`)
4. **만들고 계속하기** 클릭
5. 역할 선택: **기본** → **편집자** (또는 최소 권한으로 설정)
6. **완료** 클릭

### 1-3. Private Key 생성
1. 생성된 서비스 계정 클릭
2. **키** 탭 선택
3. **키 추가** → **새 키 만들기** 클릭
4. 키 유형: **JSON** 선택
5. **만들기** 클릭
6. JSON 파일이 자동으로 다운로드됩니다

### 1-4. Google Sheets API 활성화
1. 좌측 메뉴에서 **API 및 서비스** → **라이브러리** 선택
2. "Google Sheets API" 검색
3. **Google Sheets API** 클릭
4. **사용** 버튼 클릭

---

## 2. Google Sheets 준비

### 2-1. 스프레드시트 ID 확인
1. 사용할 Google Sheets 열기
2. URL에서 스프레드시트 ID 복사
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```
   예시: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

### 2-2. Service Account에 권한 부여
1. Google Sheets 우측 상단 **공유** 버튼 클릭
2. Service Account 이메일 주소 입력 (JSON 파일의 `client_email` 값)
3. 권한: **편집자** 선택
4. **완료** 클릭

---

## 3. Vercel 환경변수 설정

### 방법 1: Vercel 대시보드에서 설정 (권장)

1. [Vercel 대시보드](https://vercel.com/dashboard) 접속
2. 프로젝트 선택 (student-portfolio-system)
3. **Settings** → **Environment Variables** 선택
4. 다음 변수들을 추가:

#### GOOGLE_SERVICE_ACCOUNT_EMAIL
- **Key**: `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- **Value**: 다운로드한 JSON 파일의 `client_email` 값
  ```
  예: student-portfolio-service@project-id.iam.gserviceaccount.com
  ```
- **Environment**: Production, Preview, Development 모두 선택

#### GOOGLE_PRIVATE_KEY
- **Key**: `GOOGLE_PRIVATE_KEY`
- **Value**: 다운로드한 JSON 파일의 `private_key` 값 (전체를 복사)
  ```
  예: -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...(생략)...==\n-----END PRIVATE KEY-----\n
  ```
  ⚠️ **주의**: 줄바꿈 문자(`\n`)를 포함하여 그대로 복사해야 합니다
- **Environment**: Production, Preview, Development 모두 선택

#### SPREADSHEET_ID
- **Key**: `SPREADSHEET_ID`
- **Value**: Google Sheets URL에서 추출한 스프레드시트 ID
  ```
  예: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
  ```
- **Environment**: Production, Preview, Development 모두 선택

#### SALT
- **Key**: `SALT`
- **Value**: 비밀번호 해싱용 랜덤 문자열 (32자 이상 권장)
  ```bash
  # 터미널에서 생성:
  openssl rand -base64 32
  ```
  예: `9uLjaTOtMaP2EQ9ND6pljl2Krw5qe0RpAyPVJZN5VpQ=`
- **Environment**: Production, Preview, Development 모두 선택

5. 각 변수 추가 후 **Save** 클릭

### 방법 2: Vercel CLI로 설정

```bash
cd VERCEL/student-portfolio-vercel

# 각 환경변수 추가
echo "your-service-account@project.iam.gserviceaccount.com" | vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL production
echo "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" | vercel env add GOOGLE_PRIVATE_KEY production
echo "your-spreadsheet-id" | vercel env add SPREADSHEET_ID production
echo "your-random-salt" | vercel env add SALT production

# 환경변수 확인
vercel env ls
```

---

## 4. 재배포

환경변수를 설정한 후에는 반드시 재배포해야 적용됩니다:

```bash
cd VERCEL/student-portfolio-vercel
vercel --prod
```

또는 Vercel 대시보드에서:
1. **Deployments** 탭 선택
2. 최신 배포의 **...** 메뉴 클릭
3. **Redeploy** 선택

---

## 5. 환경변수 확인

### CLI로 확인
```bash
vercel env ls
```

### API 테스트
배포 후 다음 URL로 테스트:
```
https://spsys.vercel.app/api/login
```

정상적으로 설정되었다면 로그인 페이지가 표시됩니다.

---

## 트러블슈팅

### 문제 1: "GOOGLE_SERVICE_ACCOUNT_EMAIL is not defined"
**원인**: 환경변수가 설정되지 않았거나 배포에 적용되지 않음
**해결**:
1. Vercel 대시보드에서 환경변수 확인
2. Production 환경에 체크되어 있는지 확인
3. 재배포 실행

### 문제 2: "Error: The caller does not have permission"
**원인**: Service Account에 Google Sheets 접근 권한이 없음
**해결**:
1. Google Sheets 공유 설정 확인
2. Service Account 이메일이 편집자로 추가되어 있는지 확인

### 문제 3: "Private key parsing error"
**원인**: GOOGLE_PRIVATE_KEY 형식이 잘못됨
**해결**:
1. JSON 파일에서 `private_key` 값을 정확히 복사
2. 줄바꿈 문자(`\n`)가 포함되어 있는지 확인
3. 앞뒤 따옴표 없이 복사

### 문제 4: "Spreadsheet not found"
**원인**: 잘못된 SPREADSHEET_ID 또는 권한 부족
**해결**:
1. Google Sheets URL에서 ID 다시 확인
2. Service Account가 해당 시트에 접근 권한이 있는지 확인

---

## 보안 주의사항

⚠️ **절대로 다음 행동을 하지 마세요:**
- 환경변수 값을 Git에 커밋하지 말 것
- Service Account JSON 파일을 공개 저장소에 업로드하지 말 것
- SALT 값을 공개하지 말 것
- `.env` 파일을 Git에 커밋하지 말 것 (`.gitignore`에 포함되어 있어야 함)

✅ **안전한 관리 방법:**
- 환경변수는 Vercel 대시보드에서만 관리
- Service Account JSON 파일은 안전한 곳에 백업
- SALT 값은 별도로 안전하게 보관
- 프로덕션 환경변수는 팀원과 안전하게 공유

---

## 참고 자료

- [Vercel Environment Variables 문서](https://vercel.com/docs/concepts/projects/environment-variables)
- [Google Cloud Service Accounts 문서](https://cloud.google.com/iam/docs/service-accounts)
- [Google Sheets API 문서](https://developers.google.com/sheets/api/guides/concepts)

---

## 업데이트 이력

- 2025-01-28: 초기 문서 작성
- 시험 모드 기능 추가
- 질문별 저장 기능 추가
