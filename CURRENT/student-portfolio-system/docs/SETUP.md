# 설치 및 설정 가이드

학생 포트폴리오 시스템을 설정하고 배포하는 방법을 안내합니다.

---

## 목차

1. [사전 요구사항](#사전-요구사항)
2. [Google Sheets 설정](#google-sheets-설정)
3. [Apps Script 프로젝트 설정](#apps-script-프로젝트-설정)
4. [코드 배포](#코드-배포)
5. [웹앱 배포](#웹앱-배포)
6. [초기 데이터 설정](#초기-데이터-설정)
7. [보안 설정](#보안-설정)
8. [트러블슈팅](#트러블슈팅)

---

## 사전 요구사항

### 필수 요구사항

- ✅ Google Workspace 계정 (학교/조직용)
- ✅ Google Sheets 접근 권한
- ✅ Google Apps Script 사용 권한
- ✅ 기본적인 Google Workspace 관리 지식

### 권장 사양

- 🌐 Chrome 또는 Firefox 최신 버전
- 📱 모바일 브라우저 (학생 접속용)
- 💻 관리자용 PC

---

## Google Sheets 설정

### 1. 새 스프레드시트 생성

1. [Google Sheets](https://sheets.google.com) 접속
2. **빈 스프레드시트** 생성
3. 파일명 변경: `학생 포트폴리오 시스템`

### 2. 시트 구조 설정

#### 필수 시트 생성

**시트 이름:** `학생명단_전체`

#### 필수 컬럼 구조

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `학번` | 텍스트 | 5자리 학번 (필수) | `20240101` |
| `이름` | 텍스트 | 학생 이름 | `홍길동` |
| `반` | 텍스트 | 소속 반 | `1-1` |
| `비밀번호` | 텍스트 | 해싱된 비밀번호 | `j8fK3m9pL2...` |
| `이메일` | 이메일 | 학생 이메일 (선택) | `student@school.com` |

#### 자동 추가되는 컬럼

다음 컬럼은 `setupPasswordColumns()` 함수 실행 시 자동으로 추가됩니다:

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `비밀번호변경일` | 날짜/시간 | 마지막 변경 일시 |
| `변경횟수` | 숫자 | 총 변경 횟수 |

### 3. 샘플 데이터 입력

```
학번      | 이름   | 반  | 비밀번호              | 이메일
---------|--------|-----|----------------------|-------------------
20240101 | 홍길동 | 1-1 | (해시된 비밀번호)    | hong@school.com
20240102 | 김철수 | 1-1 | (해시된 비밀번호)    | kim@school.com
20240201 | 이영희 | 1-2 | (해시된 비밀번호)    | lee@school.com
```

⚠️ **주의:** 비밀번호는 반드시 해싱해야 합니다. [초기 데이터 설정](#초기-데이터-설정) 참조

### 4. 시트 권한 설정

1. **공유** 버튼 클릭
2. 다음 권한 설정:
   - 관리자: **편집자**
   - 학생: **직접 접근 불가** (웹앱을 통해서만 접근)

---

## Apps Script 프로젝트 설정

### 1. Apps Script 에디터 열기

1. Google Sheets에서 **확장 프로그램** → **Apps Script** 클릭
2. 프로젝트 이름 변경: `학생 포트폴리오 시스템`

### 2. 코드 파일 추가

다음 파일들을 Apps Script 에디터에 추가합니다:

#### 파일 추가 순서

1. **Config.gs**
   - 메뉴: **파일** → **새로 만들기** → **스크립트**
   - 이름: `Config`
   - 내용: `src/Config.gs` 파일 내용 복사

2. **SecurityUtils.gs**
   - 이름: `SecurityUtils`
   - 내용: `src/SecurityUtils.gs` 파일 내용 복사

3. **PasswordManager.gs**
   - 이름: `PasswordManager`
   - 내용: `src/PasswordManager.gs` 파일 내용 복사

4. **AdminUtils.gs**
   - 이름: `AdminUtils`
   - 내용: `src/AdminUtils.gs` 파일 내용 복사

5. **WebApp.html**
   - 메뉴: **파일** → **새로 만들기** → **HTML**
   - 이름: `WebApp`
   - 내용: `src/WebApp.html` 파일 내용 복사

### 3. appsscript.json 설정

1. **프로젝트 설정** (왼쪽 사이드바 톱니바퀴 아이콘)
2. **"appsscript.json" 매니페스트 파일 표시** 체크
3. `appsscript.json` 파일 편집:

```json
{
  "timeZone": "Asia/Seoul",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.storage",
    "https://www.googleapis.com/auth/script.scriptapp"
  ],
  "webapp": {
    "access": "DOMAIN",
    "executeAs": "USER_DEPLOYING"
  }
}
```

### 4. 파일 구조 확인

최종 파일 구조:

```
Apps Script 프로젝트
├── appsscript.json
├── Config.gs
├── SecurityUtils.gs
├── PasswordManager.gs
├── AdminUtils.gs
└── WebApp.html
```

---

## 코드 배포

### 1. 저장 및 테스트

1. **저장** 버튼 클릭 (Ctrl+S)
2. 프로젝트 이름 확인
3. 실행 함수: `testConfig` 선택
4. **실행** 클릭

#### 첫 실행 시 권한 승인

1. **권한 검토** 클릭
2. Google 계정 선택
3. **고급** → **[프로젝트명] (안전하지 않음)으로 이동** 클릭
4. **허용** 클릭

### 2. 비밀번호 컬럼 설정

1. 실행 함수: `setupPasswordColumns` 선택
2. **실행** 클릭
3. 로그 확인 (Ctrl+Enter)

```
=== 비밀번호 컬럼 설정 시작 ===
✓ '비밀번호변경일' 컬럼 추가됨
✓ '변경횟수' 컬럼 추가됨
총 2개의 컬럼이 추가되었습니다.
=== 비밀번호 컬럼 설정 완료 ===
```

4. Google Sheets에서 컬럼 추가 확인

---

## 웹앱 배포

### 1. 배포 준비

1. Apps Script 에디터에서 **배포** → **새 배포** 클릭
2. **유형 선택** → **웹 앱** 선택

### 2. 배포 설정

| 설정 | 값 | 설명 |
|------|-----|------|
| **설명** | `v1.0.0 - 초기 배포` | 배포 버전 설명 |
| **다음 계정으로 실행** | `나` | 스크립트 실행 권한 |
| **액세스 권한** | `[도메인] 사용자만` | 학교 도메인 내 접근 제한 |

⚠️ **중요:** "모든 사용자"로 설정하지 마세요! 보안 문제가 발생합니다.

### 3. 배포 실행

1. **배포** 클릭
2. **액세스 승인** (필요 시)
3. 배포 완료 후 **웹 앱 URL** 복사

```
웹 앱 URL: https://script.google.com/macros/s/AKfycby.../exec
```

### 4. 웹 앱 URL 확인

배포된 URL은 다음과 같은 형식입니다:

```
https://script.google.com/macros/s/[SCRIPT_ID]/exec
```

이 URL을 학생들에게 공유하세요.

### 5. 웹앱 테스트

1. 복사한 URL을 브라우저에서 열기
2. 로그인 화면 확인
3. 테스트 학번/비밀번호로 로그인 시도
4. 비밀번호 변경 테스트

---

## 초기 데이터 설정

### 1. 초기 비밀번호 생성

기존 학생 데이터가 평문 비밀번호로 되어 있다면, 해싱이 필요합니다.

#### 방법 1: 관리자 함수 사용

```javascript
// Apps Script 에디터에 임시 함수 추가
function migratePasswords() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('학생명단_전체');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const passwordCol = headers.indexOf('비밀번호') + 1;

  // 헤더 제외 (i = 1부터)
  for (let i = 1; i < data.length; i++) {
    const plainPassword = data[i][passwordCol - 1];

    if (plainPassword && plainPassword.length < 50) {
      // 평문으로 추정 (해시는 길이 50+ 문자)
      const hashedPassword = hashPassword(plainPassword);
      sheet.getRange(i + 1, passwordCol).setValue(hashedPassword);

      Logger.log(`행 ${i + 1}: 비밀번호 해싱 완료`);
    }
  }

  Logger.log('모든 비밀번호 마이그레이션 완료');
}
```

실행:
1. 위 함수를 Apps Script에 추가
2. 실행 함수: `migratePasswords` 선택
3. **실행** 클릭
4. 완료 후 함수 삭제 (보안)

#### 방법 2: 수동 설정

개별 학생의 비밀번호를 설정하려면:

```javascript
// Apps Script 에디터에서 실행
function setInitialPassword() {
  const result = resetStudentPassword('20240101', 'temp1234');
  Logger.log(result.message);
}
```

### 2. 초기 비밀번호 정책

학생들에게 초기 비밀번호를 부여할 때:

- ✅ **권장:** 학번 뒤 4자리 + 생년월일
  - 예: 학번 `20240101`, 생일 `0315` → 초기 비밀번호: `01010315`
- ✅ **첫 로그인 시 비밀번호 변경 안내**
- ❌ **피해야 할 것:** `1234`, `password` 등 단순 비밀번호

---

## 보안 설정

### 1. Salt 변경 (필수)

배포 전에 반드시 Salt를 변경하세요!

**Config.gs 파일:**

```javascript
const SECURITY_CONFIG = {
  // ⚠️ 변경 필요!
  SALT: 'CHANGE_THIS_TO_RANDOM_STRING_IN_PRODUCTION',
  ...
};
```

**권장 Salt 생성 방법:**

```javascript
// Apps Script 에디터에서 실행
function generateSalt() {
  const salt = Utilities.getUuid() + Utilities.getUuid();
  Logger.log('생성된 Salt: ' + salt);
  Logger.log('Config.gs에 복사하세요!');
}
```

⚠️ **주의:** Salt 변경 후에는 **절대 다시 변경하지 마세요**! 모든 비밀번호가 무효화됩니다.

### 2. 접근 권한 설정

**appsscript.json:**

```json
{
  "webapp": {
    "access": "DOMAIN",  // ✅ 도메인 내 사용자만
    // "access": "ANYONE_ANONYMOUS"  // ❌ 절대 사용 금지!
    "executeAs": "USER_DEPLOYING"
  }
}
```

### 3. 스프레드시트 권한

| 사용자 | 권한 | 설명 |
|--------|------|------|
| 관리자/교사 | 편집자 | 데이터 수정 가능 |
| IT 관리자 | 소유자 | 시스템 관리 |
| 학생 | 없음 | 웹앱을 통해서만 접근 |

### 4. Rate Limiting 설정

필요시 `Config.gs`에서 조정:

```javascript
const RATE_LIMIT_CONFIG = {
  LOGIN_MAX_ATTEMPTS: 5,           // 로그인 시도 제한
  PASSWORD_CHANGE_MAX_ATTEMPTS: 3, // 비밀번호 변경 제한
  WINDOW_MINUTES: 15               // 시간 윈도우
};
```

---

## 트러블슈팅

### 문제 1: "권한이 없습니다" 오류

**증상:**
```
Exception: You do not have permission to call...
```

**해결:**
1. Apps Script 에디터 → **프로젝트 설정**
2. **"appsscript.json" 매니페스트 파일 표시** 체크
3. `oauthScopes` 확인 및 추가
4. 저장 후 재배포

### 문제 2: 웹앱 URL이 작동하지 않음

**증상:**
- 404 Not Found
- 빈 화면

**해결:**
1. **배포** → **배포 관리** 확인
2. 활성 배포가 있는지 확인
3. URL 끝이 `/exec`인지 확인 (`/dev` 아님)
4. 시크릿 브라우징 모드에서 테스트

### 문제 3: "학생을 찾을 수 없습니다"

**증상:**
로그인 시 항상 실패

**해결:**
1. Google Sheets에서 시트 이름 확인
   - 정확히 `학생명단_전체`인지 확인
2. 컬럼 이름 확인
   - `학번`, `비밀번호` 등 정확한지 확인
3. Apps Script 로그 확인 (Ctrl+Enter)

### 문제 4: 비밀번호 변경이 안됨

**증상:**
"24시간에 1회만 변경 가능합니다"

**해결:**

관리자가 직접 변경:

```javascript
function resetLimit() {
  const result = resetStudentPassword('20240101', 'newpass123');
  Logger.log(result.message);
}
```

### 문제 5: 느린 응답 속도

**원인:**
- 캐시 미작동
- 데이터 양 증가

**해결:**
1. 캐시 확인:
```javascript
function checkCache() {
  const cache = CacheService.getScriptCache();
  const keys = cache.getAll({});
  Logger.log('캐시 키 개수: ' + Object.keys(keys).length);
}
```

2. 데이터 정리:
   - 졸업생 데이터 아카이브
   - 별도 시트로 이동

---

## 배포 체크리스트

배포 전에 다음 항목을 확인하세요:

### 보안
- [ ] Salt 변경 완료 (`Config.gs`)
- [ ] 웹앱 접근 권한 `DOMAIN`으로 설정
- [ ] 스프레드시트 권한 설정 완료
- [ ] 테스트 계정으로 접근 제한 확인

### 기능
- [ ] `setupPasswordColumns()` 실행 완료
- [ ] 비밀번호 해싱 마이그레이션 완료
- [ ] 로그인 테스트 성공
- [ ] 비밀번호 변경 테스트 성공
- [ ] Rate Limiting 동작 확인

### 데이터
- [ ] 학생 데이터 입력 완료
- [ ] 초기 비밀번호 설정 완료
- [ ] 백업 생성 완료

### 문서
- [ ] 학생용 사용 안내서 작성
- [ ] 관리자용 매뉴얼 작성
- [ ] 웹앱 URL 공유 완료

---

## 추가 리소스

- [API 문서](./API.md)
- [변경 이력](./CHANGELOG.md)
- [보안 모범 사례](https://cloud.google.com/security/best-practices)
- [Apps Script 가이드](https://developers.google.com/apps-script/guides)

---

## 지원

문제가 발생하면:

1. **로그 확인:** Apps Script 에디터 → Ctrl+Enter
2. **테스트 함수 실행:** `testConfig()`, `getSystemInfo()`
3. **GitHub Issues:** 문제 보고 및 질문

배포 성공을 기원합니다! 🎉
