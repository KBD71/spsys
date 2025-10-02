# API 문서

학생 포트폴리오 시스템의 주요 API 함수들에 대한 상세 문서입니다.

---

## 목차

1. [비밀번호 관리](#비밀번호-관리)
   - [changeStudentPassword](#changestudentpassword)
   - [resetStudentPassword](#resetstudentpassword)
2. [시스템 관리](#시스템-관리)
   - [setupPasswordColumns](#setuppasswordcolumns)
3. [인증](#인증)
   - [authenticateStudent](#authenticatestudent)
4. [보안 유틸리티](#보안-유틸리티)
   - [hashPassword](#hashpassword)
   - [verifyPassword](#verifypassword)
   - [checkRateLimit](#checkratelimit)

---

## 비밀번호 관리

### changeStudentPassword

학생의 비밀번호를 변경하는 메인 함수입니다. 24시간 변경 제한, Rate Limiting, 비밀번호 해싱 등 모든 보안 검증을 포함합니다.

#### 매개변수

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `studentId` | `string` | ✅ | 5자리 학번 |
| `currentPassword` | `string` | ✅ | 현재 비밀번호 (평문) |
| `newPassword` | `string` | ✅ | 새 비밀번호 (평문, 4-20자) |

#### 반환값

**타입:** `Object`

```javascript
{
  success: boolean,    // 성공 여부
  message: string      // 결과 메시지
}
```

#### 사용 예시

```javascript
// 성공 케이스
const result = changeStudentPassword('20240101', 'oldpass123', 'newpass456');
console.log(result);
// { success: true, message: '비밀번호가 성공적으로 변경되었습니다.' }

// 실패 케이스 - 현재 비밀번호 불일치
const result = changeStudentPassword('20240101', 'wrongpass', 'newpass456');
console.log(result);
// { success: false, message: '현재 비밀번호가 올바르지 않습니다.' }
```

#### 에러 케이스

| 에러 상황 | 반환 메시지 |
|-----------|-------------|
| 빈 값 입력 | "비밀번호를 입력해주세요." |
| 현재 비밀번호 불일치 | "현재 비밀번호가 올바르지 않습니다." |
| 새 비밀번호 = 현재 비밀번호 | "새 비밀번호는 현재 비밀번호와 달라야 합니다." |
| 비밀번호 길이 부족 (< 4자) | "새 비밀번호는 최소 4자 이상이어야 합니다." |
| 비밀번호 길이 초과 (> 20자) | "새 비밀번호는 최대 20자까지 가능합니다." |
| 24시간 내 재변경 시도 | "비밀번호는 24시간에 1회만 변경 가능합니다. (N시간 후 변경 가능)" |
| Rate Limit 초과 | "너무 많은 시도가 있었습니다. N분 후 다시 시도하세요." |
| 학생 정보 없음 | "학생 정보를 찾을 수 없습니다." |
| Race Condition | "서버가 바쁩니다. 잠시 후 다시 시도해주세요." |
| 시스템 오류 | "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요." |

#### 보안 기능

- ✅ **LockService**: Race Condition 방지
- ✅ **Rate Limiting**: 15분 내 3회 제한
- ✅ **Password Hashing**: SHA-256 + Salt
- ✅ **24시간 제한**: 하루 1회만 변경 가능
- ✅ **Safe Logging**: 학번/이름 마스킹

#### 주의사항

⚠️ 이 함수는 웹앱에서 직접 호출됩니다. 민감한 정보가 로그에 기록되지 않도록 `safeLog()`를 사용합니다.

---

### resetStudentPassword

관리자용 비밀번호 강제 초기화 함수입니다. 24시간 제한을 무시하고 비밀번호를 변경할 수 있습니다.

#### 매개변수

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `studentId` | `string` | ✅ | 5자리 학번 |
| `newPassword` | `string` | ✅ | 새 비밀번호 (평문, 4-20자) |

#### 반환값

**타입:** `Object`

```javascript
{
  success: boolean,    // 성공 여부
  message: string      // 결과 메시지 (학생 이름 포함)
}
```

#### 사용 예시

```javascript
// 관리자가 학생의 비밀번호를 초기화
const result = resetStudentPassword('20240101', 'temp1234');
console.log(result);
// { success: true, message: '홍길동 학생의 비밀번호가 초기화되었습니다.' }

// 실패 케이스 - 학생 정보 없음
const result = resetStudentPassword('99999', 'temp1234');
console.log(result);
// { success: false, message: '학생 정보를 찾을 수 없습니다.' }
```

#### 에러 케이스

| 에러 상황 | 반환 메시지 |
|-----------|-------------|
| 빈 값 입력 | "학번과 새 비밀번호를 입력해주세요." |
| 비밀번호 길이 부족 | "비밀번호는 최소 4자 이상이어야 합니다." |
| 비밀번호 길이 초과 | "비밀번호는 최대 20자까지 가능합니다." |
| 학생 정보 없음 | "학생 정보를 찾을 수 없습니다." |
| 시스템 오류 | "비밀번호 초기화 중 오류가 발생했습니다." |

#### 주요 차이점

| 기능 | changeStudentPassword | resetStudentPassword |
|------|----------------------|---------------------|
| 현재 비밀번호 확인 | ✅ 필요 | ❌ 불필요 |
| 24시간 제한 | ✅ 적용 | ❌ 무시 |
| Rate Limiting | ✅ 적용 | ❌ 무시 |
| 사용 대상 | 학생 본인 | 관리자 |

#### 보안 주의사항

⚠️ **위험:** 이 함수는 모든 보안 제한을 우회합니다. 관리자만 실행할 수 있도록 접근 제어를 구현하세요.

```javascript
// 추천: 관리자 권한 체크 추가
function resetStudentPassword(studentId, newPassword) {
  // 관리자 확인
  const user = Session.getActiveUser().getEmail();
  const admins = ['admin@school.com', 'teacher@school.com'];

  if (!admins.includes(user)) {
    return {
      success: false,
      message: '관리자 권한이 필요합니다.'
    };
  }

  // 기존 로직...
}
```

---

## 시스템 관리

### setupPasswordColumns

'학생명단_전체' 시트에 비밀번호 관리에 필요한 컬럼을 자동으로 추가하는 함수입니다.

#### 매개변수

**없음**

#### 반환값

**없음** (void)

로그로 결과를 출력합니다.

#### 추가되는 컬럼

| 컬럼명 | 설명 | 초기값 |
|--------|------|--------|
| `비밀번호변경일` | 마지막 비밀번호 변경 일시 | 빈 값 |
| `변경횟수` | 비밀번호 변경 총 횟수 | 0 |

#### 헤더 스타일

- **배경색:** `#667eea` (보라색)
- **글자색:** `#ffffff` (흰색)
- **글자 굵기:** 굵게
- **정렬:** 가운데

#### 사용 예시

```javascript
// Apps Script 에디터에서 직접 실행
setupPasswordColumns();

// 로그 출력 예시:
// === 비밀번호 컬럼 설정 시작 ===
// 현재 컬럼 수: 5
// 현재 헤더: 학번, 이름, 반, 비밀번호, 이메일
// ✓ '비밀번호변경일' 컬럼 추가됨 (마지막 비밀번호 변경 일시)
// ✓ '변경횟수' 컬럼 추가됨 (비밀번호 변경 총 횟수)
//
// 총 2개의 컬럼이 추가되었습니다.
// === 비밀번호 컬럼 설정 완료 ===
```

#### 중복 실행

이미 컬럼이 존재하는 경우:

```javascript
setupPasswordColumns();

// 로그 출력:
// === 비밀번호 컬럼 설정 시작 ===
// 현재 컬럼 수: 7
// 현재 헤더: 학번, 이름, 반, 비밀번호, 이메일, 비밀번호변경일, 변경횟수
// - '비밀번호변경일' 컬럼은 이미 존재함 (위치: 6)
// - '변경횟수' 컬럼은 이미 존재함 (위치: 7)
//
// 필요한 모든 컬럼이 이미 존재합니다.
// === 비밀번호 컬럼 설정 완료 ===
```

✅ 안전하게 여러 번 실행 가능합니다.

#### 에러 케이스

| 에러 상황 | 로그 메시지 |
|-----------|-------------|
| 시트를 찾을 수 없음 | "오류: '학생명단_전체' 시트를 찾을 수 없습니다." |
| 시스템 오류 | "비밀번호 컬럼 설정 오류: [에러 메시지]" |

#### 실행 시점

🕐 **권장 시점:**
- 시스템 최초 설정 시 1회 실행
- 새 학년도 시작 시 (새 시트 생성 후)
- 시트 구조 변경 후

---

## 인증

### authenticateStudent

학생 로그인을 처리하는 인증 함수입니다. Rate Limiting과 비밀번호 해싱 검증을 포함합니다.

#### 매개변수

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `studentId` | `string` | ✅ | 5자리 학번 |
| `password` | `string` | ✅ | 비밀번호 (평문) |

#### 반환값

**타입:** `Object`

**성공 시:**
```javascript
{
  success: true,
  message: '로그인 성공',
  studentId: '20240101',
  name: '홍길동',
  class: '1-1'
}
```

**실패 시:**
```javascript
{
  success: false,
  message: '학번 또는 비밀번호가 올바르지 않습니다.'
}
```

#### 사용 예시

```javascript
// 웹앱에서 호출
google.script.run
  .withSuccessHandler(handleLoginSuccess)
  .withFailureHandler(handleLoginError)
  .authenticateStudent('20240101', 'mypassword');

function handleLoginSuccess(result) {
  if (result.success) {
    console.log(`환영합니다, ${result.name}님!`);
    // 메뉴 화면 표시
  } else {
    console.log(result.message);
  }
}
```

#### 에러 케이스

| 에러 상황 | 반환 메시지 |
|-----------|-------------|
| 빈 값 입력 | "학번과 비밀번호를 입력해주세요." |
| 학번 형식 오류 | "학번 형식이 올바르지 않습니다." |
| 학번 또는 비밀번호 불일치 | "학번 또는 비밀번호가 올바르지 않습니다." |
| 비밀번호 미설정 | "비밀번호가 설정되지 않았습니다. 관리자에게 문의하세요." |
| Rate Limit 초과 | "너무 많은 시도가 있었습니다. N분 후 다시 시도하세요." |
| 시스템 오류 | "로그인 중 오류가 발생했습니다." |

#### 보안 기능

- ✅ **Rate Limiting**: 15분 내 5회 제한
- ✅ **Password Hashing**: SHA-256 검증
- ✅ **Generic Error Message**: 학번/비밀번호 중 뭐가 틀렸는지 노출 안 함 (보안)
- ✅ **Safe Logging**: 학번 마스킹 (`20240` → `202**`)

#### Rate Limit 초기화

로그인 성공 시 자동으로 Rate Limit이 초기화됩니다.

---

## 보안 유틸리티

### hashPassword

비밀번호를 SHA-256 알고리즘과 Salt를 사용하여 안전하게 해싱합니다.

#### 매개변수

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `password` | `string` | ✅ | 평문 비밀번호 |

#### 반환값

**타입:** `string`

Base64로 인코딩된 해시 문자열

#### 사용 예시

```javascript
const password = 'mySecretPassword123';
const hashed = hashPassword(password);
console.log(hashed);
// "j8fK3m9pL2vN7qR4tY6wZ8xC1bD5eF9gH3iJ7kL0mN2oP4="

// 같은 비밀번호는 항상 같은 해시 생성
const hashed2 = hashPassword('mySecretPassword123');
console.log(hashed === hashed2); // true
```

#### 주의사항

⚠️ **Salt 변경 시 주의:**
- `Config.gs`의 `SECURITY_CONFIG.SALT` 값을 변경하면 모든 기존 해시가 무효화됩니다.
- 배포 전에 Salt를 변경하고, 이후에는 **절대 변경하지 마세요**.

---

### verifyPassword

평문 비밀번호와 해시를 비교하여 일치 여부를 확인합니다.

#### 매개변수

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `plainPassword` | `string` | ✅ | 평문 비밀번호 |
| `hashedPassword` | `string` | ✅ | 해싱된 비밀번호 |

#### 반환값

**타입:** `boolean`

- `true`: 비밀번호 일치
- `false`: 비밀번호 불일치 또는 오류

#### 사용 예시

```javascript
const storedHash = 'j8fK3m9pL2vN7qR4tY6wZ8xC1bD5eF9gH3iJ7kL0mN2oP4=';

// 올바른 비밀번호
const isValid = verifyPassword('mySecretPassword123', storedHash);
console.log(isValid); // true

// 잘못된 비밀번호
const isValid = verifyPassword('wrongPassword', storedHash);
console.log(isValid); // false
```

---

### checkRateLimit

특정 행동에 대한 Rate Limiting을 체크하고 시도를 기록합니다.

#### 매개변수

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `identifier` | `string` | ✅ | 식별자 (학번 등) |
| `action` | `string` | ✅ | 액션 타입 (`'login'` 또는 `'password_change'`) |

#### 반환값

**타입:** `Object`

```javascript
{
  allowed: boolean,           // 허용 여부
  message: string,            // 메시지
  remainingAttempts: number   // 남은 시도 횟수
}
```

#### 사용 예시

```javascript
// 로그인 시도 전 체크
const check = checkRateLimit('20240101', 'login');

if (check.allowed) {
  console.log(`로그인 시도 가능 (남은 횟수: ${check.remainingAttempts})`);
  // 로그인 로직 실행
} else {
  console.log(check.message);
  // "너무 많은 시도가 있었습니다. 10분 후 다시 시도하세요."
}
```

#### Rate Limit 설정

| 액션 | 최대 시도 | 시간 윈도우 |
|------|-----------|-------------|
| `login` | 5회 | 15분 |
| `password_change` | 3회 | 15분 |

설정 변경: `Config.gs` → `RATE_LIMIT_CONFIG`

#### 초기화

성공적인 작업 완료 시 `resetRateLimit()`를 호출하여 초기화합니다.

```javascript
// 로그인 성공 시
resetRateLimit(studentId, 'login');
```

---

## 에러 코드 및 메시지

### 일반 에러

| 코드 | 메시지 | 설명 |
|------|--------|------|
| `INPUT_REQUIRED` | "필수 입력값이 누락되었습니다." | 매개변수 누락 |
| `INVALID_FORMAT` | "입력 형식이 올바르지 않습니다." | 형식 검증 실패 |
| `NOT_FOUND` | "요청한 리소스를 찾을 수 없습니다." | 데이터 없음 |
| `UNAUTHORIZED` | "권한이 없습니다." | 인증/권한 실패 |
| `RATE_LIMIT` | "요청 제한을 초과했습니다." | Rate Limit 초과 |
| `SERVER_ERROR` | "서버 오류가 발생했습니다." | 시스템 오류 |

### 비밀번호 관련 에러

| 코드 | 메시지 |
|------|--------|
| `PASSWORD_TOO_SHORT` | "비밀번호는 최소 4자 이상이어야 합니다." |
| `PASSWORD_TOO_LONG` | "비밀번호는 최대 20자까지 가능합니다." |
| `PASSWORD_MISMATCH` | "현재 비밀번호가 올바르지 않습니다." |
| `PASSWORD_SAME` | "새 비밀번호는 현재 비밀번호와 달라야 합니다." |
| `PASSWORD_CHANGE_LIMIT` | "비밀번호는 24시간에 1회만 변경 가능합니다." |

---

## 버전 정보

- **API 버전:** 1.0.0
- **최종 업데이트:** 2025-10-01
- **호환성:** Google Apps Script V8 Runtime

---

## 추가 리소스

- [설정 가이드](./SETUP.md)
- [변경 이력](./CHANGELOG.md)
- [GitHub 저장소](https://github.com/your-repo/student-portfolio-system)
