# 배포 가이드

학생 포트폴리오 시스템을 Google Apps Script에 배포하는 단계별 가이드입니다.

---

## 📋 배포 전 체크리스트

배포하기 전에 다음 항목을 확인하세요:

### 필수 확인 사항

- [ ] **Salt 변경 완료**
  ```javascript
  // Config.gs에서 확인
  const SECURITY_CONFIG = {
    SALT: 'YOUR_RANDOM_SALT_HERE'  // 기본값이 아닌지 확인!
  }
  ```

- [ ] **Google Sheets 준비**
  - 스프레드시트 생성
  - 시트 이름: `학생명단_전체`
  - 필수 컬럼: 학번, 이름, 반, 비밀번호

- [ ] **모든 파일 업로드**
  - Main.gs ✓
  - Config.gs ✓
  - SecurityUtils.gs ✓
  - Security.gs ✓
  - PasswordManager.gs ✓
  - AdminUtils.gs ✓
  - Utils.gs ✓
  - Tests.gs ✓
  - WebApp.html ✓
  - appsscript.json ✓

- [ ] **초기 설정 실행**
  - `setupPasswordColumns()` 실행
  - `validateDeploymentChecklist()` 실행

---

## 🚀 배포 단계

### 1단계: Google Sheets 준비

1. **새 스프레드시트 생성**
   - [Google Sheets](https://sheets.google.com) 접속
   - "빈 스프레드시트" 클릭
   - 이름: `학생 포트폴리오 시스템`

2. **시트 설정**
   - 기본 시트 이름을 `학생명단_전체`로 변경
   - 첫 번째 행에 헤더 작성:
     | 학번 | 이름 | 반 | 비밀번호 | 이메일 |
     |------|------|-----|----------|--------|

3. **샘플 데이터 입력** (선택)
   ```
   학번      | 이름   | 반  | 비밀번호 | 이메일
   20240101 | 홍길동 | 1-1 |          | hong@school.com
   ```

### 2단계: Apps Script 프로젝트 설정

1. **Apps Script 에디터 열기**
   - 스프레드시트에서 `확장 프로그램` → `Apps Script` 클릭
   - 기본 `Code.gs` 파일 삭제

2. **모든 파일 추가**

   #### Main.gs
   - 새 파일 만들기: `파일` → `새로 만들기` → `스크립트`
   - 이름: `Main`
   - 내용: `src/Main.gs` 복사

   #### Config.gs
   - 이름: `Config`
   - 내용: `src/Config.gs` 복사
   - ⚠️ **중요**: SALT 값 변경!

   #### SecurityUtils.gs, Security.gs, PasswordManager.gs, AdminUtils.gs, Utils.gs, Tests.gs
   - 같은 방식으로 각 파일 추가

   #### WebApp.html
   - `파일` → `새로 만들기` → `HTML`
   - 이름: `WebApp`
   - 내용: `src/WebApp.html` 복사

   #### appsscript.json
   - 프로젝트 설정 (톱니바퀴) → "appsscript.json 매니페스트 파일 표시" 체크
   - 내용: `src/appsscript.json` 복사

### 3단계: Salt 생성 및 설정

1. **Salt 생성**
   ```javascript
   // Apps Script 에디터에서 실행
   function generateSalt() {
     const salt = generateRandomSalt();
     Logger.log('생성된 Salt: ' + salt);
   }
   ```

2. **Config.gs 업데이트**
   - 생성된 Salt를 복사
   - `Config.gs`의 `SECURITY_CONFIG.SALT`에 붙여넣기
   - 저장 (Ctrl+S)

### 4단계: 초기 설정 실행

1. **비밀번호 컬럼 설정**
   ```javascript
   // 실행 함수: setupPasswordColumns
   setupPasswordColumns();
   ```
   - 실행 버튼 클릭
   - 권한 승인 (처음 실행 시)
   - 로그 확인: 비밀번호변경일, 변경횟수 컬럼 추가 확인

2. **배포 검증**
   ```javascript
   // 실행 함수: validateDeploymentChecklist
   validateDeploymentChecklist();
   ```
   - 모든 항목이 ✅ 인지 확인
   - ❌ 항목이 있다면 해결 후 다시 실행

3. **시스템 테스트**
   ```javascript
   // 실행 함수: runIntegrationTests
   runIntegrationTests();
   ```
   - 모든 테스트 통과 확인

### 5단계: 배포

#### 방법 1: GitHub Pages / Vercel 배포 (추천)

**A. GitHub Pages**

1. **GitHub 저장소 생성**
   ```bash
   # 저장소 초기화
   git init
   git add .
   git commit -m "Initial commit"

   # 원격 저장소 연결
   git remote add origin https://github.com/[username]/student-portfolio.git
   git push -u origin main
   ```

2. **GitHub Pages 활성화**
   - Settings → Pages
   - Source: `main` 브랜치
   - Save
   - URL: `https://[username].github.io/student-portfolio`

**B. Vercel 배포**

1. **Vercel 프로젝트 생성**
   - [Vercel](https://vercel.com) 접속
   - GitHub로 로그인
   - New Project → GitHub 저장소 선택

2. **배포 설정**
   - Framework: `Other`
   - Build Command: (비워둠)
   - Output Directory: `.`
   - Deploy

3. **URL 확인**
   ```
   https://student-portfolio-[random].vercel.app
   ```

#### 방법 2: Google Apps Script 배포 (기존)

1. **배포 시작**
   - `배포` → `새 배포` 클릭

2. **배포 설정**
   - **유형 선택**: 웹 앱
   - **설명**: `v1.0.0 - 초기 배포`
   - **다음 계정으로 실행**: 나
   - **액세스 권한**: `모든 사용자` (개인 접근)

3. **배포 실행**
   - `배포` 버튼 클릭
   - 액세스 승인 (필요 시)
   - **웹 앱 URL** 복사

4. **URL 형식 확인**
   ```
   https://script.google.com/macros/s/[SCRIPT_ID]/exec
   ```

### 6단계: 초기 비밀번호 설정

#### 방법 1: 관리자 함수로 개별 설정

```javascript
function setInitialPasswords() {
  // 학생별로 초기 비밀번호 설정
  resetStudentPassword('20240101', 'temp1234');
  resetStudentPassword('20240102', 'temp5678');
  // ...
}
```

#### 방법 2: 일괄 설정 (신중하게!)

```javascript
function bulkSetPasswords() {
  // 특정 학생들에게만
  const studentIds = ['20240101', '20240102', '20240103'];
  bulkResetPasswords('temp1234', studentIds);
}
```

#### 방법 3: 평문 비밀번호 마이그레이션

```javascript
function migratePasswords() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('학생명단_전체');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const passwordCol = headers.indexOf('비밀번호');

  for (let i = 1; i < data.length; i++) {
    const plainPassword = data[i][passwordCol];

    // 평문인지 확인 (해시는 길이 50+ 문자)
    if (plainPassword && plainPassword.length < 50) {
      const hashed = hashPassword(plainPassword);
      sheet.getRange(i + 1, passwordCol + 1).setValue(hashed);
      Logger.log(`행 ${i + 1}: 비밀번호 해싱 완료`);
    }
  }
}
```

### 7단계: 웹앱 테스트

1. **브라우저에서 URL 열기**
   - 복사한 웹앱 URL 접속
   - 로그인 화면 확인

2. **테스트 로그인**
   - 테스트 학번/비밀번호 입력
   - 로그인 성공 확인
   - 학생 정보 표시 확인

3. **비밀번호 변경 테스트**
   - "비밀번호 변경" 클릭
   - 현재 비밀번호, 새 비밀번호 입력
   - 변경 성공 확인

4. **24시간 제한 테스트**
   - 비밀번호 변경 직후 다시 시도
   - "24시간에 1회만 변경 가능" 메시지 확인

---

## 🔄 업데이트 배포

코드 수정 후 업데이트 배포하는 방법:

### 1. 코드 수정

- Apps Script 에디터에서 코드 수정
- 저장 (Ctrl+S)

### 2. 새 배포

- `배포` → `배포 관리` 클릭
- 기존 배포 옆 연필 아이콘 클릭
- **새 버전** 선택
- 설명 입력 (예: `v1.1.0 - 버그 수정`)
- `배포` 클릭

### 3. URL 확인

- 웹앱 URL은 동일하게 유지됨
- 학생들은 그대로 사용 가능

---

## 🔧 배포 후 관리

### 백업 생성

```javascript
// 정기적으로 실행 권장
function createBackup() {
  backupStudentData();
}
```

### 오래된 백업 삭제

```javascript
// 30일 이상 된 백업 삭제
function cleanupBackups() {
  deleteOldBackups(30);
}
```

### 시스템 상태 확인

```javascript
// 정기적으로 실행
function checkSystem() {
  const status = checkSystemStatus();
  Logger.log(JSON.stringify(status, null, 2));
}
```

### 통계 조회

```javascript
function viewStats() {
  const stats = getPasswordChangeStats();
  Logger.log(JSON.stringify(stats, null, 2));
}
```

---

## 🛡️ 보안 점검

### 배포 직후 확인

1. **Salt 변경 확인**
   ```javascript
   diagnoseSystem();
   ```
   - "기본 Salt를 사용 중입니다" 메시지가 없어야 함

2. **접근 권한 확인**
   - 웹앱 설정에서 "액세스 권한" 확인
   - 도메인 사용자만 접근 가능해야 함

3. **시트 권한 확인**
   - Google Sheets 공유 설정 확인
   - 학생은 직접 접근 불가해야 함

### 정기 점검

```javascript
// 월 1회 실행 권장
function monthlySecurityCheck() {
  // 1. 시스템 진단
  diagnoseSystem();

  // 2. 보안 테스트
  runSecurityTests();

  // 3. 의심 활동 확인
  // (보안감사로그 시트 확인)
}
```

---

## 📱 URL 공유

### 학생들에게 공유하는 방법

1. **공지사항 작성**
   ```
   📚 학생 포트폴리오 시스템 안내

   접속 URL: https://script.google.com/macros/s/[YOUR_ID]/exec

   - 학번: 5자리 학번
   - 초기 비밀번호: [초기 비밀번호 안내]

   ※ 첫 로그인 후 반드시 비밀번호를 변경하세요!
   ```

2. **QR 코드 생성** (선택)
   - QR 코드 생성기로 URL을 QR 코드로 변환
   - 교실에 게시

3. **북마크 안내**
   - 학생들에게 북마크 저장 권장
   - 모바일에서는 홈 화면에 추가

---

## 🔍 트러블슈팅

### 문제 1: "권한이 없습니다" 오류

**해결:**
1. Apps Script 에디터 → 프로젝트 설정
2. "appsscript.json 매니페스트 파일 표시" 체크
3. `oauthScopes` 확인
4. 저장 후 재배포

### 문제 2: 웹앱이 로드되지 않음

**해결:**
1. 배포 관리에서 활성 배포 확인
2. URL이 `/exec`로 끝나는지 확인 (`/dev` 아님)
3. 시크릿 브라우징 모드에서 테스트
4. Apps Script 로그 확인 (Ctrl+Enter)

### 문제 3: 비밀번호 변경 안됨

**해결:**
```javascript
// 관리자가 직접 초기화
function emergencyReset() {
  resetStudentPassword('20240101', 'newpass123');
}
```

### 문제 4: 느린 응답 속도

**해결:**
1. 캐시 확인 및 정리
   ```javascript
   clearAllCache();
   ```

2. 데이터 정리
   - 졸업생 데이터 아카이브
   - 별도 시트로 이동

---

## 📊 모니터링

### 사용 통계 확인

```javascript
function viewUsageStats() {
  const stats = getPasswordChangeStats();

  Logger.log('=== 사용 통계 ===');
  Logger.log(`총 학생 수: ${stats.stats.totalStudents}명`);
  Logger.log(`비밀번호 변경 학생: ${stats.stats.studentsWithChanges}명`);
  Logger.log(`총 변경 횟수: ${stats.stats.totalChanges}회`);
  Logger.log(`평균 변경 횟수: ${stats.stats.averageChanges}회/학생`);
}
```

### 시스템 로그 확인

1. Apps Script 에디터 → 실행 로그 (Ctrl+Enter)
2. Google Cloud Console → 로그 탐색기 (고급)
3. 보안감사로그 시트 확인

---

## 🎉 배포 완료!

배포가 완료되었습니다. 이제 학생들이 시스템을 사용할 수 있습니다.

### 다음 단계

1. ✅ 학생들에게 URL 공유
2. ✅ 초기 비밀번호 안내
3. ✅ 사용 방법 교육
4. ✅ 정기 백업 스케줄 설정
5. ✅ 월간 보안 점검 일정 수립

문제가 발생하면 [트러블슈팅](#-트러블슈팅) 섹션을 참고하거나 GitHub Issues에 문의하세요.

**Good Luck! 🚀**
