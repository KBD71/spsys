# 함수 레퍼런스

학생 포트폴리오 시스템의 모든 함수에 대한 상세 설명입니다.

---

## 📑 목차

- [Main.gs - 메인 진입점](#maings---메인-진입점)
- [Config.gs - 시스템 설정](#confings---시스템-설정)
- [SecurityUtils.gs - 보안 유틸리티](#securityutilsgs---보안-유틸리티)
- [Security.gs - 고급 보안](#securitygs---고급-보안)
- [PasswordManager.gs - 비밀번호 관리](#passwordmanagergs---비밀번호-관리)
- [AdminUtils.gs - 관리자 도구](#adminutilsgs---관리자-도구)
- [Utils.gs - 유틸리티](#utilsgs---유틸리티)
- [Tests.gs - 테스트](#testsgs---테스트)

---

## Main.gs - 메인 진입점

### `doGet(e)`

웹앱 진입점 함수입니다.

**매개변수:**
- `e` (Object): 요청 이벤트 객체

**반환값:**
- `HtmlOutput`: 웹앱 HTML 출력

**예시:**
```javascript
// Google Apps Script가 자동으로 호출
// 직접 호출 불필요
```

---

### `initializeWebApp()`

웹앱 초기 설정을 수행합니다.

**반환값:**
- `Object`: `{ success: boolean, message: string }`

**예시:**
```javascript
const result = initializeWebApp();
Logger.log(result.message);
```

---

### `checkSystemStatus()`

시스템 상태를 확인합니다.

**반환값:**
- `Object`: 시스템 상태 정보
  ```javascript
  {
    status: 'ok' | 'error',
    message: string,
    studentCount: number,
    sheetName: string,
    lastUpdate: Date
  }
  ```

**예시:**
```javascript
const status = checkSystemStatus();
if (status.status === 'ok') {
  Logger.log(`학생 수: ${status.studentCount}명`);
}
```

---

### `runFullSystemTest()`

전체 시스템 테스트를 실행합니다.

**예시:**
```javascript
runFullSystemTest();
// 로그에서 테스트 결과 확인
```

---

### `validateDeploymentChecklist()`

배포 전 체크리스트를 검증합니다.

**반환값:**
- `Object`: `{ allPassed: boolean, checks: Array }`

**예시:**
```javascript
const validation = validateDeploymentChecklist();
if (!validation.allPassed) {
  Logger.log('배포 준비가 완료되지 않았습니다.');
}
```

---

## Config.gs - 시스템 설정

### `getPasswordConfig()`

비밀번호 설정을 반환합니다.

**반환값:**
```javascript
{
  MIN_LENGTH: 4,
  MAX_LENGTH: 20,
  CHANGE_LIMIT_HOURS: 24
}
```

---

### `getSheetNames()`

시트 이름 설정을 반환합니다.

**반환값:**
```javascript
{
  STUDENTS: '학생명단_전체',
  ASSIGNMENTS: '과제설정',
  EVALUATION: '평가항목설정'
}
```

---

### `getColumnNames()`

컬럼 이름 설정을 반환합니다.

**반환값:**
```javascript
{
  STUDENT_ID: '학번',
  PASSWORD: '비밀번호',
  NAME: '이름',
  CLASS: '반',
  LAST_CHANGE_DATE: '비밀번호변경일',
  CHANGE_COUNT: '변경횟수'
}
```

---

## SecurityUtils.gs - 보안 유틸리티

### `hashPassword(password)`

비밀번호를 SHA-256으로 해싱합니다.

**매개변수:**
- `password` (string): 평문 비밀번호

**반환값:**
- `string`: Base64 인코딩된 해시

**예시:**
```javascript
const hashed = hashPassword('mypassword');
Logger.log(hashed); // "j8fK3m9pL2..."
```

---

### `verifyPassword(plainPassword, hashedPassword)`

비밀번호를 검증합니다.

**매개변수:**
- `plainPassword` (string): 평문 비밀번호
- `hashedPassword` (string): 해싱된 비밀번호

**반환값:**
- `boolean`: 일치 여부

**예시:**
```javascript
const isValid = verifyPassword('mypassword', hashedPassword);
if (isValid) {
  Logger.log('비밀번호 일치');
}
```

---

### `authenticateStudent(studentId, password)`

학생 인증을 수행합니다.

**매개변수:**
- `studentId` (string): 학번
- `password` (string): 비밀번호

**반환값:**
```javascript
{
  success: boolean,
  message: string,
  studentId?: string,
  name?: string,
  class?: string
}
```

**예시:**
```javascript
const result = authenticateStudent('20240101', 'password123');
if (result.success) {
  Logger.log(`환영합니다, ${result.name}님!`);
}
```

---

### `checkRateLimit(identifier, action)`

Rate Limiting을 체크합니다.

**매개변수:**
- `identifier` (string): 식별자 (학번 등)
- `action` (string): 액션 타입 (`'login'` 또는 `'password_change'`)

**반환값:**
```javascript
{
  allowed: boolean,
  message: string,
  remainingAttempts: number
}
```

**예시:**
```javascript
const check = checkRateLimit('20240101', 'login');
if (!check.allowed) {
  Logger.log(check.message);
}
```

---

### `resetRateLimit(identifier, action)`

Rate Limit을 리셋합니다.

**매개변수:**
- `identifier` (string): 식별자
- `action` (string): 액션 타입

**예시:**
```javascript
resetRateLimit('20240101', 'login');
```

---

## Security.gs - 고급 보안

### `generateRandomSalt()`

랜덤 Salt를 생성합니다.

**반환값:**
- `string`: 생성된 Salt

**예시:**
```javascript
const salt = generateRandomSalt();
// Config.gs의 SECURITY_CONFIG.SALT에 복사
```

---

### `checkPasswordStrength(password)`

비밀번호 강도를 검사합니다.

**매개변수:**
- `password` (string): 검사할 비밀번호

**반환값:**
```javascript
{
  score: number,
  strength: 'weak' | 'medium' | 'strong',
  suggestions: string[]
}
```

**예시:**
```javascript
const strength = checkPasswordStrength('Pass123!');
Logger.log(`강도: ${strength.strength} (점수: ${strength.score})`);
```

---

### `validateSecureInput(input, type)`

입력값을 보안 검증합니다.

**매개변수:**
- `input` (string): 검증할 입력값
- `type` (string): 입력 타입 (`'studentId'`, `'password'`, `'general'`)

**반환값:**
```javascript
{
  valid: boolean,
  sanitized: string,
  warnings: string[]
}
```

**예시:**
```javascript
const validation = validateSecureInput('<script>alert("xss")</script>', 'general');
if (!validation.valid) {
  Logger.log('위험한 입력: ' + validation.warnings.join(', '));
}
```

---

### `logSecurityEvent(eventType, details)`

보안 감사 로그를 기록합니다.

**매개변수:**
- `eventType` (string): 이벤트 타입
- `details` (Object): 상세 정보

**예시:**
```javascript
logSecurityEvent('SUSPICIOUS_LOGIN', {
  studentId: '20240101',
  attemptCount: 5
});
```

---

## PasswordManager.gs - 비밀번호 관리

### `changeStudentPassword(studentId, currentPassword, newPassword)`

학생 비밀번호를 변경합니다.

**매개변수:**
- `studentId` (string): 학번
- `currentPassword` (string): 현재 비밀번호
- `newPassword` (string): 새 비밀번호

**반환값:**
```javascript
{
  success: boolean,
  message: string
}
```

**예시:**
```javascript
const result = changeStudentPassword('20240101', 'old123', 'new456');
Logger.log(result.message);
```

---

### `findStudentData(studentId)`

학생 데이터를 찾습니다.

**매개변수:**
- `studentId` (string): 학번

**반환값:**
```javascript
{
  found: boolean,
  row?: number,
  password?: string,
  name?: string,
  class?: string,
  lastChangeDate?: Date,
  changeCount?: number
}
```

**예시:**
```javascript
const student = findStudentData('20240101');
if (student.found) {
  Logger.log(`${student.name} (${student.class})`);
}
```

---

### `checkChangeLimit(lastChangeDate)`

24시간 변경 제한을 확인합니다.

**매개변수:**
- `lastChangeDate` (Date): 마지막 변경일

**반환값:**
```javascript
{
  allowed: boolean,
  message: string
}
```

---

## AdminUtils.gs - 관리자 도구

### `setupPasswordColumns()`

비밀번호 관련 컬럼을 자동으로 추가합니다.

**예시:**
```javascript
setupPasswordColumns();
// 비밀번호변경일, 변경횟수 컬럼 추가
```

---

### `resetStudentPassword(studentId, newPassword)`

관리자가 비밀번호를 강제로 초기화합니다.

**매개변수:**
- `studentId` (string): 학번
- `newPassword` (string): 새 비밀번호

**반환값:**
```javascript
{
  success: boolean,
  message: string
}
```

**예시:**
```javascript
const result = resetStudentPassword('20240101', 'temp1234');
Logger.log(result.message);
```

---

### `getSystemInfo()`

시스템 정보를 출력합니다.

**예시:**
```javascript
getSystemInfo();
// 로그에서 시스템 정보 확인
```

---

## Utils.gs - 유틸리티

### `clearAllCache()`

모든 캐시를 초기화합니다.

**반환값:**
```javascript
{
  success: boolean,
  message: string
}
```

---

### `backupStudentData()`

학생 데이터를 백업합니다.

**반환값:**
```javascript
{
  success: boolean,
  message: string,
  sheetName?: string,
  timestamp?: Date
}
```

**예시:**
```javascript
const backup = backupStudentData();
Logger.log(`백업 완료: ${backup.sheetName}`);
```

---

### `deleteOldBackups(daysToKeep)`

오래된 백업을 삭제합니다.

**매개변수:**
- `daysToKeep` (number): 보관할 일수 (기본: 30일)

**반환값:**
```javascript
{
  success: boolean,
  message: string,
  deletedCount: number,
  deletedSheets: string[]
}
```

**예시:**
```javascript
const result = deleteOldBackups(30);
Logger.log(`${result.deletedCount}개의 백업 삭제됨`);
```

---

### `searchStudents(query)`

학생을 검색합니다.

**매개변수:**
- `query` (string): 검색어 (학번, 이름, 반)

**반환값:**
```javascript
{
  success: boolean,
  message: string,
  results: Array<{
    row: number,
    studentId: string,
    name: string,
    class: string
  }>,
  count: number
}
```

**예시:**
```javascript
const result = searchStudents('1-1');
Logger.log(`${result.count}명 검색됨`);
result.results.forEach(student => {
  Logger.log(`${student.name} (${student.studentId})`);
});
```

---

### `getPasswordChangeStats()`

비밀번호 변경 통계를 조회합니다.

**반환값:**
```javascript
{
  success: boolean,
  stats: {
    totalStudents: number,
    studentsWithChanges: number,
    totalChanges: number,
    neverChanged: number,
    changedOnce: number,
    changedMultiple: number,
    averageChanges: string,
    lastChanges: Array
  }
}
```

**예시:**
```javascript
const stats = getPasswordChangeStats();
Logger.log(`총 변경 횟수: ${stats.stats.totalChanges}회`);
```

---

### `bulkResetPasswords(defaultPassword, studentIds)`

일괄 비밀번호 초기화를 수행합니다.

**매개변수:**
- `defaultPassword` (string): 초기 비밀번호
- `studentIds` (Array): 대상 학번 배열 (비어있으면 전체)

**반환값:**
```javascript
{
  success: boolean,
  message: string,
  resetCount: number,
  errors: Array
}
```

**⚠️ 주의:** 전체 초기화는 매우 위험합니다!

**예시:**
```javascript
// 특정 학생만
const result = bulkResetPasswords('temp1234', ['20240101', '20240102']);

// 전체 (위험!)
const result = bulkResetPasswords('temp1234', []);
```

---

### `diagnoseSystem()`

시스템 진단을 수행합니다.

**반환값:**
```javascript
{
  success: boolean,
  diagnosis: {
    timestamp: Date,
    checks: Array,
    issues: string[],
    recommendations: string[]
  }
}
```

**예시:**
```javascript
const diagnosis = diagnoseSystem();
if (!diagnosis.success) {
  diagnosis.diagnosis.issues.forEach(issue => {
    Logger.log(`문제: ${issue}`);
  });
}
```

---

## Tests.gs - 테스트

### `runIntegrationTests()`

통합 테스트를 실행합니다.

**반환값:**
```javascript
{
  total: number,
  passed: number,
  failed: number,
  tests: Array
}
```

**예시:**
```javascript
const results = runIntegrationTests();
Logger.log(`통과: ${results.passed}/${results.total}`);
```

---

### `runPerformanceTests()`

성능 테스트를 실행합니다.

**반환값:**
- `Array`: 성능 측정 결과

**예시:**
```javascript
const results = runPerformanceTests();
results.forEach(result => {
  Logger.log(`${result.name}: ${result.duration}ms`);
});
```

---

### `runStressTest()`

스트레스 테스트를 실행합니다.

**반환값:**
```javascript
{
  iterations: number,
  successCount: number,
  failCount: number,
  totalDuration: number,
  averageDuration: number
}
```

---

### `runAllTests()`

모든 테스트를 실행합니다.

**반환값:**
```javascript
{
  integration: Object,
  performance: Array
}
```

**예시:**
```javascript
runAllTests();
// 로그에서 전체 테스트 결과 확인
```

---

## 🔧 사용 예시

### 전체 시스템 초기화

```javascript
function initialize() {
  // 1. 비밀번호 컬럼 설정
  setupPasswordColumns();

  // 2. 시스템 정보 확인
  getSystemInfo();

  // 3. 배포 검증
  const validation = validateDeploymentChecklist();
  if (!validation.allPassed) {
    Logger.log('배포 준비 미완료');
    return;
  }

  // 4. 테스트 실행
  runIntegrationTests();

  Logger.log('초기화 완료!');
}
```

### 정기 유지보수

```javascript
function monthlyMaintenance() {
  // 1. 백업 생성
  backupStudentData();

  // 2. 오래된 백업 삭제
  deleteOldBackups(30);

  // 3. 시스템 진단
  diagnoseSystem();

  // 4. 통계 조회
  const stats = getPasswordChangeStats();
  Logger.log(JSON.stringify(stats.stats, null, 2));

  // 5. 캐시 정리
  clearAllCache();

  Logger.log('유지보수 완료!');
}
```

### 학생 비밀번호 초기화

```javascript
function resetMultiplePasswords() {
  const studentsToReset = [
    { id: '20240101', password: 'temp1234' },
    { id: '20240102', password: 'temp5678' },
    { id: '20240103', password: 'temp9012' }
  ];

  studentsToReset.forEach(student => {
    const result = resetStudentPassword(student.id, student.password);
    Logger.log(`${student.id}: ${result.message}`);
  });
}
```

---

## 📚 추가 리소스

- [SETUP.md](./SETUP.md) - 설치 가이드
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 배포 가이드
- [API.md](./API.md) - API 레퍼런스
- [CHANGELOG.md](./CHANGELOG.md) - 변경 이력
