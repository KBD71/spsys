# Vercel 환경 변수 설정 가이드

## 🔐 필수 환경 변수

Vercel 대시보드에서 다음 환경 변수를 설정해야 합니다.

### 1. Vercel 프로젝트 접속

1. https://vercel.com/dashboard 접속
2. 프로젝트: `student-portfolio-vercel` 선택
3. **Settings** 탭 클릭
4. 좌측 메뉴에서 **Environment Variables** 클릭

---

## 환경 변수 입력

### 1. GOOGLE_SERVICE_ACCOUNT_EMAIL

**Name**: `GOOGLE_SERVICE_ACCOUNT_EMAIL`

**Value**: (현재 .env 파일의 값)
```
vercel-sheets-access@edugen-461700.iam.gserviceaccount.com
```

**Environment**:
- ✅ Production
- ✅ Preview
- ✅ Development

---

### 2. GOOGLE_PRIVATE_KEY

**Name**: `GOOGLE_PRIVATE_KEY`

**Value**: (현재 .env 파일의 값 - 전체 복사)
```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDf662MTBS3m6Uk
...
(중략)
...
pukLO2kg3JCkl/rjhJgqbYt4
-----END PRIVATE KEY-----
```

⚠️ **주의**: 줄바꿈을 `\n`으로 변환하지 말고 그대로 입력

**Environment**:
- ✅ Production
- ✅ Preview
- ✅ Development

---

### 3. SPREADSHEET_ID

**Name**: `SPREADSHEET_ID`

**Value**: (현재 .env 파일의 값)
```
1bGef3HurTtHA8NOFxLjBzdWRuOd4OQSCFkRE_1a8Zj4
```

**Environment**:
- ✅ Production
- ✅ Preview
- ✅ Development

---

### 4. SALT

**Name**: `SALT`

**Value**: (현재 .env 파일의 값)
```
a701afb2f5570f4792a4d322564a33624de3e32612a24368dc0e2428432cc07c
```

**Environment**:
- ✅ Production
- ✅ Preview
- ✅ Development

---

## ✅ 설정 완료 후

1. 모든 환경 변수 저장
2. 프로젝트 재배포:
   ```bash
   cd Documents/spsys/VERCEL/student-portfolio-vercel
   vercel --prod --yes
   ```

3. 또는 Vercel 대시보드에서:
   - **Deployments** 탭
   - 가장 최근 배포의 **⋮** 메뉴
   - **Redeploy** 클릭

---

## 🧪 배포 후 테스트

배포 완료 후 제공된 URL에서 테스트:

```
https://student-portfolio-vercel-[random].vercel.app
```

**테스트 로그인**:
- 학번: 10101
- 비밀번호: 5678 (최근 변경한 비밀번호)

---

**설정 완료!**
