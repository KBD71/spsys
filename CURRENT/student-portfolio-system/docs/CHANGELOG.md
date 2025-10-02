# 변경 이력 (Changelog)

프로젝트의 모든 주요 변경 사항이 문서화되어 있습니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따르며,
이 프로젝트는 [Semantic Versioning](https://semver.org/lang/ko/)을 준수합니다.

---

## [Unreleased]

### 계획 중인 기능
- 이메일 알림 시스템
- 비밀번호 이력 관리 (재사용 방지)
- 2단계 인증 (OTP)
- 감사 로그 시스템
- 비밀번호 강도 측정기
- 모바일 앱 지원

---

## [1.0.0] - 2025-10-01

### ✨ 추가됨 (Added)

#### 핵심 기능
- **비밀번호 관리 시스템**
  - `changeStudentPassword()` - 학생 비밀번호 변경
  - `resetStudentPassword()` - 관리자용 비밀번호 초기화
  - 24시간 변경 제한 기능
  - 변경 이력 추적 (날짜, 횟수)

#### 보안 기능
- **비밀번호 해싱**
  - SHA-256 알고리즘 사용
  - Salt 기반 보안 강화
  - `hashPassword()` 및 `verifyPassword()` 함수
- **인증 시스템**
  - `authenticateStudent()` - 학생 로그인 인증
  - 안전한 비밀번호 검증
  - Generic 에러 메시지 (보안)
- **Rate Limiting**
  - 로그인: 15분 내 5회 제한
  - 비밀번호 변경: 15분 내 3회 제한
  - 자동 시도 횟수 추적
- **Race Condition 방지**
  - LockService를 사용한 동시성 제어
  - 데이터 무결성 보장
- **안전한 로깅**
  - PII 마스킹 기능 (`safeLog()`)
  - 학번/이름 자동 마스킹

#### 성능 최적화
- **캐싱 시스템**
  - 학생 데이터 캐싱 (1시간)
  - 헤더 캐싱
  - `findStudentDataOptimized()` 함수
  - API 호출 최소화
- **배치 업데이트**
  - 여러 필드 동시 업데이트
  - 스프레드시트 API 호출 감소

#### 웹 인터페이스
- **로그인 화면**
  - 학번/비밀번호 입력
  - 입력 검증 (5자리 숫자)
  - 실시간 피드백
- **메뉴 화면**
  - 학생 정보 표시
  - 과제 섹션 (placeholder)
  - 설정 메뉴
- **비밀번호 변경 화면**
  - 현재/새 비밀번호 입력
  - 비밀번호 확인
  - 규칙 안내
  - 실시간 일치 검증
- **UI/UX 개선**
  - 보라색 그라데이션 디자인
  - 반응형 레이아웃 (모바일 지원)
  - 부드러운 애니메이션
  - 접근성 고려 (ARIA 속성)

#### 관리 도구
- **setupPasswordColumns()** - 필수 컬럼 자동 추가
- **getSystemInfo()** - 시스템 정보 출력
- **testSecurity()** - 보안 기능 테스트
- **AdminUtils.gs** - 관리자 유틸리티 모음

#### 설정 관리
- **Config.gs**
  - 비밀번호 규칙 설정
  - 시트 이름 상수
  - 컬럼 이름 상수
  - Rate Limiting 설정
  - 보안 설정 (Salt, 캐시 등)

#### 문서화
- API 문서 (`docs/API.md`)
- 설치 가이드 (`docs/SETUP.md`)
- 변경 이력 (`docs/CHANGELOG.md`)
- README 파일 (`README.md`)

### 🔒 보안 개선 (Security)

- **XSS 방지**
  - Content Security Policy (CSP) 헤더 추가
  - `sanitizeText()` 함수로 입력값 정제
- **SQL Injection 방지**
  - Strict equality (===) 사용
  - 타입 검증 강화
- **접근 제어**
  - 웹앱 접근: DOMAIN 사용자만
  - OAuth 스코프 명시
  - 스프레드시트 권한 분리

### 🐛 수정됨 (Fixed)

- Date 비교 로직 개선 (타임존 고려)
- Null/undefined 안전 처리
- Off-by-one 에러 방지
- 에러 처리 표준화 (Fail Closed)
- 빈 문자열 vs null 일관성 개선

### ♻️ 변경됨 (Changed)

- **평문 비밀번호 → 해싱 저장** (Breaking Change)
- Loose equality (==) → Strict equality (===)
- Magic String → 상수화
- 개별 API 호출 → 배치 처리
- Fail Open → Fail Closed 에러 처리

### 🗑️ 제거됨 (Removed)

- 미사용 컬럼 인덱스 반환값
- 주석 처리된 코드 정리
- 불필요한 로깅 제거

---

## [0.9.0] - 2025-09-28 (Beta)

### 추가됨
- 기본 비밀번호 변경 기능 (평문 저장)
- 간단한 웹 UI
- Google Sheets 연동

### 알려진 문제
- ⚠️ 비밀번호 평문 저장 (보안 취약)
- ⚠️ 인증 미구현
- ⚠️ Race Condition 가능성

---

## 마이그레이션 가이드

### v0.9.0 → v1.0.0

#### ⚠️ Breaking Changes

1. **비밀번호 형식 변경**
   - 기존 평문 비밀번호는 사용 불가
   - 마이그레이션 스크립트 실행 필요

   ```javascript
   function migratePasswords() {
     // SETUP.md의 "초기 데이터 설정" 섹션 참조
   }
   ```

2. **웹앱 접근 권한 변경**
   - `ANYONE_ANONYMOUS` → `DOMAIN`
   - 재배포 필요

3. **새 OAuth 스코프 추가**
   - `script.storage` 스코프 추가
   - 사용자 재승인 필요

#### 업그레이드 절차

1. **백업 생성**
   ```
   Google Sheets → 파일 → 사본 만들기
   ```

2. **새 코드 배포**
   - 모든 .gs 및 .html 파일 업데이트
   - appsscript.json 업데이트

3. **Salt 설정**
   ```javascript
   // Config.gs
   SALT: '[생성된 랜덤 문자열]'
   ```

4. **비밀번호 마이그레이션**
   ```javascript
   migratePasswords(); // 한 번만 실행
   ```

5. **컬럼 추가**
   ```javascript
   setupPasswordColumns();
   ```

6. **웹앱 재배포**
   - 배포 → 새 배포 → v1.0.0

7. **테스트**
   - 로그인 테스트
   - 비밀번호 변경 테스트

---

## 버전 규칙

### 버전 번호 형식: MAJOR.MINOR.PATCH

- **MAJOR**: 하위 호환성이 깨지는 변경
- **MINOR**: 하위 호환성을 유지하는 기능 추가
- **PATCH**: 하위 호환성을 유지하는 버그 수정

### 태그

- `[Added]` - 새로운 기능
- `[Changed]` - 기존 기능 변경
- `[Deprecated]` - 곧 제거될 기능
- `[Removed]` - 제거된 기능
- `[Fixed]` - 버그 수정
- `[Security]` - 보안 관련 변경

---

## 기여 방법

변경 사항을 기록할 때:

1. **Unreleased 섹션**에 추가
2. 적절한 태그 사용
3. 명확하고 간결한 설명
4. Breaking Change는 ⚠️ 표시
5. 이슈 번호 참조 (#123)

예시:
```markdown
### Added
- 새 기능 설명 (#123)

### Fixed
- 버그 수정 설명 (#124)

### Changed
- ⚠️ Breaking: 하위 호환성 깨지는 변경 (#125)
```

---

## 지원 정책

### 현재 지원 버전

| 버전 | 지원 상태 | 종료일 |
|------|-----------|--------|
| 1.0.x | ✅ Active | TBD |
| 0.9.x | ⚠️ Security Only | 2025-12-31 |

### 보안 업데이트

보안 취약점 발견 시:
1. GitHub Issues에 비공개 보고
2. 패치 배포 후 공개
3. CHANGELOG에 기록

---

## 참고 자료

- [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)
- [Semantic Versioning](https://semver.org/lang/ko/)
- [GitHub Releases](https://github.com/your-repo/releases)

---

**마지막 업데이트:** 2025-10-01
**다음 릴리스:** v1.1.0 (예정)
